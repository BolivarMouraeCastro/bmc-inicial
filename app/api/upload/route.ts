import { put, list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN não configurado' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const categoria = formData.get('categoria') as string || 'Modelo';

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const blob = await put(`base-conhecimento/${categoria}/${file.name}`, file, {
      access: 'private',
      addRandomSuffix: true,
      token,
    });

    return NextResponse.json({
      success: true,
      documento: {
        url: blob.url,
        pathname: blob.pathname,
        nome: file.name,
        tamanho: file.size,
        tipo: file.type,
        categoria,
        criadoEm: new Date().toISOString(),
      }
    });
  } catch (error: unknown) {
    console.error('Erro no upload:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: `Erro no upload: ${message}` }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'base-conhecimento/' });

    const documentos = blobs.map(blob => {
      const parts = blob.pathname.split('/');
      const categoria = parts[1] || 'Modelo';
      const nomeArquivo = parts.slice(2).join('/');

      return {
        url: blob.url,
        pathname: blob.pathname,
        nome: nomeArquivo,
        tamanho: blob.size,
        categoria,
        criadoEm: blob.uploadedAt,
      };
    });

    return NextResponse.json({ documentos });
  } catch (error) {
    console.error('Erro ao listar:', error);
    return NextResponse.json({ documentos: [] });
  }
}
