import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function gerarPeticao(dados: {
  // Cliente
  nomeCliente: string;
  cpf: string;
  rg?: string;
  orgaoExpedidor?: string;
  pisPasep?: string;
  ctps?: string;
  serieCtps?: string;
  dataNascimento?: string;
  nacionalidade?: string;
  estadoCivil?: string;
  profissao?: string;
  nomeMae?: string;
  enderecoCliente?: string;
  bairroCliente?: string;
  cidadeCliente?: string;
  estadoCliente?: string;
  cepCliente?: string;
  // Empresas
  empresas: Array<{
    tipo: string;
    razaoSocial: string;
    cnpjCpf: string;
    endereco?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  }>;
  // Contrato
  dataAdmissao: string;
  dataDemissao?: string;
  tipoRescisao?: string;
  ultimoSalario?: string;
  cargo?: string;
  setor?: string;
  horarioEntrada?: string;
  horarioSaida?: string;
  intervalo?: string;
  jornada?: string;
  trabalhavaSabados?: boolean;
  trabalhavaDomingos?: boolean;
  // Vara
  vara?: string;
  cidadeVara?: string;
  estadoVara?: string;
  nomeAdvogado?: string;
  oab?: string;
  // Entrevista
  resumoEntrevista?: string;
  // Teses selecionadas
  teses: string[];
  // Textos da base de conhecimento para referência
  textosBase?: string[];
}) {
  const tesesFormatadas = dados.teses.join(', ');
  
  const empresasFormatadas = dados.empresas.map((emp, i) => 
    `${i + 1}ª Reclamada: ${emp.razaoSocial} (${emp.tipo}), CNPJ/CPF: ${emp.cnpjCpf}, Endereço: ${emp.endereco || 'N/I'}, ${emp.bairro || ''}, ${emp.cidade || ''}-${emp.estado || ''}, CEP: ${emp.cep || 'N/I'}`
  ).join('\n');

  const baseConhecimento = dados.textosBase && dados.textosBase.length > 0
    ? `\n\nDOCUMENTOS DE REFERÊNCIA DA BASE DE CONHECIMENTO:\n${dados.textosBase.join('\n---\n')}`
    : '';

  const prompt = `Você é um advogado trabalhista brasileiro especializado em elaborar petições iniciais trabalhistas. 
Gere uma petição inicial trabalhista COMPLETA e PROFISSIONAL com base nos dados abaixo.

A petição deve seguir rigorosamente a estrutura de uma petição inicial trabalhista brasileira, incluindo:
1. Endereçamento ao Juízo
2. Qualificação completa do Reclamante
3. Qualificação completa da(s) Reclamada(s)
4. Dos Fatos (narrativa baseada no resumo da entrevista)
5. Do Direito (fundamentação jurídica para cada tese, citando artigos da CLT, Súmulas do TST, e jurisprudência)
6. Dos Pedidos (cada pedido numerado)
7. Do Valor da Causa
8. Requerimentos finais
9. Local, data e assinatura do advogado

DADOS DO RECLAMANTE:
Nome: ${dados.nomeCliente}
CPF: ${dados.cpf}
RG: ${dados.rg || 'N/I'} - Órgão Expedidor: ${dados.orgaoExpedidor || 'N/I'}
PIS/PASEP: ${dados.pisPasep || 'N/I'}
CTPS: ${dados.ctps || 'N/I'} - Série: ${dados.serieCtps || 'N/I'}
Data de Nascimento: ${dados.dataNascimento || 'N/I'}
Nacionalidade: ${dados.nacionalidade || 'brasileira'}
Estado Civil: ${dados.estadoCivil || 'N/I'}
Profissão: ${dados.profissao || 'N/I'}
Nome da Mãe: ${dados.nomeMae || 'N/I'}
Endereço: ${dados.enderecoCliente || 'N/I'}, ${dados.bairroCliente || ''}, ${dados.cidadeCliente || ''}-${dados.estadoCliente || ''}, CEP: ${dados.cepCliente || 'N/I'}

DADOS DA(S) RECLAMADA(S):
${empresasFormatadas}

DADOS DO CONTRATO DE TRABALHO:
Data de Admissão: ${dados.dataAdmissao}
Data de Demissão: ${dados.dataDemissao || 'N/I'}
Tipo de Rescisão: ${dados.tipoRescisao || 'N/I'}
Último Salário: ${dados.ultimoSalario || 'N/I'}
Cargo: ${dados.cargo || 'N/I'}
Setor: ${dados.setor || 'N/I'}
Horário: ${dados.horarioEntrada || 'N/I'} às ${dados.horarioSaida || 'N/I'}
Intervalo: ${dados.intervalo || 'N/I'}
Jornada: ${dados.jornada || 'N/I'}
Trabalhava aos sábados: ${dados.trabalhavaSabados ? 'Sim' : 'Não'}
Trabalhava aos domingos: ${dados.trabalhavaDomingos ? 'Sim' : 'Não'}

VARA DO TRABALHO: ${dados.vara || 'N/I'} - ${dados.cidadeVara || 'N/I'}/${dados.estadoVara || 'N/I'}
ADVOGADO: ${dados.nomeAdvogado || 'N/I'} - OAB: ${dados.oab || 'N/I'}

RESUMO DA ENTREVISTA COM O CLIENTE:
${dados.resumoEntrevista || 'Não informado'}

TESES SELECIONADAS: ${tesesFormatadas}
${baseConhecimento}

IMPORTANTE:
- Use linguagem jurídica formal
- Cite artigos da CLT, Súmulas do TST e jurisprudência quando cabível
- Para cada tese selecionada, elabore fundamentação jurídica detalhada
- Calcule valores aproximados quando possível com base no salário informado
- Se houver documentos de referência da base de conhecimento, use-os como modelo de estilo e estrutura
- A petição deve estar pronta para uso, sem campos a preencher`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  return response.text || 'Erro ao gerar petição';
}
