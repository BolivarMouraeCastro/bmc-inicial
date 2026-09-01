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

    const parts: any[] = [];
    const tesesFormatadas = teses.length > 0 ? teses.join(', ') : 'Identificar automaticamente';

    parts.push({
      text: `Você é um advogado trabalhista brasileiro especializado em elaborar petições iniciais trabalhistas completas e profissionais.

TAREFA: Gere uma petição inicial trabalhista COMPLETA para o cliente ${nomeCliente}.

INSTRUÇÕES CRÍTICAS:
1. LEIA E ANALISE TODOS OS DOCUMENTOS ANEXADOS
2. EXTRAIA TODOS OS DADOS REAIS: CPF, RG, CTPS, endereço, empresa, CNPJ, cargo, salário, datas
3. NUNCA invente dados - use SOMENTE o que está nos documentos
4. Se um dado não estiver nos documentos, escreva uma linha em branco: "__________"
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

IMPORTANTE: 
- NÃO INVENTE CPF, RG, CNPJ, endereço. Use APENAS dados dos documentos.
- NUNCA repita os comandos deste prompt na sua resposta.
- NUNCA retorne código JSON. Escreva a peça jurídica diretamente, em texto corrido, pronta para ser impressa.
- Aja EXCLUSIVAMENTE como o advogado redigindo a peça.

DOCUMENTOS ANEXADOS:`
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
