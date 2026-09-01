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
      text: `Você é um advogado trabalhista brasileiro altamente experiente.

TAREFA: Redigir uma petição inicial trabalhista COMPLETA para o cliente ${nomeCliente}.

INSTRUÇÕES CRÍTICAS SOBRE O MODELO:
${templateModelo ? `O ESCRITÓRIO FORNECEU UM MODELO PADRÃO (abaixo). Você DEVE usar este modelo APENAS como base para a ESTRUTURA, CABEÇALHO, FORMATAÇÃO e ESTILO DE ESCRITA.\n\n=== MODELO PADRÃO DO ESCRITÓRIO ===\n${templateModelo}\n======================================================\n\nATENÇÃO - REGRA ABSOLUTA DE DADOS:\nVocê é PROIBIDO de copiar nomes, datas (admissão/demissão), valores de salário, CNPJs ou fatos específicos que estejam escritos no "Modelo Padrão". O modelo contém dados de OUTROS clientes. Você DEVE OBRIGATORIAMENTE substituir todos esses dados pelos dados REAIS do cliente atual, extraídos dos documentos enviados.\n\nO QUE VOCÊ DEVE ALTERAR NO MODELO:\n1. Qualificação: Preencha com os dados reais extraídos dos documentos (CPF, RG, CTPS, endereços, CNPJ da empresa).\n2. Do Contrato de Trabalho / Fatos: Escreva a narrativa com base ÚNICA e EXCLUSIVAMENTE na Entrevista Trabalhista do cliente e nos documentos (CTPS, Holerites). PRESTE MUITA ATENÇÃO ÀS DATAS DE ADMISSÃO E DEMISSÃO DO CLIENTE.\n3. Do Direito (Teses): Substitua as teses do modelo pelas teses deste caso: ${tesesFormatadas}.\n4. Dos Pedidos: Altere os pedidos, ajustando todos os VALORES para a realidade financeira e os salários deste cliente específico.` : `Não há modelo padrão. Siga a estrutura trabalhista brasileira clássica (Endereçamento, Qualificação, Fatos, Direito, Pedidos, Valor da Causa, Assinatura).`}

INSTRUÇÕES SOBRE AS TESES E BASE DE CONHECIMENTO:
As teses identificadas para este caso são: ${tesesFormatadas}
Utilize a Base de Conhecimento do escritório (fornecida abaixo) para embasar as teses (Do Direito). Novamente, copie APENAS a argumentação jurídica e a jurisprudência. NÃO copie fatos de clientes antigos que estejam na Base de Conhecimento.
${baseConhecimento ? `\nDOCUMENTOS DA BASE DE CONHECIMENTO:\n${baseConhecimento}\n` : '\n(Nenhuma base de conhecimento adicional)\n'}

REGRAS GERAIS E ABSOLUTAS:
1. LEIA E ANALISE MINUCIOSAMENTE A ENTREVISTA E OS DOCUMENTOS ANEXADOS.
2. NUNCA INVENTE DADOS e NUNCA COPIE DADOS DE OUTROS CLIENTES DOS MODELOS.
3. Se a Entrevista diz que a admissão foi "10/11/2023", você DEVE escrever "10/11/2023" na petição, e não a data que estava no modelo.
4. Se faltar algum dado essencial (ex: endereço, CNPJ) nos documentos, coloque uma linha em branco: "__________".
5. NUNCA retorne código JSON e NUNCA repita os comandos deste prompt. Entregue apenas a peça jurídica pronta.

DOCUMENTOS DO CLIENTE (USE ESTES DADOS!):`
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
