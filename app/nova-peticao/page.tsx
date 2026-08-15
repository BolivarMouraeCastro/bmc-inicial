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
  const [peticaoGerada, setPeticaoGerada] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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
    setPeticaoGerada(false);

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
      <head><meta charset="utf-8"><title>Petição Inicial - ${formData.nomeCliente}</title>
      <style>body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; margin: 2cm; }</style>
      </head><body>${peticaoTexto.replace(/\n/g, '<br>')}</body></html>
    `;

    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Peticao_${formData.nomeCliente.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tesesSelecionadasCount = Object.values(formData.teses).filter(Boolean).length;
  const tesesSelecionadasList = Object.entries(formData.teses)
    .filter(([, checked]) => checked)
    .map(([key]) => TESE_LABELS[key]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-gradient">Nova Petição Inicial</h1>
        <p className="page-subtitle">Preencha os dados para gerar uma nova petição trabalhista</p>
      </div>

      <div className="wizard-container card mb-24">
        <div className="wizard-steps card-header flex gap-16">
          {[1, 2, 3].map(i => (
            <div key={i} className="wizard-step flex gap-8 items-center" style={{ fontWeight: step === i ? 700 : 400, color: step === i ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
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
            <div className="form-section">
              <h3 className="form-section-title mb-12">Identificação do Cliente</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Informe o nome do cliente. Os demais dados serão extraídos pela IA a partir dos documentos.
              </p>
              <div className="form-group" style={{ maxWidth: '500px' }}>
                <label className="form-label">Nome Completo do Cliente *</label>
                <input className="form-input" type="text" name="nomeCliente" value={formData.nomeCliente} onChange={handleChange} placeholder="Ex: João da Silva Santos" />
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
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>+</span>
                <p>Arraste arquivos aqui ou <span style={{ color: 'var(--accent-blue)' }}>busque no computador</span></p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>PDF, DOC, DOCX, TXT (Max: 10MB)</p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="card p-16">
                  <h4 className="mb-12" style={{ fontWeight: 600 }}>Documentos Anexados ({uploadedFiles.length})</h4>
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < uploadedFiles.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                      <span style={{ fontSize: '14px' }}>{file.name} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({(file.size / 1024).toFixed(0)} KB)</span></span>
                      <button className="btn btn-sm" style={{ color: 'var(--accent-red)', fontSize: '12px' }}
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                      >Remover</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="flex flex-col gap-20">
              {/* Analisando */}
              {analisando && (
                <div className="card" style={{ border: '1px solid var(--accent-blue)', padding: '24px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Analisando documentos com IA...</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Identificando as teses adequadas ao caso.</p>
                </div>
              )}

              {/* Resumo da IA */}
              {!analisando && resumoIA && (
                <div className="card" style={{ border: '1px solid var(--accent-green)', padding: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Análise da IA</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>{resumoIA}</p>
                </div>
              )}

              {/* Teses - lista compacta */}
              {!analisando && (
                <div>
                  <h3 className="form-section-title" style={{ marginBottom: '8px' }}>Teses Identificadas ({tesesSelecionadasCount})</h3>

                  {tesesSelecionadasCount > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {tesesSelecionadasList.map((tese) => (
                        <li key={tese} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>&#10003;</span> {tese}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Nenhuma tese identificada.</p>
                  )}

                  {/* Adicionar/remover teses manualmente */}
                  <details style={{ marginTop: '12px' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '13px', color: 'var(--accent-blue)' }}>
                      Ajustar teses manualmente
                    </summary>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {Object.entries(TESE_LABELS).map(([key, label]) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', padding: '4px 0' }}>
                          <input
                            type="checkbox"
                            checked={formData.teses[key as keyof typeof formData.teses]}
                            onChange={() => handleTeseChange(key as keyof typeof formData.teses)}
                          />
                          {label}
                          {justificativas[key] && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '4px' }}>— {justificativas[key]}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Erro */}
              {errorMessage && (
                <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--accent-red)', fontSize: '14px' }}>{errorMessage}</span>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="card" style={{ padding: '32px', textAlign: 'center', border: '1px solid var(--accent-blue)' }}>
                  <p style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: '16px' }}>Gerando petição com Gemini AI...</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>Isso pode levar até 30 segundos.</p>
                </div>
              )}

              {/* Petição gerada */}
              {peticaoGerada && !loading && (
                <div className="card" style={{ padding: '32px', textAlign: 'center', border: '1px solid var(--accent-green)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-green)', marginBottom: '8px' }}>
                    Petição gerada com sucesso!
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                    Petição de {formData.nomeCliente} com {tesesSelecionadasCount} tese{tesesSelecionadasCount > 1 ? 's' : ''}.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={handleBaixarWord}
                    style={{ padding: '12px 32px', fontSize: '15px', fontWeight: 600 }}
                  >
                    Baixar como Word (.doc)
                  </button>
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
            !peticaoGerada && (
              <button className="btn btn-primary" onClick={handleGerarPeticao} disabled={loading || analisando}
                style={{
                  padding: '12px 32px', fontSize: '15px', fontWeight: 700,
                  opacity: (loading || analisando) ? 0.6 : 1,
                  cursor: (loading || analisando) ? 'wait' : 'pointer',
                }}>
                {loading ? 'Gerando...' : 'Gerar Petição'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
