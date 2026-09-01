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

    // Os arquivos não são enviados para o servidor, apenas o nome do cliente.

    // 1. Buscar teses/modelos da Base de Conhecimento
    let baseConhecimento = '';
    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      const { blobs } = await list({ prefix: 'base-conhecimento/', token });

      const downloadPromises = blobs.slice(0, 10).map(async (blob) => {
        try {
          const res = await fetch(blob.url, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('text') || blob.pathname.endsWith('.txt')) {
              const text = await res.text();
              return `\n\n=== BASE: ${blob.pathname} ===\n${text.substring(0, 3000)}`;
            }
          }
        } catch {
          return '';
        }
        return '';
      });

      const results = await Promise.all(downloadPromises);
      baseConhecimento = results.join('');
    } catch (err) {
      console.error('Erro ao ler base de conhecimento:', err);
    }

    // Preparar documentos do cliente como conteúdo multimodal
    const parts: any[] = [];

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

    // Nós não lemos os arquivos no servidor para não estourar o limite de 4.5MB
    // Retornamos os parts iniciais (o prompt) para o frontend anexar os arquivos localmente!
    return NextResponse.json({ parts, nomeCliente });

  } catch (error: unknown) {
    console.error('Erro ao sugerir teses:', error);
    const msg = error instanceof Error ? error.message : 'Erro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
