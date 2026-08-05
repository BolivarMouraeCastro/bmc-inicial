'use client';

import React, { useState } from 'react';

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
    if (!formData.nomeCliente || !formData.cpf) {
      setErrorMessage('Por favor, preencha o Nome Completo e o CPF do Reclamante (no Passo 1) antes de gerar a petição.');
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
              {/* Dados do Cliente */}
              <div className="form-section">
                <h3 className="form-section-title mb-12">👤 Dados do Cliente (Reclamante)</h3>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Nome Completo*</label>
                    <input className="form-input" type="text" name="nomeCliente" value={formData.nomeCliente} onChange={handleChange} placeholder="Ex: João da Silva" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CPF*</label>
                    <input className="form-input" type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">RG</label>
                    <input className="form-input" type="text" name="rg" value={formData.rg} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Órgão Expedidor</label>
                    <input className="form-input" type="text" name="orgaoExpedidor" value={formData.orgaoExpedidor} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PIS/PASEP</label>
                    <input className="form-input" type="text" name="pisPasep" value={formData.pisPasep} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CTPS</label>
                    <input className="form-input" type="text" name="ctps" value={formData.ctps} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Série CTPS</label>
                    <input className="form-input" type="text" name="serieCtps" value={formData.serieCtps} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data de Nascimento</label>
                    <input className="form-input" type="date" name="dataNascimento" value={formData.dataNascimento} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nacionalidade</label>
                    <input className="form-input" type="text" name="nacionalidade" value={formData.nacionalidade} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado Civil</label>
                    <select className="form-select" name="estadoCivil" value={formData.estadoCivil} onChange={handleChange}>
                      <option>Solteiro</option>
                      <option>Casado</option>
                      <option>Divorciado</option>
                      <option>Viúvo</option>
                      <option>União Estável</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Profissão</label>
                    <input className="form-input" type="text" name="profissao" value={formData.profissao} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nome da Mãe</label>
                    <input className="form-input" type="text" name="nomeMae" value={formData.nomeMae} onChange={handleChange} />
                  </div>
                </div>
                
                <h4 className="mt-16 mb-8">Endereço</h4>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">CEP</label>
                    <input className="form-input" type="text" name="cepCliente" value={formData.cepCliente} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Endereço</label>
                    <input className="form-input" type="text" name="enderecoCliente" value={formData.enderecoCliente} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bairro</label>
                    <input className="form-input" type="text" name="bairroCliente" value={formData.bairroCliente} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cidade</label>
                    <input className="form-input" type="text" name="cidadeCliente" value={formData.cidadeCliente} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <input className="form-input" type="text" name="estadoCliente" value={formData.estadoCliente} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* Empresas Reclamadas */}
              <div className="form-section">
                <div className="flex flex-between mb-12">
                  <h3 className="form-section-title">🏢 Dados da(s) Empresa(s) Reclamada(s)</h3>
                  <button className="btn btn-sm btn-secondary" onClick={addEmpresa}>➕ Adicionar Empresa</button>
                </div>
                {formData.empresas.map((emp, idx) => (
                  <div key={idx} className="card p-16 mb-16 relative">
                    {idx > 0 && (
                      <button className="btn btn-sm btn-danger" style={{ position: 'absolute', top: 8, right: 8 }} onClick={() => removeEmpresa(idx)}>
                        Remover
                      </button>
                    )}
                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">Tipo</label>
                        <select className="form-select" value={emp.tipo} onChange={e => handleEmpresaChange(idx, 'tipo', e.target.value)}>
                          <option>PJ</option>
                          <option>PF</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Razão Social/Nome*</label>
                        <input className="form-input" type="text" value={emp.razaoSocial} onChange={e => handleEmpresaChange(idx, 'razaoSocial', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">CNPJ/CPF*</label>
                        <input className="form-input" type="text" value={emp.cnpjCpf} onChange={e => handleEmpresaChange(idx, 'cnpjCpf', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">CEP</label>
                        <input className="form-input" type="text" value={emp.cep} onChange={e => handleEmpresaChange(idx, 'cep', e.target.value)} />
                      </div>
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Endereço</label>
                        <input className="form-input" type="text" value={emp.endereco} onChange={e => handleEmpresaChange(idx, 'endereco', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Bairro</label>
                        <input className="form-input" type="text" value={emp.bairro} onChange={e => handleEmpresaChange(idx, 'bairro', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Cidade</label>
                        <input className="form-input" type="text" value={emp.cidade} onChange={e => handleEmpresaChange(idx, 'cidade', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Estado</label>
                        <input className="form-input" type="text" value={emp.estado} onChange={e => handleEmpresaChange(idx, 'estado', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contrato de Trabalho */}
              <div className="form-section">
                <h3 className="form-section-title mb-12">📋 Dados do Contrato de Trabalho</h3>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Data Admissão*</label>
                    <input className="form-input" type="date" name="dataAdmissao" value={formData.dataAdmissao} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data Demissão</label>
                    <input className="form-input" type="date" name="dataDemissao" value={formData.dataDemissao} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo Rescisão</label>
                    <select className="form-select" name="tipoRescisao" value={formData.tipoRescisao} onChange={handleChange}>
                      <option>Sem Justa Causa</option>
                      <option>Justa Causa</option>
                      <option>Pedido de Demissão</option>
                      <option>Rescisão Indireta</option>
                      <option>Acordo</option>
                      <option>Término de Contrato</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Último Salário</label>
                    <input className="form-input" type="text" name="ultimoSalario" value={formData.ultimoSalario} onChange={handleChange} placeholder="R$ 0,00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cargo</label>
                    <input className="form-input" type="text" name="cargo" value={formData.cargo} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Setor</label>
                    <input className="form-input" type="text" name="setor" value={formData.setor} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Horário Entrada</label>
                    <input className="form-input" type="time" name="horarioEntrada" value={formData.horarioEntrada} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Horário Saída</label>
                    <input className="form-input" type="time" name="horarioSaida" value={formData.horarioSaida} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Intervalo</label>
                    <input className="form-input" type="text" name="intervalo" value={formData.intervalo} onChange={handleChange} placeholder="Ex: 1 hora" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jornada</label>
                    <input className="form-input" type="text" name="jornada" value={formData.jornada} onChange={handleChange} placeholder="Ex: 6x1" />
                  </div>
                </div>
                <div className="flex gap-16 mt-16">
                  <div className="checkbox-item flex items-center gap-8">
                    <input type="checkbox" className="checkbox-input" id="sabados" name="trabalhavaSabados" checked={formData.trabalhavaSabados} onChange={handleChange} />
                    <label htmlFor="sabados" className="checkbox-label">Trabalhava aos sábados</label>
                  </div>
                  <div className="checkbox-item flex items-center gap-8">
                    <input type="checkbox" className="checkbox-input" id="domingos" name="trabalhavaDomingos" checked={formData.trabalhavaDomingos} onChange={handleChange} />
                    <label htmlFor="domingos" className="checkbox-label">Trabalhava aos domingos</label>
                  </div>
                </div>
              </div>

              {/* Vara e Advogado */}
              <div className="form-section">
                <h3 className="form-section-title mb-12">⚖️ Vara e Advogado</h3>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Vara do Trabalho</label>
                    <input className="form-input" type="text" name="vara" value={formData.vara} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cidade da Vara</label>
                    <input className="form-input" type="text" name="cidadeVara" value={formData.cidadeVara} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado da Vara</label>
                    <input className="form-input" type="text" name="estadoVara" value={formData.estadoVara} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nome do Advogado</label>
                    <input className="form-input" type="text" name="nomeAdvogado" value={formData.nomeAdvogado} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">OAB</label>
                    <input className="form-input" type="text" name="oab" value={formData.oab} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* Resumo da Entrevista */}
              <div className="form-section">
                <h3 className="form-section-title mb-12">🎙️ Resumo da Entrevista</h3>
                <div className="form-group">
                  <textarea className="form-textarea" rows={6} name="resumoEntrevista" value={formData.resumoEntrevista} onChange={handleChange} placeholder="Digite os principais pontos narrados pelo cliente..." style={{ width: '100%', padding: '12px' }}></textarea>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-24">
              <h3 className="form-section-title">Anexar Documentos</h3>
              <p className="mb-16 text-gray-400">Arraste e solte os arquivos ou clique para selecionar.</p>
              
              <div className="upload-area p-24 border-dashed border-2 border-gray-600 rounded text-center mb-24 cursor-pointer hover:border-blue-500">
                <span className="text-4xl mb-8 block">📄</span>
                <p>Arraste arquivos aqui ou <span className="text-blue-500">busque no computador</span></p>
                <p className="text-sm text-gray-500 mt-8">PDF, JPG, PNG (Max: 10MB)</p>
              </div>

              <div className="card bg-gray-800 p-16">
                <h4 className="mb-12 font-bold">Documentos Comuns Sugeridos:</h4>
                <ul className="flex flex-wrap gap-8">
                  {['CTPS', 'Holerites', 'Contrato de Trabalho', 'TRCT', 'Extrato FGTS', 'Atestados'].map(doc => (
                    <li key={doc} className="badge bg-gray-700">{doc}</li>
                  ))}
                </ul>
              </div>

              {uploadedFiles.length === 0 && (
                <div className="empty-state mt-24 text-center">
                  <p className="empty-state-text text-gray-500">Nenhum documento anexado ainda.</p>
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
