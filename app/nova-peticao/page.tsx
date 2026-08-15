'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

const TESE_LABELS: Record<string, string> = {
  horasExtras: 'Horas Extras',
  intervalo: 'Intervalo Intrajornada',
  fgts: 'FGTS (Diferenças/Multa)',
  decimoTerceiro: '13º Salário',
  ferias: 'Férias (Vencidas/Proporcionais)',
  verbasRescisorias: 'Verbas Rescisórias',
  danoMoral: 'Dano Moral',
};

const TESE_ICONS: Record<string, string> = {
  horasExtras: '⏰',
  intervalo: '🍽️',
  fgts: '🏦',
  decimoTerceiro: '💰',
  ferias: '🏖️',
  verbasRescisorias: '📋',
  danoMoral: '⚖️',
};

const TESE_DESCRIPTIONS: Record<string, string> = {
  horasExtras: 'Trabalho além da jornada contratual sem pagamento',
  intervalo: 'Supressão ou redução do intervalo intrajornada',
  fgts: 'Diferenças ou ausência de depósitos do FGTS',
  decimoTerceiro: 'Não pagamento ou diferenças no 13º salário',
  ferias: 'Férias não gozadas, não pagas ou com diferenças',
  verbasRescisorias: 'Saldo de salário, aviso prévio, multas',
  danoMoral: 'Assédio, humilhação ou situação degradante',
};

export default function NovaPeticao() {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    nomeCliente: '',
    cpf: '', rg: '', orgaoExpedidor: '', pisPasep: '', ctps: '', serieCtps: '',
    dataNascimento: '', nacionalidade: 'brasileira', estadoCivil: 'Solteiro',
    profissao: '', nomeMae: '',
    cepCliente: '', enderecoCliente: '', bairroCliente: '', cidadeCliente: '', estadoCliente: '',
    empresas: [{ tipo: 'PJ', razaoSocial: '', cnpjCpf: '', endereco: '', bairro: '', cidade: '', estado: '', cep: '' }],
    dataAdmissao: '', dataDemissao: '', tipoRescisao: 'Sem Justa Causa',
    ultimoSalario: '', cargo: '', setor: '',
    horarioEntrada: '', horarioSaida: '', intervalo: '', jornada: '',
    trabalhavaSabados: false, trabalhavaDomingos: false,
    vara: '', cidadeVara: '', estadoVara: '', nomeAdvogado: '', oab: '',
    resumoEntrevista: '',
    teses: {
      horasExtras: false, intervalo: false, fgts: false,
      decimoTerceiro: false, ferias: false, verbasRescisorias: false, danoMoral: false,
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [peticaoTexto, setPeticaoTexto] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [resumoIA, setResumoIA] = useState('');
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [tesesAnalisadas, setTesesAnalisadas] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTeseChange = (teseKey: keyof typeof formData.teses) => {
    setFormData(prev => ({
      ...prev,
      teses: { ...prev.teses, [teseKey]: !prev.teses[teseKey] }
    }));
  };

  // Analisar documentos com IA ao entrar no Step 3
  const analisarDocumentos = useCallback(async () => {
    if (tesesAnalisadas || uploadedFiles.length === 0) return;

    setAnalisando(true);
    try {
      const form = new FormData();
      form.append('nomeCliente', formData.nomeCliente);
      uploadedFiles.forEach(file => form.append('files', file));

      const res = await fetch('/api/sugerir-teses', { method: 'POST', body: form });
      const data = await res.json();

      if (data.teses && data.teses.length > 0) {
        const novasTeses = { ...formData.teses };
        for (const key of data.teses) {
          if (key in novasTeses) {
            novasTeses[key as keyof typeof novasTeses] = true;
          }
        }
        setFormData(prev => ({ ...prev, teses: novasTeses }));
      }

      if (data.resumo) setResumoIA(data.resumo);
      if (data.justificativas) setJustificativas(data.justificativas);
      setTesesAnalisadas(true);
    } catch {
      // Silently fail - user can still select manually
    } finally {
      setAnalisando(false);
    }
  }, [tesesAnalisadas, uploadedFiles, formData.nomeCliente, formData.teses]);

  useEffect(() => {
    if (step === 3 && !tesesAnalisadas) {
      analisarDocumentos();
    }
  }, [step, tesesAnalisadas, analisarDocumentos]);

  const handleNext = () => {
    if (step === 2) {
      setTesesAnalisadas(false); // Reset so analysis runs when entering step 3
    }
    setStep(prev => Math.min(prev + 1, 3));
  };
  const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

  const handleGerarPeticao = async () => {
    if (!formData.nomeCliente) {
      setErrorMessage('Por favor, preencha o Nome do Cliente (no Passo 1) antes de gerar a petição.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const tesesSelecionadas = Object.entries(formData.teses)
      .filter(([, checked]) => checked)
      .map(([key]) => TESE_LABELS[key]);

    try {
      const res = await fetch('/api/gerar-peticao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, teses: tesesSelecionadas }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar petição.');

      setPeticaoTexto(data.peticao || '');
      setSuccessMessage('Petição inicial gerada com sucesso!');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao gerar a petição.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarTexto = async () => {
    if (!peticaoTexto) return;
    try {
      await navigator.clipboard.writeText(peticaoTexto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch (err) {
      console.error('Erro ao copiar texto:', err);
    }
  };

  const tesesSelecionadasCount = Object.values(formData.teses).filter(Boolean).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-gradient">Nova Petição Inicial</h1>
        <p className="page-subtitle">Preencha os dados para gerar uma nova petição trabalhista</p>
      </div>

      <div className="wizard-container card mb-24">
        <div className="wizard-steps card-header flex gap-16">
          {[1, 2, 3].map(i => (
            <div key={i} className={`wizard-step flex gap-8 items-center ${step === i ? 'active' : ''}`} style={{ fontWeight: step === i ? 700 : 400, color: step === i ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
              <div className={`wizard-step-circle badge ${step >= i ? 'badge-info' : ''}`} style={{ background: step >= i ? 'var(--accent-blue)' : 'var(--bg-input)' }}>{i}</div>
              <span className="wizard-step-label">
                {i === 1 ? 'Cliente' : i === 2 ? 'Documentos' : 'Teses e Geração'}
              </span>
            </div>
          ))}
        </div>

        <div className="wizard-content card-body">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="flex flex-col gap-24">
              <div className="form-section">
                <h3 className="form-section-title mb-12">👤 Identificação do Cliente</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Informe o nome do cliente. Os demais dados serão extraídos automaticamente pela IA a partir dos documentos anexados na próxima etapa.
                </p>
                <div className="form-group" style={{ maxWidth: '500px' }}>
                  <label className="form-label">Nome Completo do Cliente*</label>
                  <input className="form-input" type="text" name="nomeCliente" value={formData.nomeCliente} onChange={handleChange} placeholder="Ex: João da Silva Santos" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="flex flex-col gap-24">
              <h3 className="form-section-title">📎 Anexar Documentos</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Arraste e solte os arquivos ou clique para selecionar.</p>

              <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                onChange={(e) => { if (e.target.files) setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]); }}
                style={{ display: 'none' }}
              />

              <div className="upload-area" onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) setUploadedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
                style={{ cursor: 'pointer' }}
              >
                <span className="upload-icon">📄</span>
                <p className="upload-text">Arraste arquivos aqui ou <span style={{ color: 'var(--accent-blue)' }}>busque no computador</span></p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>PDF, JPG, PNG, DOC, DOCX, TXT (Max: 10MB)</p>
              </div>

              <div className="card p-16" style={{ background: 'var(--bg-secondary)' }}>
                <h4 className="mb-12" style={{ fontWeight: 600 }}>Documentos Comuns Sugeridos:</h4>
                <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                  {['Entrevista Trabalhista', 'CTPS', 'Holerites', 'Contrato de Trabalho', 'TRCT', 'Extrato FGTS', 'Atestados'].map(doc => (
                    <span key={doc} className="badge" style={{ background: 'var(--bg-card)' }}>{doc}</span>
                  ))}
                </div>
              </div>

              {uploadedFiles.length > 0 ? (
                <div className="card p-16">
                  <h4 className="mb-12" style={{ fontWeight: 600 }}>📎 Documentos Anexados ({uploadedFiles.length})</h4>
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < uploadedFiles.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                      <div>
                        <span style={{ marginRight: '8px' }}>{file.name.endsWith('.pdf') ? '📕' : file.name.match(/\.(jpg|jpeg|png)$/i) ? '🖼️' : '📄'}</span>
                        <span style={{ fontSize: '14px' }}>{file.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button className="btn btn-sm" style={{ color: 'var(--accent-red)', fontSize: '12px' }}
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                      >✕ Remover</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  <p>Nenhum documento anexado ainda.</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="flex flex-col gap-24">
              {/* Analisando */}
              {analisando && (
                <div className="card" style={{ border: '1px solid var(--accent-blue)', padding: '32px', textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>🤖</div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '8px' }}>
                    Analisando documentos com IA...
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    O Gemini está lendo seus documentos para sugerir as teses mais adequadas ao caso.
                  </p>
                </div>
              )}

              {/* Resumo da IA */}
              {!analisando && resumoIA && (
                <div className="card" style={{ border: '1px solid var(--accent-green)', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px' }}>🤖</span>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-green)' }}>Análise da IA</h4>
                    <span className="badge badge-info" style={{ fontSize: '11px' }}>Gemini AI</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>{resumoIA}</p>
                </div>
              )}

              {/* Teses */}
              {!analisando && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 className="form-section-title">⚖️ Teses e Pedidos</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                        {tesesAnalisadas && uploadedFiles.length > 0
                          ? 'Teses sugeridas pela IA com base nos documentos. Ajuste se necessário.'
                          : 'Selecione as teses que farão parte da petição inicial.'}
                      </p>
                    </div>
                    <div className="badge badge-info" style={{ fontSize: '13px', padding: '6px 14px' }}>
                      {tesesSelecionadasCount} selecionada{tesesSelecionadasCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                    {Object.entries(TESE_LABELS).map(([key, label]) => {
                      const isChecked = formData.teses[key as keyof typeof formData.teses];
                      const justificativa = justificativas[key];
                      return (
                        <div
                          key={key}
                          onClick={() => handleTeseChange(key as keyof typeof formData.teses)}
                          className="card"
                          style={{
                            padding: '16px 20px',
                            cursor: 'pointer',
                            border: isChecked ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                            background: isChecked ? 'rgba(59, 130, 246, 0.06)' : 'var(--bg-card)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>{TESE_ICONS[key]}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, fontSize: '15px' }}>{label}</span>
                                {isChecked && tesesAnalisadas && uploadedFiles.length > 0 && (
                                  <span style={{ fontSize: '10px', background: 'var(--accent-blue)', color: '#fff', padding: '2px 8px', borderRadius: '10px' }}>IA</span>
                                )}
                              </div>
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {TESE_DESCRIPTIONS[key]}
                              </p>
                              {justificativa && (
                                <p style={{ fontSize: '12px', color: isChecked ? 'var(--accent-blue)' : 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                                  💡 {justificativa}
                                </p>
                              )}
                            </div>
                            <div style={{
                              width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
                              border: isChecked ? '2px solid var(--accent-blue)' : '2px solid var(--border-color)',
                              background: isChecked ? 'var(--accent-blue)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: '14px', fontWeight: 700,
                            }}>
                              {isChecked ? '✓' : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Messages */}
              {successMessage && (
                <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>✨</span>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <span style={{ color: 'var(--accent-red)' }}>{errorMessage}</span>
                </div>
              )}

              {/* Preview area */}
              {!analisando && (
                <div className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>📄</span>
                      <h4 style={{ fontWeight: 600 }}>Pré-visualização</h4>
                    </div>
                    {peticaoTexto && (
                      <button className="btn btn-sm btn-secondary" onClick={handleCopiarTexto} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {copiado ? '✅ Copiado!' : '📋 Copiar Texto'}
                      </button>
                    )}
                  </div>
                  <div style={{
                    minHeight: '120px', padding: '20px', borderRadius: '8px',
                    background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                  }}>
                    {loading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '16px' }}>
                        <div style={{ fontSize: '40px', animation: 'pulse 1.5s infinite' }}>⚡</div>
                        <span style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: '16px' }}>Gerando petição com Gemini AI...</span>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Isso pode levar até 30 segundos</p>
                      </div>
                    ) : peticaoTexto ? (
                      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-primary)', fontSize: '13.5px', lineHeight: 1.7 }}>
                        {peticaoTexto}
                      </pre>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', gap: '8px' }}>
                        <span style={{ fontSize: '32px', opacity: 0.3 }}>📝</span>
                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>A petição aparecerá aqui após a geração...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-secondary" onClick={handlePrev} disabled={step === 1}
            style={{ opacity: step === 1 ? 0.4 : 1, cursor: step === 1 ? 'not-allowed' : 'pointer', padding: '10px 24px' }}>
            ← Anterior
          </button>

          {step < 3 ? (
            <button className="btn btn-primary" onClick={handleNext} style={{ padding: '10px 24px' }}>
              Próximo →
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleGerarPeticao} disabled={loading || analisando}
              style={{
                padding: '12px 32px', fontSize: '15px', fontWeight: 700,
                background: loading ? 'var(--bg-input)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                opacity: (loading || analisando) ? 0.6 : 1,
                cursor: (loading || analisando) ? 'wait' : 'pointer',
              }}>
              {loading ? '⏳ Gerando...' : '✨ Gerar Petição'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
