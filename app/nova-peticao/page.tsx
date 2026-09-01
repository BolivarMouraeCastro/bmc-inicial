'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface TeseSugerida {
  nome: string;
  justificativa: string;
}

export default function NovaPeticao() {
  const [step, setStep] = useState(1);
  const [nomeCliente, setNomeCliente] = useState('');
  const [entrevistaFiles, setEntrevistaFiles] = useState<File[]>([]);
  const [documentacaoFiles, setDocumentacaoFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [peticaoTexto, setPeticaoTexto] = useState('');
  const [peticaoGerada, setPeticaoGerada] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [tesesSugeridas, setTesesSugeridas] = useState<TeseSugerida[]>([]);
  const [resumoIA, setResumoIA] = useState('');
  const [tesesAnalisadas, setTesesAnalisadas] = useState(false);

  const entrevistaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Analisar documentos ao entrar no Step 4
  const analisarDocumentos = useCallback(async () => {
    if (tesesAnalisadas) return;

    setAnalisando(true);
    try {
      const form = new FormData();
      form.append('nomeCliente', nomeCliente);
      // Não enviamos os arquivos no form para evitar o limite de 4.5MB da Vercel

      const res = await fetch('/api/sugerir-teses', { method: 'POST', body: form });

      if (!res.ok) {
        throw new Error("Falha ao preparar a análise de teses.");
      }

      const { parts } = await res.json();

      // Processar TODOS os arquivos localmente (Entrevista + Holerites/Docs)
      const processFile = async (file: File) => {
        parts.push({ text: `\n\n--- DOCUMENTO: ${file.name} ---` });
        
        const name = file.name.toLowerCase();
        let mimeType = file.type || '';
        if (name.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (name.endsWith('.png')) mimeType = 'image/png';
        
        if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
          const base64Promise = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]); // Pega só o base64
            };
            reader.readAsDataURL(file);
          });
          const base64 = await base64Promise;
          parts.push({ inlineData: { mimeType, data: base64 } });
        } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
          // Extração bruta de texto para DOCX (melhor esforço)
          const textPromise = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const buffer = reader.result as ArrayBuffer;
              const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
              const cleaned = text.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, ' ').replace(/\s{3,}/g, ' ');
              resolve(cleaned);
            };
            reader.readAsArrayBuffer(file);
          });
          const text = await textPromise;
          parts.push({ text: text.substring(0, 15000) });
        } else {
          // Fallback para texto
          const textPromise = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsText(file);
          });
          const text = await textPromise;
          parts.push({ text: text.substring(0, 15000) });
        }
      };

      for (const file of entrevistaFiles) await processFile(file);
      for (const file of documentacaoFiles) await processFile(file); // AGORA INCLUIMOS A DOCUMENTAÇÃO!

      // Buscar API Key
      const keyRes = await fetch('/api/auth/key');
      const { key } = await keyRes.json();
      if (!key) throw new Error("API Key do Gemini não configurada.");

      // Chamar API do Google diretamente para gerar a análise (Não precisa ser stream)
      const googleRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts }] })
      });

      if (!googleRes.ok) throw new Error("Erro na API do Google Gemini");

      const googleData = await googleRes.json();
      const responseText = googleData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      let data;
      try {
        let cleanJson = responseText;
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) cleanJson = jsonMatch[1];
        else cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        data = JSON.parse(cleanJson);
      } catch (e) {
        data = { teses: [], resumo: responseText || 'A IA não retornou um formato JSON válido.' };
      }

      if (data.teses && data.teses.length > 0) {
        setTesesSugeridas(data.teses);
      }
      if (data.resumo) setResumoIA(data.resumo);
      setTesesAnalisadas(true);
    } catch (err) {
      console.error(err);
      setResumoIA('Não foi possível analisar os documentos. Tente reduzir o número de arquivos.');
    } finally {
      setAnalisando(false);
    }
  }, [tesesAnalisadas, nomeCliente, entrevistaFiles, documentacaoFiles]);

  useEffect(() => {
    if (step === 4 && !tesesAnalisadas) {
      analisarDocumentos();
    }
  }, [step, tesesAnalisadas, analisarDocumentos]);

  const handleNext = () => {
    if (step === 3) setTesesAnalisadas(false); // Reset para nova análise
    setStep(prev => Math.min(prev + 1, 4));
  };
  const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

  const handleGerarPeticao = async () => {
    if (!nomeCliente) {
      setErrorMessage('Preencha o Nome do Cliente (Passo 1).');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const body = new FormData();
      body.append('nomeCliente', nomeCliente);

      // Enviar teses sugeridas
      const nomesT = tesesSugeridas.map(t => t.nome);
      body.append('teses', JSON.stringify(nomesT));

      // Não anexamos 'files' ao FormData para não estourar o limite de 4.5MB da Vercel!
      // Vamos processar tudo no frontend logo abaixo.
      const res = await fetch('/api/gerar-peticao', { method: 'POST', body });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erro ao preparar petição: ${text.substring(0, 100)}`);
      }

      const { parts } = await res.json();

      // === PROCESSAR ARQUIVOS NO CLIENTE PARA BURLAR LIMITE DE 4.5MB ===
      const processFile = async (file: File) => {
        parts.push({ text: `\n\n--- DOCUMENTO: ${file.name} ---` });
        
        const name = file.name.toLowerCase();
        let mimeType = file.type || '';
        if (name.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (name.endsWith('.png')) mimeType = 'image/png';
        
        if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
          const base64Promise = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]); // Pega só o base64
            };
            reader.readAsDataURL(file);
          });
          const base64 = await base64Promise;
          parts.push({ inlineData: { mimeType, data: base64 } });
        } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
          // Extração bruta de texto para DOCX (melhor esforço)
          const textPromise = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const buffer = reader.result as ArrayBuffer;
              const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
              const cleaned = text.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, ' ').replace(/\s{3,}/g, ' ');
              resolve(cleaned);
            };
            reader.readAsArrayBuffer(file);
          });
          const text = await textPromise;
          parts.push({ text: text.substring(0, 15000) });
        } else {
          // Fallback para texto puro
          const textPromise = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsText(file);
          });
          const text = await textPromise;
          parts.push({ text: text.substring(0, 15000) });
        }
      };

      for (const file of entrevistaFiles) await processFile(file);
      for (const file of documentacaoFiles) await processFile(file);
      // =================================================================

      // Buscar API Key
      const keyRes = await fetch('/api/auth/key');
      const { key } = await keyRes.json();
      if (!key) throw new Error("API Key do Gemini não configurada.");

      setPeticaoGerada(true);
      setPeticaoTexto('');

      // Chamar API do Google diretamente (sem timeout de Vercel!)
      const googleRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts }] })
      });

      if (!googleRes.ok) throw new Error("Erro na API do Google Gemini");

      const reader = googleRes.body!.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let generatedText = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          
          // O Google retorna chunks de JSON array [ { "candidates": [ ... ] } , ...]
          // Precisamos parsear a stream de JSON manualmente
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('"text":')) {
              try {
                // Wrap in braces to make it valid JSON so we can extract the exact unescaped string
                const obj = JSON.parse(`{ ${line.trim().replace(/,$/, '')} }`);
                if (obj.text) {
                  generatedText += obj.text;
                  setPeticaoTexto(generatedText);
                }
              } catch (e) {
                // Ignore parse errors on split chunks
              }
            }
          }
        }
      }

    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao gerar a petição.');
    } finally {
      setLoading(false);
    }
  };

  const handleBaixarWord = () => {
    if (!peticaoTexto) return;
    
    // Transformar quebras de linha em parágrafos reais para o Word aplicar o recuo
    const paragraphs = peticaoTexto
      .split(/\n+/)
      .filter(p => p.trim() !== '')
      .map(p => {
        let text = p.trim();
        // Limpar asteriscos de negrito do markdown para o word
        text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');
        
        // Detectar títulos (tudo maiúsculo e menor que 100 caracteres)
        const isTitle = text.toUpperCase() === text && text.length < 100 && text.length > 3;
        
        if (isTitle || text.startsWith('#')) {
          const cleanText = text.replace(/^#+\s*/, '');
          return `<p class="titulo"><b>${cleanText}</b></p>`;
        }
        return `<p>${text}</p>`;
      })
      .join('');

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Petição - ${nomeCliente}</title>
    <style>
      body { 
        font-family: 'Times New Roman', serif; 
        font-size: 12pt; 
        margin: 3cm 2cm 2cm 3cm; 
      }
      p { 
        text-align: justify; 
        line-height: 1.5; 
        margin-top: 18pt; 
        margin-bottom: 18pt; 
        text-indent: 3cm; 
      }
      /* Títulos centralizados e sem recuo (heurística básica para linhas curtas e em maiúsculo) */
      h1, h2, h3, h4, .titulo {
        text-align: center;
        text-indent: 0;
        font-weight: bold;
      }
    </style>
    </head><body>${paragraphs}</body></html>`;
    
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Peticao_${nomeCliente.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stepLabels = ['Cliente', 'Entrevista', 'Documentação', 'Análise e Petição'];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-gradient">Nova Petição Inicial</h1>
        <p className="page-subtitle">Preencha os dados para gerar uma nova petição trabalhista</p>
      </div>

      <div className="wizard-container card mb-24">
        <div className="card-header flex gap-16" style={{ padding: '16px 24px' }}>
          {stepLabels.map((label, i) => (
            <div key={i} className="flex gap-8 items-center" style={{ fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
              <div className="badge" style={{ background: step >= i + 1 ? 'var(--accent-blue)' : 'var(--bg-input)', minWidth: '24px', textAlign: 'center' }}>{i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="card-body" style={{ padding: '24px' }}>

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <h3 className="form-section-title" style={{ marginBottom: '8px' }}>Identificação do Cliente</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                Informe o nome completo do cliente.
              </p>
              <div className="form-group" style={{ maxWidth: '500px' }}>
                <label className="form-label">Nome Completo *</label>
                <input className="form-input" type="text" value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  placeholder="Ex: João da Silva Santos"
                  style={{ fontSize: '15px', padding: '12px 16px' }}
                />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <h3 className="form-section-title" style={{ marginBottom: '8px' }}>Entrevista Trabalhista</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                Anexe o arquivo da entrevista trabalhista. A IA usará os fatos narrados para fundamentar a petição.
              </p>
              <input ref={entrevistaInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => { if (e.target.files) setEntrevistaFiles(prev => [...prev, ...Array.from(e.target.files!)]); }}
                style={{ display: 'none' }} />
              <div className="upload-area" onClick={() => entrevistaInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) setEntrevistaFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
                style={{ cursor: 'pointer', padding: '32px', textAlign: 'center', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
                <p style={{ fontSize: '15px', marginBottom: '6px' }}>Clique ou arraste o arquivo da entrevista</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PDF, DOC, DOCX, TXT</p>
              </div>
              {entrevistaFiles.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  {entrevistaFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '14px' }}>{file.name} <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({(file.size / 1024).toFixed(0)} KB)</span></span>
                      <button className="btn btn-sm" style={{ color: 'var(--accent-red)', fontSize: '12px' }}
                        onClick={() => setEntrevistaFiles(prev => prev.filter((_, i) => i !== idx))}>Remover</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <h3 className="form-section-title" style={{ marginBottom: '8px' }}>Documentação Comprobatória</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                Anexe os documentos disponíveis. A IA analisará tudo na próxima etapa.
              </p>
              <input ref={docInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                onChange={(e) => { if (e.target.files) setDocumentacaoFiles(prev => [...prev, ...Array.from(e.target.files!)]); }}
                style={{ display: 'none' }} />
              <div className="upload-area" onClick={() => docInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) setDocumentacaoFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
                style={{ cursor: 'pointer', padding: '32px', textAlign: 'center', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
                <p style={{ fontSize: '15px', marginBottom: '6px' }}>Clique ou arraste os documentos</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PDF, JPG, PNG, DOC, DOCX, TXT</p>
              </div>
              {documentacaoFiles.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  {documentacaoFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '14px' }}>{file.name} <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({(file.size / 1024).toFixed(0)} KB)</span></span>
                      <button className="btn btn-sm" style={{ color: 'var(--accent-red)', fontSize: '12px' }}
                        onClick={() => setDocumentacaoFiles(prev => prev.filter((_, i) => i !== idx))}>Remover</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="card" style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-secondary)' }}>
                <h4 style={{ fontWeight: 600, marginBottom: '12px', fontSize: '14px' }}>Documentação sugerida:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {['CTPS', 'RG e CPF', 'Procuração', 'Contrato de Trabalho', 'Holerites', 'TRCT', 'Extrato do FGTS', 'Atestados Médicos', 'Comprovante de Endereço', 'Registro de Ponto'].map(doc => (
                    <div key={doc} style={{ fontSize: '13px', padding: '4px 0', color: 'var(--text-secondary)' }}>- {doc}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="flex flex-col gap-20">

              {/* Analisando */}
              {analisando && (
                <div className="card" style={{ border: '1px solid var(--accent-blue)', padding: '32px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: '16px' }}>Analisando documentos e Base de Conhecimento...</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>A IA está identificando as teses aplicáveis ao caso.</p>
                </div>
              )}

              {/* Resumo da análise */}
              {!analisando && resumoIA && (
                <div className="card" style={{ border: '1px solid var(--accent-green)', padding: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Análise da IA</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>{resumoIA}</p>
                </div>
              )}

              {/* Teses sugeridas - tópicos simples */}
              {!analisando && tesesSugeridas.length > 0 && (
                <div>
                  <h3 className="form-section-title" style={{ marginBottom: '8px' }}>Teses Sugeridas ({tesesSugeridas.length})</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {tesesSugeridas.map((tese, idx) => (
                      <li key={idx} style={{ padding: '6px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>&#10003;</span> {tese.nome}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!analisando && tesesSugeridas.length === 0 && tesesAnalisadas && (
                <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Nenhuma tese identificada. A petição será gerada com base nos documentos.</p>
                </div>
              )}

              {/* Erro */}
              {errorMessage && (
                <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--accent-red)', fontSize: '14px' }}>{errorMessage}</span>
                </div>
              )}

              {/* Botão gerar */}
              {!analisando && !peticaoGerada && !loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px' }}><strong>Cliente:</strong> {nomeCliente}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {entrevistaFiles.length} entrevista(s) | {documentacaoFiles.length} documento(s) | {tesesSugeridas.length} tese(s)
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={handleGerarPeticao}
                    style={{ padding: '14px 32px', fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Gerar Petição Inicial
                  </button>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>Gerando petição com Gemini AI...</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Pode levar até 60 segundos.</p>
                </div>
              )}

              {/* Petição gerada - editável */}
              {peticaoGerada && !loading && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 className="form-section-title">Petição Gerada</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary" onClick={handleBaixarWord}
                        style={{ padding: '10px 20px', fontWeight: 600 }}>
                        Baixar como Word (.doc)
                      </button>
                      <button className="btn btn-secondary" onClick={() => { setPeticaoGerada(false); setPeticaoTexto(''); }}
                        style={{ padding: '10px 20px' }}>
                        Gerar Novamente
                      </button>
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                    Revise e edite o texto antes de baixar.
                  </p>
                  <textarea
                    value={peticaoTexto}
                    onChange={(e) => setPeticaoTexto(e.target.value)}
                    style={{
                      width: '100%', minHeight: '500px', padding: '20px',
                      fontSize: '13.5px', lineHeight: '1.8', fontFamily: 'Arial, sans-serif',
                      background: 'var(--bg-input)', color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)', borderRadius: '8px', resize: 'vertical',
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-secondary" onClick={handlePrev} disabled={step === 1}
            style={{ opacity: step === 1 ? 0.4 : 1, cursor: step === 1 ? 'not-allowed' : 'pointer', padding: '10px 24px' }}>
            Anterior
          </button>
          {step < 4 && (
            <button className="btn btn-primary" onClick={handleNext} style={{ padding: '10px 24px' }}>
              Próximo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
