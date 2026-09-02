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
      text: `Você é um advogado trabalhista brasileiro altamente experiente, contratado pelo escritório BM&C Advocacia.

TAREFA: Redigir uma petição inicial trabalhista COMPLETA e PERSONALIZADA para o cliente ${nomeCliente}.

═══════════════════════════════════════════════════════
COMO VOCÊ DEVE TRABALHAR (FLUXO OBRIGATÓRIO):
═══════════════════════════════════════════════════════

PASSO 1 - LEIA OS DOCUMENTOS DO CLIENTE:
Abaixo estão anexados os documentos do cliente (Ficha de Entrevista Trabalhista, Holerites, TRCT, CTPS, etc.). Leia TODOS com atenção máxima. Extraia:
- Nome completo, CPF, RG, CTPS, endereço, estado civil, profissão
- Nome/Razão Social da empresa, CNPJ, endereço
- Datas REAIS de admissão e demissão
- Salário real (do holerite ou TRCT)
- Todos os fatos narrados na entrevista (o que aconteceu, reclamações, abusos, irregularidades)

PASSO 2 - LEIA O MODELO PADRÃO DO ESCRITÓRIO:
${templateModelo ? `O escritório forneceu um MODELO PADRÃO DE PETIÇÃO que contém TODAS AS TESES POSSÍVEIS que o escritório costuma usar. Este modelo é como um "cardápio completo" de teses.\n\n=== MODELO PADRÃO (CARDÁPIO DE TESES) ===\n${templateModelo}\n=== FIM DO MODELO ===` : 'Nenhum modelo padrão foi fornecido. Use a estrutura trabalhista brasileira clássica.'}

PASSO 3 - SELECIONE AS TESES APLICÁVEIS:
Compare os FATOS da entrevista do cliente com as TESES disponíveis no Modelo Padrão. Selecione APENAS as teses que se encaixam no caso deste cliente específico. Exemplos:
- Se o cliente relata que não recebia horas extras → inclua a tese de horas extras do modelo
- Se o cliente relata assédio moral → inclua a tese de dano moral do modelo
- Se o cliente foi demitido por justa causa indevida → inclua a tese de reversão de justa causa
- Se uma tese do modelo NÃO tem relação com os fatos do cliente → NÃO inclua essa tese
${teses.length > 0 ? `\nTeses pré-selecionadas pelo sistema (considere incluí-las): ${teses.join(', ')}` : ''}

PASSO 4 - GERE A PETIÇÃO ADAPTADA:
Escreva a petição seguindo a MESMA ESTRUTURA, CABEÇALHO, FORMATAÇÃO e ESTILO DE ESCRITA do Modelo Padrão, mas:
- QUALIFICAÇÃO: Use os dados REAIS do cliente (extraídos dos documentos, NUNCA do modelo)
- DOS FATOS: Narre a história REAL do cliente baseada na entrevista (NUNCA copie os fatos do modelo)
- DO DIREITO: Use APENAS as teses selecionadas no Passo 3, com a mesma argumentação jurídica e estilo do modelo
- DOS PEDIDOS: Liste apenas os pedidos correspondentes às teses selecionadas, com VALORES calculados com base no salário REAL do cliente
- VALOR DA CAUSA: Calcule com base nos pedidos reais deste cliente

${baseConhecimento ? `\nBASE DE CONHECIMENTO ADICIONAL DO ESCRITÓRIO (use para complementar a argumentação jurídica):\n${baseConhecimento}\n` : ''}

═══════════════════════════════════════════════════════
REGRAS ABSOLUTAS:
═══════════════════════════════════════════════════════
1. NUNCA copie nomes, CPFs, CNPJs, datas ou valores que estejam no Modelo Padrão. Esses dados são de OUTRO cliente.
2. TODOS os dados factuais (datas de admissão/demissão, salário, endereço) devem vir EXCLUSIVAMENTE dos documentos anexados do cliente.
3. Se um dado essencial não estiver nos documentos, use "__________" (lacuna).
4. Adapte os valores dos pedidos ao salário REAL encontrado nos documentos deste cliente.
5. NÃO inclua teses que não tenham relação com os fatos narrados na entrevista.
6. NUNCA retorne JSON, código, ou comandos. Entregue APENAS a petição pronta, em texto corrido, pronta para impressão.

DOCUMENTOS DO CLIENTE ${nomeCliente} (LEIA TUDO ABAIXO):`
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
