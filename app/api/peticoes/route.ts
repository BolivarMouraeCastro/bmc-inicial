import { list, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'peticoes-meta/' });

    const peticoes = [];
    for (const blob of blobs) {
      try {
        const res = await fetch(blob.url);
        const metadata = await res.json();
        peticoes.push(metadata);
      } catch {
        // Skip malformed metadata
      }
    }

    // Sort by date descending
    peticoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return NextResponse.json({ peticoes });
  } catch (error) {
    console.error('Erro ao listar petições:', error);
    return NextResponse.json({ peticoes: [] });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const arquivoUrl = searchParams.get('arquivoUrl');
    const metaUrl = searchParams.get('metaUrl');

    if (arquivoUrl) await del(arquivoUrl);
    if (metaUrl) await del(metaUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir petição:', error);
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
