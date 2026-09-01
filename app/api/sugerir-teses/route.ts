import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Part } from '@google/genai';
import { list } from '@vercel/blob';
import mammoth from 'mammoth';

export const maxDuration = 45;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ teses: [], resumo: 'API Key não configurada.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const nomeCliente = formData.get('nomeCliente') as string || '';

    if (files.length === 0) {
      return NextResponse.json({ teses: [], resumo: 'Nenhum documento para analisar.' });
    }

    // 1. Buscar teses/modelos da Base de Conhecimento
    let baseConhecimento = '';
    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      const { blobs } = await list({ prefix: 'base-conhecimento/', token });

      for (const blob of blobs.slice(0, 10)) {
        try {
          // Para blobs privados, usar token no header
          const res = await fetch(blob.url, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('text') || blob.pathname.endsWith('.txt')) {
              const text = await res.text();
              baseConhecimento += `\n\n=== BASE: ${blob.pathname} ===\n${text.substring(0, 3000)}`;
            }
          }
        } catch {
          // Skip individual files that fail
        }
      }
    } catch (err) {
      console.error('Erro ao ler base de conhecimento:', err);
    }

    // 2. Preparar documentos do cliente como conteúdo multimodal
    const parts: Part[] = [];

    parts.push({
      text: `Você é um advogado trabalhista brasileiro especializado.

TAREFA: Analise os documentos do cliente "${nomeCliente}" e a Base de Conhecimento do escritório, e identifique quais teses jurídicas trabalhistas se aplicam a este caso.

BASE DE CONHECIMENTO DO ESCRITÓRIO (contém modelos de teses e petições):
${baseConhecimento || 'Nenhum documento na base de conhecimento'}

Com base nos documentos do cliente E nas teses disponíveis na base de conhecimento, identifique:
1. Quais teses se aplicam ao caso
2. Um resumo dos fatos relevantes
3. Justificativa para cada tese sugerida

Responda APENAS em JSON válido, sem markdown:
{
  "teses": [
    {
      "nome": "Nome da tese",
      "justificativa": "Por que esta tese se aplica ao caso com base nos documentos"
    }
  ],
  "resumo": "Resumo dos fatos identificados nos documentos do cliente"
}

Se não houver teses na base de conhecimento, sugira teses trabalhistas comuns que se apliquem.
Analise os documentos do cliente abaixo:`
    });

    // Processar arquivos do cliente
    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const name = file.name.toLowerCase();

        parts.push({ text: `\n--- ${file.name} ---` });

        if (name.endsWith('.txt')) {
          const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
          parts.push({ text: text.substring(0, 5000) });
        } else if (name.endsWith('.docx')) {
          const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
          parts.push({ text: result.value.substring(0, 5000) });
        } else if (name.endsWith('.doc')) {
          const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
          const cleaned = text.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, ' ').replace(/\s{3,}/g, ' ');
          if (cleaned.trim().length > 50) parts.push({ text: cleaned.substring(0, 5000) });
        } else {
          let mimeType = file.type || 'application/octet-stream';
          if (name.endsWith('.pdf')) mimeType = 'application/pdf';
          else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimeType = 'image/jpeg';
          else if (name.endsWith('.png')) mimeType = 'image/png';

          if (['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)) {
            parts.push({
              inlineData: {
                mimeType,
                data: Buffer.from(buffer).toString('base64'),
              }
            });
          }
        }
      } catch {
        // Skip
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
    });

    const responseText = response.text || '{}';

    try {
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const resultado = JSON.parse(cleanJson);
      return NextResponse.json(resultado);
    } catch {
      return NextResponse.json({ teses: [], resumo: 'Não foi possível analisar. Tente novamente.' });
    }
  } catch (error: unknown) {
    console.error('Erro ao sugerir teses:', error);
    const msg = error instanceof Error ? error.message : 'Erro';
    return NextResponse.json({ teses: [], resumo: `Erro: ${msg}` });
  }
}
