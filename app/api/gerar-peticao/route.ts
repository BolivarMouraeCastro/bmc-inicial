import { list } from '@vercel/blob';
import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { gerarPeticao } from '../../../lib/gemini';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const dados = await request.json();

    if (!dados.nomeCliente || !dados.cpf) {
      return NextResponse.json(
        { error: 'Nome do cliente e CPF são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar documentos da base de conhecimento para referência
    let textosBase: string[] = [];
    try {
      const { blobs } = await list({ prefix: 'base-conhecimento/' });
      // Pegar até 5 documentos mais recentes como referência (limitando contexto)
      const recentBlobs = blobs
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .slice(0, 5);
      
      for (const blob of recentBlobs) {
        try {
          const res = await fetch(blob.url);
          const text = await res.text();
          // Limitar cada texto a 2000 chars para não estourar contexto
          textosBase.push(text.substring(0, 2000));
        } catch {
          // Skip files that can't be read as text
        }
      }
    } catch {
      // Continue without base knowledge if listing fails
    }

    // Gerar petição com Gemini AI
    const peticaoTexto = await gerarPeticao({
      ...dados,
      textosBase,
    });

    // Salvar petição no Vercel Blob
    const nomeArquivo = `${dados.nomeCliente.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.txt`;
    const blob = await put(`peticoes/${nomeArquivo}`, peticaoTexto, {
      access: 'public',
      contentType: 'text/plain; charset=utf-8',
    });

    // Salvar metadata como JSON separado
    const metadata = {
      id: Date.now().toString(),
      cliente: dados.nomeCliente,
      empresa: dados.empresas?.[0]?.razaoSocial || 'N/I',
      tipo: `Reclamatória Trabalhista - ${dados.teses?.join(', ') || 'Geral'}`,
      data: new Date().toISOString(),
      status: 'Concluída',
      arquivoUrl: blob.url,
      arquivoPathname: blob.pathname,
    };

    await put(`peticoes-meta/${nomeArquivo}.json`, JSON.stringify(metadata), {
      access: 'public',
      contentType: 'application/json',
    });

    return NextResponse.json({
      success: true,
      peticao: peticaoTexto,
      metadata,
    });
  } catch (error: unknown) {
    console.error('Erro ao gerar petição:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: 'Erro ao gerar petição: ' + message },
      { status: 500 }
    );
  }
}
