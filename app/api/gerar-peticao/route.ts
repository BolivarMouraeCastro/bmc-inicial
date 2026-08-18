import { list } from '@vercel/blob';
import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const nomeCliente = formData.get('nomeCliente') as string || '';
    const tesesJson = formData.get('teses') as string || '[]';
    const teses: string[] = JSON.parse(tesesJson);
    const files = formData.getAll('files') as File[];

    if (!nomeCliente) {
      return NextResponse.json(
        { error: 'Nome do cliente é obrigatório' },
        { status: 400 }
      );
    }

    // Ler conteúdo dos documentos anexados pelo usuário
    let documentosCliente = '';
    for (const file of files) {
      try {
        const text = await file.text();
        documentosCliente += `\n\n=== DOCUMENTO: ${file.name} ===\n${text.substring(0, 5000)}`;
      } catch {
        // Skip binary files
      }
    }

    // Buscar modelos da base de conhecimento
    let modelosBase = '';
    try {
      const { blobs } = await list({ prefix: 'base-conhecimento/' });
      const recentBlobs = blobs
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .slice(0, 5);

      for (const blob of recentBlobs) {
        try {
          const res = await fetch(blob.url);
          const text = await res.text();
          modelosBase += `\n\n=== MODELO/REFERÊNCIA: ${blob.pathname} ===\n${text.substring(0, 5000)}`;
        } catch {
          // Skip
        }
      }
    } catch {
      // Continue without base knowledge
    }

    const tesesFormatadas = teses.length > 0 ? teses.join(', ') : 'A identificar com base nos documentos';

    const prompt = `Você é um advogado trabalhista brasileiro especializado em elaborar petições iniciais trabalhistas completas e profissionais.

TAREFA: Gere uma petição inicial trabalhista COMPLETA para o cliente ${nomeCliente}.

INSTRUÇÕES CRÍTICAS:
1. EXTRAIA TODOS OS DADOS dos documentos anexados abaixo (CTPS, RG, Procuração, Entrevista, etc.)
2. Use TODOS os dados encontrados nos documentos: CPF, RG, CTPS, endereço, empresa, cargo, salário, datas de admissão/demissão, etc.
3. NÃO use "[NÃO INFORMADO]" se a informação estiver nos documentos - procure atentamente em cada documento
4. A entrevista trabalhista contém os FATOS do caso - use-os integralmente na seção "Dos Fatos"
5. Se houver modelos na base de conhecimento, use-os como REFERÊNCIA de estilo e estrutura
6. A petição deve estar PRONTA PARA USO, sem campos a preencher

TESES SELECIONADAS: ${tesesFormatadas}

DOCUMENTOS DO CLIENTE (CTPS, RG, Procuração, Entrevista, etc.):
${documentosCliente || 'Nenhum documento anexado'}

MODELOS E REFERÊNCIAS DA BASE DE CONHECIMENTO:
${modelosBase || 'Nenhum modelo disponível'}

ESTRUTURA OBRIGATÓRIA DA PETIÇÃO:
1. Endereçamento ao Juízo (Vara do Trabalho)
2. Qualificação COMPLETA do Reclamante (nome, CPF, RG, CTPS, endereço - extrair dos documentos)
3. Qualificação COMPLETA da(s) Reclamada(s) (razão social, CNPJ, endereço - extrair dos documentos)
4. DOS FATOS (narrativa detalhada baseada na entrevista trabalhista)
5. DO DIREITO (fundamentação jurídica para CADA tese, com artigos da CLT, Súmulas do TST)
6. DOS PEDIDOS (cada pedido numerado, com valores quando possível)
7. DO VALOR DA CAUSA
8. Requerimentos finais (citação, notificação, justiça gratuita, etc.)
9. Local, data e assinatura

IMPORTANTE:
- Use linguagem jurídica formal brasileira
- Cite artigos da CLT, Súmulas do TST e jurisprudência relevante
- Elabore fundamentação detalhada para cada tese
- A narrativa dos fatos deve ser fiel à entrevista trabalhista
- Se o modelo da base de conhecimento tiver uma estrutura específica, siga-a`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const peticaoTexto = response.text || 'Erro ao gerar petição';

    // Salvar no Vercel Blob
    const nomeArquivo = `${nomeCliente.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.txt`;
    const blob = await put(`peticoes/${nomeArquivo}`, peticaoTexto, {
      access: 'private',
      contentType: 'text/plain; charset=utf-8',
    });

    const metadata = {
      id: Date.now().toString(),
      cliente: nomeCliente,
      empresa: 'Extraído dos documentos',
      tipo: `Reclamatória Trabalhista - ${teses.join(', ') || 'Geral'}`,
      data: new Date().toISOString(),
      status: 'Concluída',
      arquivoUrl: blob.url,
      arquivoPathname: blob.pathname,
    };

    await put(`peticoes-meta/${nomeArquivo}.json`, JSON.stringify(metadata), {
      access: 'private',
      contentType: 'application/json',
    });

    return NextResponse.json({
      success: true,
      peticao: peticaoTexto,
      metadata,
    });
  } catch (error: unknown) {
    console.error('Erro ao gerar petição:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: 'Erro ao gerar petição: ' + message },
      { status: 500 }
    );
  }
}
