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
⚠️ REGRA #1 - A ENTREVISTA É O CARRO-CHEFE ⚠️
═══════════════════════════════════════════════════════

A Ficha de Entrevista Trabalhista do cliente é o documento MAIS IMPORTANTE de todos. Ela define:
- Quais FATOS devem constar na petição (TODOS, sem exceção)
- Quais PEDIDOS devem ser feitos (somente os que decorrem dos fatos da entrevista)
- Quais TESES jurídicas se aplicam ao caso

REGRA DE OURO: 
→ Se um fato está na entrevista, OBRIGATORIAMENTE deve aparecer na petição.
→ Se um fato NÃO está na entrevista, NÃO deve aparecer na petição.
→ Se a entrevista relata xingamentos, assédio, humilhações, você DEVE citar as PALAVRAS EXATAS que foram usadas, entre aspas, na seção DOS FATOS.

EXEMPLO PRÁTICO: Se a entrevista diz que uma colega chamou a reclamante de "puta", "galinha", "filha da puta", "arrombada", "vagabunda", você DEVE escrever na petição exatamente isso: 'A Reclamante foi alvo de graves ofensas proferidas pela funcionária [nome], que a chamou de "puta", "galinha", "filha da puta", "arrombada" e "vagabunda"...' Não suavize e não omita.

═══════════════════════════════════════════════════════
FLUXO OBRIGATÓRIO:
═══════════════════════════════════════════════════════

PASSO 1 - LEIA A ENTREVISTA COM LUPA:
Leia a Ficha de Entrevista palavra por palavra. Para CADA resposta do cliente, anote:
- Dados pessoais e da empresa (nome, CPF, CNPJ, datas, salário, cargo)
- CADA incidente narrado (quem fez o quê, quando, onde, quais palavras foram ditas)
- Nomes de pessoas envolvidas (colegas, gerentes, supervisores)
- Tipo de rescisão e motivo
- Irregularidades (falta de registro, horas extras não pagas, assédio, etc.)

PASSO 2 - CONSULTE OS DOCUMENTOS COMPLEMENTARES:
Holerites, TRCT, CTPS confirmam e complementam dados da entrevista (salário exato, datas, cargo).

PASSO 3 - CONSULTE O MODELO PADRÃO:
${templateModelo ? `O escritório forneceu um MODELO PADRÃO que é um "cardápio" com TODAS as teses possíveis.\n\n=== MODELO PADRÃO (CARDÁPIO DE TESES) ===\n${templateModelo}\n=== FIM DO MODELO ===\n\nUse o modelo para:\n- Copiar a ESTRUTURA, CABEÇALHO e ESTILO DE ESCRITA\n- Buscar a ARGUMENTAÇÃO JURÍDICA (artigos, súmulas, jurisprudência) das teses aplicáveis\n- MAS: Inclua APENAS as teses cujos fatos correspondentes existam na entrevista` : 'Nenhum modelo padrão. Use a estrutura trabalhista brasileira clássica.'}

PASSO 4 - GERE A PETIÇÃO:
- QUALIFICAÇÃO: Dados REAIS dos documentos do cliente
- DOS FATOS: Narre CADA fato da entrevista com TODOS os detalhes (nomes, datas, xingamentos exatos, situações). NÃO OMITA NADA. Esta seção deve ser longa e detalhada.
- DO DIREITO: Para cada fato da entrevista, aplique a tese jurídica correspondente do modelo
- DOS PEDIDOS: APENAS pedidos que decorrem diretamente dos fatos da entrevista, com valores baseados no salário REAL
- VALOR DA CAUSA: Some todos os pedidos

${teses.length > 0 ? `Teses pré-identificadas (verifique se correspondem aos fatos da entrevista): ${teses.join(', ')}` : ''}
${baseConhecimento ? `\nBASE DE CONHECIMENTO ADICIONAL:\n${baseConhecimento}\n` : ''}

═══════════════════════════════════════════════════════
REGRAS ABSOLUTAS:
═══════════════════════════════════════════════════════
1. A ENTREVISTA MANDA. Todo fato narrado DEVE constar na petição. Não omita NENHUM detalhe, nome ou xingamento.
2. NÃO INVENTE PEDIDOS que não tenham respaldo nos fatos da entrevista.
3. NUNCA copie dados (nomes, datas, CNPJs, salários) do Modelo Padrão. Use APENAS os dados dos documentos do cliente.
4. Se um dado não existe nos documentos, use "__________".
5. NUNCA retorne JSON, código ou comandos. Entregue APENAS a petição pronta.

DOCUMENTOS DO CLIENTE ${nomeCliente} (LEIA TUDO ABAIXO COM ATENÇÃO MÁXIMA):`
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
