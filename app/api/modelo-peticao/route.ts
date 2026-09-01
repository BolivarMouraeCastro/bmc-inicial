import { NextRequest, NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';
import mammoth from 'mammoth';

export const maxDuration = 30;

// GET - Retorna o modelo atual
export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'modelo-peticao/' });
    
    if (blobs.length === 0) {
      return NextResponse.json({ modelo: null });
    }

    // Pegar o mais recente
    const modelo = blobs.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];

    return NextResponse.json({
      modelo: {
        nome: modelo.pathname.replace('modelo-peticao/', ''),
        url: modelo.url,
        pathname: modelo.pathname,
        uploadedAt: modelo.uploadedAt,
        size: modelo.size,
      }
    });
  } catch (error) {
    console.error('Erro ao buscar modelo:', error);
    return NextResponse.json({ modelo: null });
  }
}

// POST - Upload de novo modelo
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith('.doc') && !name.endsWith('.docx') && !name.endsWith('.txt') && !name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Formato não suportado. Use DOC, DOCX, TXT ou PDF.' }, { status: 400 });
    }

    // Remover modelos anteriores
    try {
      const { blobs } = await list({ prefix: 'modelo-peticao/' });
      for (const blob of blobs) {
        await del(blob.url);
      }
    } catch { /* ignore */ }

    // Salvar arquivo original
    const buffer = await file.arrayBuffer();
    await put(`modelo-peticao/${file.name}`, Buffer.from(buffer), {
      access: 'private',
      contentType: file.type || 'application/octet-stream',
    });

    // Extrair texto do modelo para armazenar como referência
    let textoModelo = '';
    if (name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      textoModelo = result.value;
    } else if (name.endsWith('.txt')) {
      textoModelo = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    } else if (name.endsWith('.doc')) {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      textoModelo = text.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n');
    }

    // Salvar texto extraído como referência rápida
    if (textoModelo) {
      await put('modelo-peticao/_texto_extraido.txt', textoModelo, {
        access: 'private',
        contentType: 'text/plain; charset=utf-8',
      });
    }

    return NextResponse.json({
      success: true,
      modelo: {
        nome: file.name,
        tamanho: file.size,
      }
    });
  } catch (error) {
    console.error('Erro ao salvar modelo:', error);
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Erro: ${msg}` }, { status: 500 });
  }
}

// DELETE - Remover modelo
export async function DELETE() {
  try {
    const { blobs } = await list({ prefix: 'modelo-peticao/' });
    for (const blob of blobs) {
      await del(blob.url);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover modelo:', error);
    return NextResponse.json({ error: 'Erro ao remover' }, { status: 500 });
  }
}
