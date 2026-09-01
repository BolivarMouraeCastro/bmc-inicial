import { put, list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Part } from '@google/genai';

export const runtime = 'edge';

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

    // Buscar Base de Conhecimento para embasar a petição (limitar a 10 arquivos pra não estourar contexto excessivamente)
    let baseConhecimento = '';
    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      const { blobs } = await list({ prefix: 'base-conhecimento/', token });

      // Ordenar por data de upload mais recente
      const sortedBlobs = blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

      const downloadPromises = sortedBlobs.slice(0, 10).map(async (blob) => {
        try {
          const res = await fetch(blob.url, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('text') || blob.pathname.endsWith('.txt')) {
              const text = await res.text();
              return `\n\n=== BASE DE CONHECIMENTO: ${blob.pathname} ===\n${text.substring(0, 3000)}`;
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

    const parts: any[] = [];
    const tesesFormatadas = teses.length > 0 ? teses.join(', ') : 'Identificar automaticamente';

    parts.push({
      text: `Você é um advogado trabalhista brasileiro especializado em elaborar petições iniciais.

TAREFA: Redigir uma petição inicial trabalhista COMPLETA para o cliente ${nomeCliente}.

INSTRUÇÕES CRÍTICAS SOBRE O MODELO:
${templateModelo ? `O ESCRITÓRIO FORNECEU UM MODELO PADRÃO (abaixo). Você DEVE manter ESTRITAMENTE a mesma estrutura, cabeçalho, formatação, e estilo de escrita. NÃO INVENTE uma estrutura nova.\n\n=== MODELO PADRÃO DO ESCRITÓRIO ===\n${templateModelo}\n======================================================\n\nO QUE VOCÊ DEVE ALTERAR NO MODELO:\n- Qualificação: Preencha com os dados reais extraídos dos documentos (CPF, RG, CTPS, endereços).\n- Dos Fatos: Escreva a narrativa com base na Entrevista Trabalhista do cliente.\n- Do Direito (Teses): Substitua as teses do modelo pelas teses deste caso (${tesesFormatadas}).\n- Dos Pedidos: Altere os pedidos e os VALORES para se adequarem exatamente à rescisão e salários deste cliente específico.` : `Não há modelo padrão. Siga a estrutura trabalhista brasileira clássica (Endereçamento, Qualificação, Fatos, Direito, Pedidos, Valor da Causa, Assinatura).`}

INSTRUÇÕES SOBRE AS TESES E BASE DE CONHECIMENTO:
As teses identificadas para este caso são: ${tesesFormatadas}
Utilize a Base de Conhecimento do escritório (fornecida abaixo) para redigir o tópico "Do Direito". Adote a mesma argumentação e jurisprudência fornecidas pela Base de Conhecimento.
${baseConhecimento ? `\nDOCUMENTOS DA BASE DE CONHECIMENTO:\n${baseConhecimento}\n` : '\n(Nenhuma base de conhecimento adicional)\n'}

REGRAS GERAIS:
1. LEIA E ANALISE TODOS OS DOCUMENTOS ANEXADOS (Entrevista, Holerites, TRCT, etc.).
2. NUNCA invente dados. Se faltar CPF, RG, ou endereço, use a lacuna "__________".
3. A entrevista contém os FATOS - use-a integralmente para contar a história.
4. Faça o cálculo/estimativa dos valores nos pedidos com base nos salários encontrados nos holerites/TRCT anexados, adequando cada caso.
5. NUNCA retorne código JSON e NUNCA repita os comandos deste prompt. Entregue apenas a peça jurídica pronta.

DOCUMENTOS DO CLIENTE ANEXADOS:`
    });

    // Nenhuma leitura de arquivo de 'files' aqui para não bater no limite de 4.5MB!
    // Retornamos apenas a estrutura do prompt. O frontend vai anexar os arquivos localmente.
    
    return NextResponse.json({ parts, nomeCliente });
  } catch (error: unknown) {
    console.error('Erro ao preparar petição:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
