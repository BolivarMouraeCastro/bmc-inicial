import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Part } from '@google/genai';

export const maxDuration = 30;

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

    const parts: Part[] = [];

    parts.push({
      text: `Analise os documentos do cliente "${nomeCliente}" e identifique quais teses jurídicas trabalhistas se aplicam.

Responda APENAS em JSON válido:
{
  "teses": ["horasExtras", "intervalo", "fgts", "decimoTerceiro", "ferias", "verbasRescisorias", "danoMoral"],
  "resumo": "Breve resumo dos fatos"
}

Chaves possíveis: horasExtras, intervalo, fgts, decimoTerceiro, ferias, verbasRescisorias, danoMoral
Inclua APENAS teses com fundamento nos documentos.

Documentos anexados:`
    });

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const name = file.name.toLowerCase();

        parts.push({ text: `\n--- ${file.name} ---` });

        if (name.endsWith('.txt')) {
          const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
          parts.push({ text: text.substring(0, 5000) });
        } else {
          let mimeType = file.type || 'application/octet-stream';
          if (name.endsWith('.pdf')) mimeType = 'application/pdf';
          else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimeType = 'image/jpeg';
          else if (name.endsWith('.png')) mimeType = 'image/png';

          parts.push({
            inlineData: {
              mimeType,
              data: Buffer.from(buffer).toString('base64'),
            }
          });
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
      return NextResponse.json(JSON.parse(cleanJson));
    } catch {
      return NextResponse.json({ teses: [], resumo: 'Não foi possível analisar. Selecione manualmente.' });
    }
  } catch (error: unknown) {
    console.error('Erro ao sugerir teses:', error);
    return NextResponse.json({ teses: [], resumo: 'Erro na análise.' });
  }
}
