import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const nomeCliente = formData.get('nomeCliente') as string || '';

    // Extrair texto dos arquivos
    let textosDocumentos = '';
    for (const file of files) {
      try {
        const text = await file.text();
        textosDocumentos += `\n--- Documento: ${file.name} ---\n${text.substring(0, 3000)}\n`;
      } catch {
        // Skip files that can't be read as text
      }
    }

    if (!textosDocumentos) {
      return NextResponse.json({
        teses: [],
        resumo: 'Não foi possível ler os documentos. Selecione as teses manualmente.',
      });
    }

    const prompt = `Você é um advogado trabalhista brasileiro especializado. Analise os documentos abaixo de uma entrevista/caso trabalhista do cliente "${nomeCliente}" e identifique quais teses jurídicas devem ser incluídas na petição inicial.

DOCUMENTOS:
${textosDocumentos}

Responda APENAS em formato JSON válido, sem markdown, sem código, apenas o JSON:
{
  "teses": ["horasExtras", "intervalo", "fgts", "decimoTerceiro", "ferias", "verbasRescisorias", "danoMoral"],
  "resumo": "Breve resumo dos fatos identificados nos documentos",
  "justificativas": {
    "horasExtras": "Motivo pelo qual esta tese se aplica ou não",
    "intervalo": "...",
    "fgts": "...",
    "decimoTerceiro": "...",
    "ferias": "...",
    "verbasRescisorias": "...",
    "danoMoral": "..."
  }
}

REGRAS:
- Em "teses", inclua APENAS as chaves das teses que devem ser selecionadas com base nos fatos dos documentos
- As chaves possíveis são: horasExtras, intervalo, fgts, decimoTerceiro, ferias, verbasRescisorias, danoMoral
- Em "justificativas", explique brevemente por que cada tese se aplica ou não ao caso
- Seja criterioso: só sugira teses que realmente tenham fundamento nos fatos narrados`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text || '{}';
    
    // Tentar parsear o JSON da resposta
    try {
      // Limpar possíveis marcadores de código
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const resultado = JSON.parse(cleanJson);
      return NextResponse.json(resultado);
    } catch {
      // Se não conseguir parsear, retornar vazio
      return NextResponse.json({
        teses: [],
        resumo: 'A IA não conseguiu analisar os documentos. Selecione as teses manualmente.',
        justificativas: {},
      });
    }
  } catch (error: unknown) {
    console.error('Erro ao sugerir teses:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message, teses: [], resumo: '', justificativas: {} }, { status: 500 });
  }
}
