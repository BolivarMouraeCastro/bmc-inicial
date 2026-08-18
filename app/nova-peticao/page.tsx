'use client';

import React, { useState, useRef } from 'react';

export default function NovaPeticao() {
  const [step, setStep] = useState(1);
  const [nomeCliente, setNomeCliente] = useState('');
  const [entrevistaFiles, setEntrevistaFiles] = useState<File[]>([]);
  const [documentacaoFiles, setDocumentacaoFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [peticaoTexto, setPeticaoTexto] = useState('');
  const [peticaoGerada, setPeticaoGerada] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const entrevistaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => setStep(prev => Math.min(prev + 1, 4));
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
      body.append('teses', JSON.stringify([]));

      // Enviar entrevista
      entrevistaFiles.forEach(file => body.append('files', file));
      // Enviar documentação
      documentacaoFiles.forEach(file => body.append('files', file));

      const res = await fetch('/api/gerar-peticao', {
        method: 'POST',
        body,
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Erro no servidor. Tente novamente ou reduza o tamanho dos arquivos.');
      }
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar petição.');

      setPeticaoTexto(data.peticao || '');
      setPeticaoGerada(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao gerar a petição.');
    } finally {
      setLoading(false);
    }
  };

  const handleBaixarWord = () => {
    if (!peticaoTexto) return;

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Petição Inicial - ${nomeCliente}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; margin: 2cm; }
        p { margin-bottom: 6pt; }
      </style>
      </head><body>${peticaoTexto.replace(/\n/g, '<br>')}</body></html>
    `;

    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Peticao_Inicial_${nomeCliente.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stepLabels = ['Cliente', 'Entrevista', 'Documentação', 'Petição'];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-gradient">Nova Petição Inicial</h1>
        <p className="page-subtitle">Preencha os dados para gerar uma nova petição trabalhista</p>
      </div>

      <div className="wizard-container card mb-24">
        {/* Steps header */}
        <div className="card-header flex gap-16" style={{ padding: '16px 24px' }}>
          {stepLabels.map((label, i) => (
            <div key={i} className="flex gap-8 items-center" style={{ fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
              <div className="badge" style={{ background: step >= i + 1 ? 'var(--accent-blue)' : 'var(--bg-input)', minWidth: '24px', textAlign: 'center' }}>{i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="card-body" style={{ padding: '24px' }}>

          {/* STEP 1 - Nome do Cliente */}
          {step === 1 && (
            <div>
              <h3 className="form-section-title" style={{ marginBottom: '8px' }}>Identificação do Cliente</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                Informe o nome completo do cliente. Os demais dados serão extraídos pela IA a partir dos documentos.
              </p>
              <div className="form-group" style={{ maxWidth: '500px' }}>
                <label className="form-label">Nome Completo *</label>
                <input
                  className="form-input"
                  type="text"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  placeholder="Ex: João da Silva Santos"
                  style={{ fontSize: '15px', padding: '12px 16px' }}
                />
              </div>
            </div>
          )}

          {/* STEP 2 - Entrevista Trabalhista */}
          {step === 2 && (
            <div>
              <h3 className="form-section-title" style={{ marginBottom: '8px' }}>Entrevista Trabalhista</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                Anexe o arquivo da entrevista trabalhista. A IA usará os fatos narrados para fundamentar a petição.
              </p>

              <input ref={entrevistaInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => { if (e.target.files) setEntrevistaFiles(prev => [...prev, ...Array.from(e.target.files!)]); }}
                style={{ display: 'none' }}
              />

              <div className="upload-area" onClick={() => entrevistaInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) setEntrevistaFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
                style={{ cursor: 'pointer', padding: '32px', textAlign: 'center', border: '2px dashed var(--border-color)', borderRadius: '8px' }}
              >
                <p style={{ fontSize: '15px', marginBottom: '6px' }}>Clique para selecionar ou arraste o arquivo da entrevista</p>
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

          {/* STEP 3 - Documentação */}
          {step === 3 && (
            <div>
              <h3 className="form-section-title" style={{ marginBottom: '8px' }}>Documentação Comprobatória</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                Anexe os documentos disponíveis do cliente. Quanto mais documentos, mais completa será a petição.
              </p>

              <input ref={docInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                onChange={(e) => { if (e.target.files) setDocumentacaoFiles(prev => [...prev, ...Array.from(e.target.files!)]); }}
                style={{ display: 'none' }}
              />

              <div className="upload-area" onClick={() => docInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) setDocumentacaoFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
                style={{ cursor: 'pointer', padding: '32px', textAlign: 'center', border: '2px dashed var(--border-color)', borderRadius: '8px' }}
              >
                <p style={{ fontSize: '15px', marginBottom: '6px' }}>Clique para selecionar ou arraste os documentos</p>
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

              {/* Documentação sugerida */}
              <div className="card" style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-secondary)' }}>
                <h4 style={{ fontWeight: 600, marginBottom: '12px', fontSize: '14px' }}>Documentação comprobatória sugerida:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    'CTPS (Carteira de Trabalho)',
                    'RG e CPF',
                    'Procuração',
                    'Contrato de Trabalho',
                    'Holerites / Contracheques',
                    'TRCT (Termo de Rescisão)',
                    'Extrato do FGTS',
                    'Atestados Médicos',
                    'Comprovante de Endereço',
                    'Registro de Ponto',
                    'Comunicação de Dispensa',
                    'Cartão de Ponto',
                  ].map(doc => (
                    <div key={doc} style={{ fontSize: '13px', padding: '6px 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--border-color)' }}>-</span> {doc}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 - Petição */}
          {step === 4 && (
            <div>
              {!peticaoGerada && !loading && (
                <div>
                  <h3 className="form-section-title" style={{ marginBottom: '8px' }}>Gerar Petição</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                    Clique no botão abaixo para gerar a petição com base nos documentos anexados.
                    Após a geração, você poderá editar o texto antes de baixar.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px' }}><strong>Cliente:</strong> {nomeCliente || 'Não informado'}</p>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {entrevistaFiles.length} entrevista(s) | {documentacaoFiles.length} documento(s) anexados
                      </p>
                    </div>
                    <button className="btn btn-primary" onClick={handleGerarPeticao}
                      style={{ padding: '14px 32px', fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      Gerar Petição Inicial
                    </button>
                  </div>
                </div>
              )}

              {loading && (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>Gerando petição com Gemini AI...</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>A IA está analisando os documentos e gerando a petição. Isso pode levar até 60 segundos.</p>
                </div>
              )}

              {errorMessage && (
                <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', borderRadius: '8px', marginBottom: '16px' }}>
                  <span style={{ color: 'var(--accent-red)', fontSize: '14px' }}>{errorMessage}</span>
                </div>
              )}

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
                    Revise e edite o texto abaixo antes de baixar. Todas as alterações serão incluídas no download.
                  </p>
                  <textarea
                    value={peticaoTexto}
                    onChange={(e) => setPeticaoTexto(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '500px',
                      padding: '20px',
                      fontSize: '13.5px',
                      lineHeight: '1.8',
                      fontFamily: 'Arial, sans-serif',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      resize: 'vertical',
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
