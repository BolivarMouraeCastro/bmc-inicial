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
      // User can still select manually
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
    if (step === 2) setTesesAnalisadas(false);
    setStep(prev => Math.min(prev + 1, 3));
  };
  const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

  const handleGerarPeticao = async () => {
    if (!formData.nomeCliente) {
      setErrorMessage('Preencha o Nome do Cliente (Passo 1) antes de gerar.');
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
      setSuccessMessage('Petição gerada com sucesso!');
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
      console.error('Erro ao copiar:', err);
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
            <div key={i} className={`wizard-step flex gap-8 items-center`} style={{ fontWeight: step === i ? 700 : 400, color: step === i ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
              <div className="wizard-step-circle badge" style={{ background: step >= i ? 'var(--accent-blue)' : 'var(--bg-input)' }}>{i}</div>
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
                <h3 className="form-section-title mb-12">Identificação do Cliente</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Informe o nome do cliente. Os demais dados serão extraídos automaticamente pela IA a partir dos documentos.
                </p>
                <div className="form-group" style={{ maxWidth: '500px' }}>
                  <label className="form-label">Nome Completo do Cliente *</label>
                  <input className="form-input" type="text" name="nomeCliente" value={formData.nomeCliente} onChange={handleChange} placeholder="Ex: João da Silva Santos" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="flex flex-col gap-24">
              <h3 className="form-section-title">Anexar Documentos</h3>
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
                <span className="upload-icon" style={{ fontSize: '24px' }}>+</span>
                <p className="upload-text">Arraste arquivos aqui ou <span style={{ color: 'var(--accent-blue)' }}>busque no computador</span></p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>PDF, JPG, PNG, DOC, DOCX, TXT (Max: 10MB)</p>
              </div>

              <div className="card p-16" style={{ background: 'var(--bg-secondary)' }}>
                <h4 className="mb-12" style={{ fontWeight: 600 }}>Documentos sugeridos:</h4>
                <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                  {['Entrevista Trabalhista', 'CTPS', 'Holerites', 'Contrato de Trabalho', 'TRCT', 'Extrato FGTS', 'Atestados'].map(doc => (
                    <span key={doc} className="badge" style={{ background: 'var(--bg-card)' }}>{doc}</span>
                  ))}
                </div>
              </div>

              {uploadedFiles.length > 0 ? (
                <div className="card p-16">
                  <h4 className="mb-12" style={{ fontWeight: 600 }}>Documentos Anexados ({uploadedFiles.length})</h4>
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < uploadedFiles.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                      <div>
                        <span style={{ fontSize: '14px' }}>{file.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button className="btn btn-sm" style={{ color: 'var(--accent-red)', fontSize: '12px' }}
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                      >Remover</button>
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
                  <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '8px' }}>
                    Analisando documentos com IA...
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Identificando as teses mais adequadas ao caso. Aguarde.
                  </p>
                </div>
              )}

              {/* Resumo da IA */}
              {!analisando && resumoIA && (
                <div className="card" style={{ border: '1px solid var(--accent-green)', padding: '20px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Análise da IA</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>{resumoIA}</p>
                </div>
              )}

              {/* Teses como lista simples */}
              {!analisando && (
                <>
                  <div>
                    <h3 className="form-section-title" style={{ marginBottom: '4px' }}>Teses Identificadas</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {tesesSelecionadasCount > 0
                        ? `${tesesSelecionadasCount} tese${tesesSelecionadasCount > 1 ? 's' : ''} selecionada${tesesSelecionadasCount > 1 ? 's' : ''} para a petição. Clique para adicionar ou remover.`
                        : 'Nenhuma tese identificada. Selecione manualmente abaixo.'}
                    </p>
                  </div>

                  <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    {Object.entries(TESE_LABELS).map(([key, label], idx) => {
                      const isChecked = formData.teses[key as keyof typeof formData.teses];
                      const justificativa = justificativas[key];
                      return (
                        <div
                          key={key}
                          onClick={() => handleTeseChange(key as keyof typeof formData.teses)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            padding: '14px 20px',
                            cursor: 'pointer',
                            borderBottom: idx < Object.keys(TESE_LABELS).length - 1 ? '1px solid var(--border-color)' : 'none',
                            background: isChecked ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                            border: isChecked ? '2px solid var(--accent-blue)' : '2px solid var(--border-color)',
                            background: isChecked ? 'var(--accent-blue)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '12px', fontWeight: 700,
                          }}>
                            {isChecked ? '✓' : ''}
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>{label}</span>
                            {justificativa && (
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {justificativa}
                              </p>
                            )}
                          </div>
                          {isChecked && tesesAnalisadas && (
                            <span style={{ fontSize: '11px', background: 'var(--accent-blue)', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>Sugerida pela IA</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Messages */}
              {successMessage && (
                <div style={{ padding: '14px 20px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div style={{ padding: '14px 20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--accent-red)' }}>{errorMessage}</span>
                </div>
              )}

              {/* Preview */}
              {!analisando && (
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontWeight: 600 }}>Pré-visualização</h4>
                    {peticaoTexto && (
                      <button className="btn btn-sm btn-secondary" onClick={handleCopiarTexto}>
                        {copiado ? 'Copiado!' : 'Copiar Texto'}
                      </button>
                    )}
                  </div>
                  <div style={{
                    minHeight: '100px', padding: '20px', borderRadius: '8px',
                    background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                  }}>
                    {loading ? (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: 'var(--accent-blue)', fontWeight: 600, marginBottom: '8px' }}>Gerando petição com Gemini AI...</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Isso pode levar até 30 segundos</p>
                      </div>
                    ) : peticaoTexto ? (
                      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-primary)', fontSize: '13.5px', lineHeight: 1.7 }}>
                        {peticaoTexto}
                      </pre>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>
                        A petição aparecerá aqui após a geração.
                      </p>
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
            Anterior
          </button>

          {step < 3 ? (
            <button className="btn btn-primary" onClick={handleNext} style={{ padding: '10px 24px' }}>
              Próximo
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleGerarPeticao} disabled={loading || analisando}
              style={{
                padding: '12px 32px', fontSize: '15px', fontWeight: 700,
                opacity: (loading || analisando) ? 0.6 : 1,
                cursor: (loading || analisando) ? 'wait' : 'pointer',
              }}>
              {loading ? 'Gerando...' : 'Gerar Petição'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
