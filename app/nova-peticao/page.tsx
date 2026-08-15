'use client';

import React, { useState, useRef } from 'react';

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
    // Cliente
    nomeCliente: '',
    cpf: '',
    rg: '',
    orgaoExpedidor: '',
    pisPasep: '',
    ctps: '',
    serieCtps: '',
    dataNascimento: '',
    nacionalidade: 'brasileira',
    estadoCivil: 'Solteiro',
    profissao: '',
    nomeMae: '',
    // Endereço Cliente
    cepCliente: '',
    enderecoCliente: '',
    bairroCliente: '',
    cidadeCliente: '',
    estadoCliente: '',
    // Empresas Reclamadas
    empresas: [
      { tipo: 'PJ', razaoSocial: '', cnpjCpf: '', endereco: '', bairro: '', cidade: '', estado: '', cep: '' }
    ],
    // Contrato de Trabalho
    dataAdmissao: '',
    dataDemissao: '',
    tipoRescisao: 'Sem Justa Causa',
    ultimoSalario: '',
    cargo: '',
    setor: '',
    horarioEntrada: '',
    horarioSaida: '',
    intervalo: '',
    jornada: '',
    trabalhavaSabados: false,
    trabalhavaDomingos: false,
    // Vara e Advogado
    vara: '',
    cidadeVara: '',
    estadoVara: '',
    nomeAdvogado: '',
    oab: '',
    // Resumo da Entrevista
    resumoEntrevista: '',
    // Teses
    teses: {
      horasExtras: false,
      intervalo: false,
      fgts: false,
      decimoTerceiro: false,
      ferias: false,
      verbasRescisorias: false,
      danoMoral: false,
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [peticaoTexto, setPeticaoTexto] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiado, setCopiado] = useState(false);

  const handleNext = () => setStep(prev => Math.min(prev + 1, 3));
  const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEmpresaChange = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const newEmpresas = [...prev.empresas];
      newEmpresas[index] = { ...newEmpresas[index], [field]: value };
      return { ...prev, empresas: newEmpresas };
    });
  };

  const addEmpresa = () => {
    setFormData(prev => ({
      ...prev,
      empresas: [...prev.empresas, { tipo: 'PJ', razaoSocial: '', cnpjCpf: '', endereco: '', bairro: '', cidade: '', estado: '', cep: '' }]
    }));
  };

  const removeEmpresa = (index: number) => {
    setFormData(prev => ({
      ...prev,
      empresas: prev.empresas.filter((_, i) => i !== index)
    }));
  };

  const handleTeseChange = (teseKey: keyof typeof formData.teses) => {
    setFormData(prev => ({
      ...prev,
      teses: {
        ...prev.teses,
        [teseKey]: !prev.teses[teseKey]
      }
    }));
  };

  const handleGerarPeticao = async () => {
    if (!formData.nomeCliente) {
      setErrorMessage('Por favor, preencha o Nome do Cliente (no Passo 1) antes de gerar a petição.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Transform selected teses booleans into array of string labels
    const tesesSelecionadas = Object.entries(formData.teses)
      .filter(([_, checked]) => checked)
      .map(([key]) => TESE_LABELS[key]);

    const payload = {
      ...formData,
      teses: tesesSelecionadas,
    };

    try {
      const res = await fetch('/api/gerar-peticao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar petição.');
      }

      setPeticaoTexto(data.peticao || '');
      setSuccessMessage('Petição inicial gerada com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar a petição.';
      setErrorMessage(msg);
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-gradient">Nova Petição Inicial</h1>
        <p className="page-subtitle">Preencha os dados para gerar uma nova petição trabalhista</p>
      </div>

      <div className="wizard-container card mb-24">
        <div className="wizard-steps card-header flex gap-16">
          {[1, 2, 3].map(i => (
            <div key={i} className={`wizard-step flex gap-8 items-center ${step === i ? 'active font-bold text-blue-500' : 'text-gray-400'}`}>
              <div className={`wizard-step-circle badge ${step >= i ? 'badge-info' : 'bg-gray-700'}`}>{i}</div>
              <span className="wizard-step-label">
                {i === 1 ? 'Dados e Entrevista' : i === 2 ? 'Documentos' : 'Teses e Geração'}
              </span>
            </div>
          ))}
        </div>

        <div className="wizard-content card-body">
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

          {step === 2 && (
            <div className="flex flex-col gap-24">
              <h3 className="form-section-title">Anexar Documentos</h3>
              <p className="mb-16 text-gray-400">Arraste e solte os arquivos ou clique para selecionar.</p>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                onChange={(e) => {
                  if (e.target.files) {
                    setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                }}
                style={{ display: 'none' }}
              />

              <div
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) {
                    setUploadedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <span className="upload-icon">📄</span>
                <p className="upload-text">Arraste arquivos aqui ou <span style={{ color: 'var(--accent-blue)' }}>busque no computador</span></p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>PDF, JPG, PNG, DOC, DOCX, TXT (Max: 10MB)</p>
              </div>

              <div className="card p-16" style={{ background: 'var(--bg-secondary)' }}>
                <h4 className="mb-12" style={{ fontWeight: 600 }}>Documentos Comuns Sugeridos:</h4>
                <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                  {['CTPS', 'Holerites', 'Contrato de Trabalho', 'TRCT', 'Extrato FGTS', 'Atestados'].map(doc => (
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
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        className="btn btn-sm"
                        style={{ color: 'var(--accent-red)', fontSize: '12px' }}
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                      >
                        ✕ Remover
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: '24px' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Nenhum documento anexado ainda.</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-24">
              <h3 className="form-section-title mb-16">Teses e Pedidos</h3>
              <p className="mb-16 text-gray-400">Selecione as teses que farão parte da petição inicial.</p>
              
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                {Object.entries(TESE_LABELS).map(([key, label]) => (
                  <div key={key} className="checkbox-item flex items-center gap-8 p-12 card hover:border-blue-500 cursor-pointer" onClick={() => handleTeseChange(key as keyof typeof formData.teses)}>
                    <input 
                      type="checkbox" 
                      className="checkbox-input" 
                      checked={formData.teses[key as keyof typeof formData.teses]} 
                      onChange={() => {}} 
                    />
                    <label className="checkbox-label flex-1 cursor-pointer">{label}</label>
                  </div>
                ))}
              </div>

              {successMessage && (
                <div className="badge badge-success p-12 flex items-center justify-between gap-12 text-sm" style={{ width: '100%' }}>
                  <span>✨ {successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="badge badge-danger p-12 flex items-center justify-between gap-12 text-sm" style={{ width: '100%' }}>
                  <span>⚠️ {errorMessage}</span>
                </div>
              )}

              <div className="card p-16 mt-24 bg-gray-800">
                <div className="flex flex-between items-center mb-12">
                  <h4 className="font-bold text-green-400">Pronto para gerar</h4>
                  {peticaoTexto && (
                    <button className="btn btn-sm btn-secondary" onClick={handleCopiarTexto}>
                      {copiado ? '✓ Copiado!' : '📋 Copiar Texto'}
                    </button>
                  )}
                </div>
                <p className="text-gray-400 mb-16">Revise as informações se necessário e clique em Gerar Petição. O processo pode levar alguns segundos.</p>
                <div className="preview-area border border-gray-700 p-16 rounded mb-16" style={{ minHeight: '150px', background: '#111827' }}>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center p-24 text-blue-400 gap-12">
                      <div className="animate-spin text-2xl">⏳</div>
                      <span className="font-semibold">Gerando petição inicial com IA... Por favor aguarde.</span>
                    </div>
                  ) : peticaoTexto ? (
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#e8ecf4', fontSize: '13.5px', lineHeight: '1.6' }}>
                      {peticaoTexto}
                    </pre>
                  ) : (
                    <p className="text-gray-500 text-center italic mt-16">A pré-visualização da peça aparecerá aqui após a geração...</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="wizard-actions card-footer p-16 border-t border-gray-800 flex flex-between mt-24" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button 
            className="btn btn-secondary px-24 py-8 rounded" 
            onClick={handlePrev} 
            disabled={step === 1}
            style={{ opacity: step === 1 ? 0.5 : 1, cursor: step === 1 ? 'not-allowed' : 'pointer' }}
          >
            Anterior
          </button>
          
          {step < 3 ? (
            <button className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white px-24 py-8 rounded" onClick={handleNext}>
              Próximo
            </button>
          ) : (
            <button 
              className="btn btn-success bg-green-600 hover:bg-green-700 text-white px-24 py-8 rounded flex items-center gap-8" 
              onClick={handleGerarPeticao}
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
            >
              {loading ? '⏳ Gerando...' : '✨ Gerar Petição'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
