import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Part } from '@google/genai';
import mammoth from 'mammoth';

export const maxDuration = 60;

// Tipos suportados pelo Gemini como inlineData
const GEMINI_SUPPORTED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada.' }, { status: 500 });
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

    // Fetch the template from blob if it exists
    let templateModelo = '';
    try {
      const { list } = require('@vercel/blob');
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      const { blobs } = await list({ prefix: 'modelo-peticao/', token });
      
      const txtBlob = blobs.find((b: any) => b.pathname.endsWith('_texto_extraido.txt'));
      if (txtBlob) {
        const res = await fetch(txtBlob.url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (res.ok) {
          templateModelo = await res.text();
        }
      }
    } catch (e) {
      console.log('Nenhum modelo padrao encontrado', e);
    }

    const parts: Part[] = [];
    const tesesFormatadas = teses.length > 0 ? teses.join(', ') : 'Identificar automaticamente';

    parts.push({
      text: `Você é um advogado trabalhista brasileiro especializado em elaborar petições iniciais trabalhistas completas e profissionais.

TAREFA: Gere uma petição inicial trabalhista COMPLETA para o cliente ${nomeCliente}.

INSTRUÇÕES CRÍTICAS:
1. LEIA E ANALISE TODOS OS DOCUMENTOS ANEXADOS
2. EXTRAIA TODOS OS DADOS REAIS: CPF, RG, CTPS, endereço, empresa, CNPJ, cargo, salário, datas
3. NUNCA invente dados - use SOMENTE o que está nos documentos
4. Se um dado não estiver nos documentos, escreva "[dado não localizado]"
5. A entrevista trabalhista contém os FATOS - use integralmente
6. A Procuração contém a qualificação do Reclamante
7. A CTPS contém dados do contrato de trabalho
8. SE HOUVER UM MODELO PADRÃO ABAIXO, siga estritamente o ESTILO, CABEÇALHO e ESTRUTURA de formatação dele.

TESES: ${tesesFormatadas}

${templateModelo ? `=== MODELO PADRÃO DO ESCRITÓRIO PARA SEGUIR ESTILO/FORMATAÇÃO ===\n${templateModelo}\n======================================================\n` : ''}

ESTRUTURA BÁSICA (Siga a estrutura do modelo padrão acima se houver, ou use esta):
1. Endereçamento ao Juízo
2. Qualificação COMPLETA do Reclamante (EXTRAIR dos documentos)
3. Qualificação COMPLETA da(s) Reclamada(s) (EXTRAIR dos documentos)
4. DOS FATOS (baseado na entrevista)
5. DO DIREITO (CLT, Súmulas TST)
6. DOS PEDIDOS (numerados)
7. DO VALOR DA CAUSA
8. Requerimentos finais
9. Local, data e assinatura

IMPORTANTE: NÃO INVENTE CPF, RG, CNPJ, endereço. Use APENAS dados dos documentos.

DOCUMENTOS ANEXADOS:`
    });

    // Processar cada arquivo
    const fileNames: string[] = [];
    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const name = file.name.toLowerCase();

        // Determinar MIME type real
        let mimeType = file.type || '';
        if (name.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (name.endsWith('.png')) mimeType = 'image/png';
        else if (name.endsWith('.gif')) mimeType = 'image/gif';
        else if (name.endsWith('.webp')) mimeType = 'image/webp';

        parts.push({ text: `\n\n--- DOCUMENTO: ${file.name} ---` });

        if (name.endsWith('.txt')) {
          // Arquivo texto: enviar como texto direto
          const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
          parts.push({ text: text.substring(0, 10000) });

        } else if (name.endsWith('.docx')) {
          // DOCX: converter para texto com mammoth
          const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
          parts.push({ text: result.value.substring(0, 10000) });

        } else if (name.endsWith('.doc')) {
          // DOC antigo: tentar extrair texto legível
          const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
          const cleaned = text.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, ' ').replace(/\s{3,}/g, ' ');
          if (cleaned.trim().length > 50) {
            parts.push({ text: cleaned.substring(0, 10000) });
          } else {
            parts.push({ text: '[Arquivo .doc não pôde ser lido como texto]' });
          }

        } else if (GEMINI_SUPPORTED_MIME.includes(mimeType)) {
          // PDF e imagens: enviar como conteúdo multimodal
          // Limitar a 1.5MB por arquivo para evitar timeout e limite de 4.5MB do Vercel
          if (buffer.byteLength > 1.5 * 1024 * 1024) {
            parts.push({ text: `[${file.name}: arquivo muito grande (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB). Limite é 1.5MB - pulado]` });
          } else {
            const base64 = Buffer.from(buffer).toString('base64');
            parts.push({
              inlineData: { mimeType, data: base64 }
            });
          }

        } else {
          // Outro formato: tentar como texto
          const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
          const printable = text.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, '').length / text.length;
          if (printable > 0.5 && text.length > 20) {
            parts.push({ text: text.substring(0, 10000) });
          } else {
            parts.push({ text: `[Arquivo ${file.name} - formato não suportado para leitura]` });
          }
        }

        fileNames.push(file.name);
      } catch (err) {
        console.error(`Erro ao processar ${file.name}:`, err);
        parts.push({ text: `[Erro ao ler ${file.name}]` });
      }
    }

    console.log(`Gerando petição: ${nomeCliente}, ${fileNames.length} docs: ${fileNames.join(', ')}`);

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              fullText += chunk.text;
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          
          // Salvar petição gerada no Blob (fundo, não bloqueia o usuário)
          try {
            const nomeArquivo = `${nomeCliente.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.txt`;
            await put(`peticoes/${nomeArquivo}`, fullText, {
              access: 'private',
              contentType: 'text/plain; charset=utf-8',
            });
            await put(`peticoes-meta/${nomeArquivo}.json`, JSON.stringify({
              id: Date.now().toString(),
              cliente: nomeCliente,
              data: new Date().toISOString(),
              url: '' // Will need a read token to download later
            }), {
              access: 'private',
              contentType: 'application/json',
            });
          } catch (saveError) {
            console.error('Erro ao salvar petição no blob:', saveError);
          }

        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode('\n\n[ERRO NA GERAÇÃO - Tente novamente]'));
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    console.error('Erro ao gerar petição:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Erro: ${message}` }, { status: 500 });
  }
}
