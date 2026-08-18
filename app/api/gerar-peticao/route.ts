import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Part } from '@google/genai';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não configurada.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const formData = await request.formData();
    const nomeCliente = formData.get('nomeCliente') as string || '';
    const tesesJson = formData.get('teses') as string || '[]';
    let teses: string[] = [];
    try { teses = JSON.parse(tesesJson); } catch { teses = []; }
    const files = formData.getAll('files') as File[];

    if (!nomeCliente) {
      return NextResponse.json({ error: 'Nome do cliente é obrigatório' }, { status: 400 });
    }

    // Preparar os documentos como conteúdo multimodal para o Gemini
    const parts: Part[] = [];

    // Prompt como primeira parte
    const tesesFormatadas = teses.length > 0 ? teses.join(', ') : 'Identificar automaticamente com base nos documentos';

    parts.push({
      text: `Você é um advogado trabalhista brasileiro especializado em elaborar petições iniciais trabalhistas completas e profissionais.

TAREFA: Gere uma petição inicial trabalhista COMPLETA para o cliente ${nomeCliente}.

INSTRUÇÕES CRÍTICAS:
1. LEIA E ANALISE TODOS OS DOCUMENTOS ANEXADOS (PDFs, imagens, textos)
2. EXTRAIA TODOS OS DADOS REAIS dos documentos: CPF, RG, CTPS, endereço, empresa, CNPJ, cargo, salário, datas de admissão e demissão
3. NUNCA invente dados - use SOMENTE o que está nos documentos
4. Se um dado não estiver em nenhum documento, escreva "[dado não localizado nos documentos]"
5. A entrevista trabalhista contém os FATOS do caso - use integralmente na narrativa
6. A Procuração contém a qualificação do Reclamante - use os dados dela
7. A CTPS contém dados do contrato de trabalho - use todos
8. A petição deve estar PRONTA PARA USO com dados REAIS

TESES: ${tesesFormatadas}

Os documentos do cliente estão anexados abaixo (PDFs, imagens, textos). LEIA CADA UM COM ATENÇÃO e extraia todas as informações.

ESTRUTURA OBRIGATÓRIA:
1. Endereçamento ao Juízo
2. Qualificação COMPLETA do Reclamante (nome, CPF, RG, CTPS, endereço - EXTRAIR dos documentos)
3. Qualificação COMPLETA da(s) Reclamada(s) (razão social, CNPJ, endereço - EXTRAIR dos documentos)
4. DOS FATOS (narrativa detalhada baseada na entrevista trabalhista)
5. DO DIREITO (fundamentação jurídica com artigos da CLT e Súmulas do TST)
6. DOS PEDIDOS (numerados)
7. DO VALOR DA CAUSA
8. Requerimentos finais
9. Local, data e assinatura

IMPORTANTE: NÃO INVENTE nenhum CPF, RG, CNPJ, endereço ou dado. Use APENAS o que está nos documentos.`
    });

    // Adicionar cada documento como parte multimodal
    let fileNames: string[] = [];
    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');

        // Determinar MIME type
        let mimeType = file.type || 'application/octet-stream';
        const name = file.name.toLowerCase();
        if (name.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (name.endsWith('.png')) mimeType = 'image/png';
        else if (name.endsWith('.txt')) mimeType = 'text/plain';
        else if (name.endsWith('.doc')) mimeType = 'application/msword';
        else if (name.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        // Adicionar label do arquivo
        parts.push({ text: `\n--- DOCUMENTO: ${file.name} ---` });

        // Para arquivos de texto simples, enviar como texto
        if (mimeType === 'text/plain' || name.endsWith('.txt')) {
          const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
          parts.push({ text: text.substring(0, 10000) });
        } else {
          // Para PDFs e imagens, enviar como dados inline (Gemini lê nativamente)
          parts.push({
            inlineData: {
              mimeType,
              data: base64,
            }
          });
        }

        fileNames.push(file.name);
      } catch (fileError) {
        console.error(`Erro ao processar arquivo ${file.name}:`, fileError);
      }
    }

    console.log(`Gerando petição para ${nomeCliente} com ${fileNames.length} documentos: ${fileNames.join(', ')}`);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts,
        }
      ],
    });

    const peticaoTexto = response.text || '';

    if (!peticaoTexto) {
      return NextResponse.json({ error: 'A IA não retornou texto. Tente novamente.' }, { status: 500 });
    }

    // Salvar no Vercel Blob
    try {
      const nomeArquivo = `${nomeCliente.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.txt`;
      const blob = await put(`peticoes/${nomeArquivo}`, peticaoTexto, {
        access: 'private',
        contentType: 'text/plain; charset=utf-8',
      });

      await put(`peticoes-meta/${nomeArquivo}.json`, JSON.stringify({
        id: Date.now().toString(),
        cliente: nomeCliente,
        tipo: 'Reclamatória Trabalhista',
        data: new Date().toISOString(),
        status: 'Concluída',
        arquivoUrl: blob.url,
        arquivoPathname: blob.pathname,
        documentos: fileNames,
      }), {
        access: 'private',
        contentType: 'application/json',
      });
    } catch (saveError) {
      console.error('Erro ao salvar (petição gerada OK):', saveError);
    }

    return NextResponse.json({ success: true, peticao: peticaoTexto });
  } catch (error: unknown) {
    console.error('Erro ao gerar petição:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Erro: ${message}` }, { status: 500 });
  }
}
