import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Validar API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não configurada. Vá em Configurações para instruções.' },
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

    // Ler conteúdo dos documentos (apenas arquivos de texto)
    let documentosCliente = '';
    for (const file of files) {
      try {
        // Apenas arquivos de texto (txt, doc, docx podem ter texto extraível)
        if (file.size > 5 * 1024 * 1024) continue; // Skip > 5MB
        
        const buffer = await file.arrayBuffer();
        const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
        
        // Verificar se o conteúdo tem texto legível (não é binário puro)
        const printableRatio = text.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, '').length / text.length;
        if (printableRatio > 0.3 && text.length > 10) {
          documentosCliente += `\n\n=== DOCUMENTO: ${file.name} ===\n${text.substring(0, 8000)}`;
        } else {
          documentosCliente += `\n\n=== DOCUMENTO: ${file.name} (arquivo binário - ${(file.size / 1024).toFixed(0)}KB, tipo: ${file.type || 'desconhecido'}) ===`;
        }
      } catch {
        documentosCliente += `\n\n=== DOCUMENTO: ${file.name} (não foi possível ler) ===`;
      }
    }

    const tesesFormatadas = teses.length > 0 ? teses.join(', ') : 'Identificar automaticamente com base nos documentos';

    const prompt = `Você é um advogado trabalhista brasileiro especializado em elaborar petições iniciais trabalhistas completas e profissionais.

TAREFA: Gere uma petição inicial trabalhista COMPLETA para o cliente ${nomeCliente}.

INSTRUÇÕES CRÍTICAS:
1. EXTRAIA TODOS OS DADOS dos documentos abaixo (CTPS, RG, Procuração, Entrevista, etc.)
2. Use TODOS os dados encontrados: CPF, RG, CTPS, endereço, empresa, cargo, salário, datas
3. NÃO use "[NÃO INFORMADO]" se a informação estiver nos documentos
4. A entrevista trabalhista contém os FATOS - use integralmente
5. A petição deve estar PRONTA PARA USO

TESES: ${tesesFormatadas}

DOCUMENTOS DO CLIENTE:
${documentosCliente || 'Nenhum documento anexado - gerar petição modelo'}

ESTRUTURA:
1. Endereçamento ao Juízo
2. Qualificação COMPLETA do Reclamante (extrair dos documentos)
3. Qualificação COMPLETA da(s) Reclamada(s) (extrair dos documentos)
4. DOS FATOS (baseado na entrevista)
5. DO DIREITO (fundamentação com CLT, Súmulas TST)
6. DOS PEDIDOS (numerados)
7. DO VALOR DA CAUSA
8. Requerimentos finais
9. Local, data e assinatura`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
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

      const metadata = {
        id: Date.now().toString(),
        cliente: nomeCliente,
        empresa: 'Extraído dos documentos',
        tipo: `Reclamatória Trabalhista`,
        data: new Date().toISOString(),
        status: 'Concluída',
        arquivoUrl: blob.url,
        arquivoPathname: blob.pathname,
      };

      await put(`peticoes-meta/${nomeArquivo}.json`, JSON.stringify(metadata), {
        access: 'private',
        contentType: 'application/json',
      });
    } catch (saveError) {
      console.error('Erro ao salvar petição (geração OK):', saveError);
      // Retornar a petição mesmo se falhar ao salvar
    }

    return NextResponse.json({
      success: true,
      peticao: peticaoTexto,
    });
  } catch (error: unknown) {
    console.error('Erro ao gerar petição:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: `Erro ao gerar petição: ${message}` },
      { status: 500 }
    );
  }
}
