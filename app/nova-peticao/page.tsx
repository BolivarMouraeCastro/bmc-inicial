'use client';

import React, { useState } from 'react';

export default function NovaPeticao() {
  const [step, setStep] = useState(1);
  const [empresas, setEmpresas] = useState([
    { razaoSocial: '', cnpj: '', endereco: '', bairro: '', cidade: '', estado: '', cep: '', tipo: 'PJ' }
  ]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [teses, setTeses] = useState({
    horasExtras: false,
    intervalo: false,
    fgts: false,
    decimoTerceiro: false,
    ferias: false,
    verbasRescisorias: false,
    danoMoral: false,
  });

  const handleNext = () => setStep(prev => Math.min(prev + 1, 3));
  const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

  const addEmpresa = () => {
    setEmpresas([...empresas, { razaoSocial: '', cnpj: '', endereco: '', bairro: '', cidade: '', estado: '', cep: '', tipo: 'PJ' }]);
  };

  const removeEmpresa = (index: number) => {
    setEmpresas(empresas.filter((_, i) => i !== index));
  };

  const handleTeseChange = (tese: keyof typeof teses) => {
    setTeses(prev => ({ ...prev, [tese]: !prev[tese] }));
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
                  <div className="form-group"><label className="form-label">Nome Completo*</label><input className="form-input" type="text" placeholder="Ex: João da Silva" /></div>
                  <div className="form-group"><label className="form-label">CPF*</label><input className="form-input" type="text" placeholder="000.000.000-00" /></div>
                  <div className="form-group"><label className="form-label">RG</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">Órgão Expedidor</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">PIS/PASEP</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">CTPS</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">Série CTPS</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">Data de Nascimento</label><input className="form-input" type="date" /></div>
                  <div className="form-group"><label className="form-label">Nacionalidade</label><input className="form-input" type="text" defaultValue="brasileira" /></div>
                  <div className="form-group">
                    <label className="form-label">Estado Civil</label>
                    <select className="form-select">
                      <option>Solteiro</option><option>Casado</option><option>Divorciado</option><option>Viúvo</option><option>União Estável</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Profissão</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">Nome da Mãe</label><input className="form-input" type="text" /></div>
                </div>
                
                <h4 className="mt-16 mb-8">Endereço</h4>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group"><label className="form-label">CEP</label><input className="form-input" type="text" /></div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Endereço</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">Bairro</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">Cidade</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">Estado</label><input className="form-input" type="text" /></div>
                </div>
              </div>

              {/* Empresas Reclamadas */}
              <div className="form-section">
                <div className="flex flex-between mb-12">
                  <h3 className="form-section-title">🏢 Dados da(s) Empresa(s) Reclamada(s)</h3>
                  <button className="btn btn-sm btn-secondary" onClick={addEmpresa}>➕ Adicionar Empresa</button>
                </div>
                {empresas.map((emp, idx) => (
                  <div key={idx} className="card p-16 mb-16 relative">
                    {idx > 0 && <button className="btn btn-sm btn-danger" style={{ position: 'absolute', top: 8, right: 8 }} onClick={() => removeEmpresa(idx)}>Remover</button>}
                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <div className="form-group"><label className="form-label">Tipo</label><select className="form-select"><option>PJ</option><option>PF</option></select></div>
                      <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Razão Social/Nome*</label><input className="form-input" type="text" /></div>
                      <div className="form-group"><label className="form-label">CNPJ/CPF*</label><input className="form-input" type="text" /></div>
                      <div className="form-group"><label className="form-label">CEP</label><input className="form-input" type="text" /></div>
                      <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Endereço</label><input className="form-input" type="text" /></div>
                      <div className="form-group"><label className="form-label">Bairro</label><input className="form-input" type="text" /></div>
                      <div className="form-group"><label className="form-label">Cidade</label><input className="form-input" type="text" /></div>
                      <div className="form-group"><label className="form-label">Estado</label><input className="form-input" type="text" /></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contrato de Trabalho */}
              <div className="form-section">
                <h3 className="form-section-title mb-12">📋 Dados do Contrato de Trabalho</h3>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group"><label className="form-label">Data Admissão*</label><input className="form-input" type="date" /></div>
                  <div className="form-group"><label className="form-label">Data Demissão</label><input className="form-input" type="date" /></div>
                  <div className="form-group">
                    <label className="form-label">Tipo Rescisão</label>
                    <select className="form-select">
                      <option>Sem Justa Causa</option><option>Justa Causa</option><option>Pedido de Demissão</option><option>Rescisão Indireta</option><option>Acordo</option><option>Término de Contrato</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Último Salário</label><input className="form-input" type="text" placeholder="R$ 0,00" /></div>
                  <div className="form-group"><label className="form-label">Cargo</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">Setor</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">Horário Entrada</label><input className="form-input" type="time" /></div>
                  <div className="form-group"><label className="form-label">Horário Saída</label><input className="form-input" type="time" /></div>
                  <div className="form-group"><label className="form-label">Intervalo</label><input className="form-input" type="text" placeholder="Ex: 1 hora" /></div>
                  <div className="form-group"><label className="form-label">Jornada</label><input className="form-input" type="text" placeholder="Ex: 6x1" /></div>
                </div>
                <div className="flex gap-16 mt-16">
                  <div className="checkbox-item flex items-center gap-8">
                    <input type="checkbox" className="checkbox-input" id="sabados" />
                    <label htmlFor="sabados" className="checkbox-label">Trabalhava aos sábados</label>
                  </div>
                  <div className="checkbox-item flex items-center gap-8">
                    <input type="checkbox" className="checkbox-input" id="domingos" />
                    <label htmlFor="domingos" className="checkbox-label">Trabalhava aos domingos</label>
                  </div>
                </div>
              </div>

              {/* Vara e Advogado */}
              <div className="form-section">
                <h3 className="form-section-title mb-12">⚖️ Vara e Advogado</h3>
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group"><label className="form-label">Vara do Trabalho</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">Cidade da Vara</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">Estado da Vara</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">Nome do Advogado</label><input className="form-input" type="text" /></div>
                  <div className="form-group"><label className="form-label">OAB</label><input className="form-input" type="text" /></div>
                </div>
              </div>

              {/* Resumo da Entrevista */}
              <div className="form-section">
                <h3 className="form-section-title mb-12">🎙️ Resumo da Entrevista</h3>
                <div className="form-group">
                  <textarea className="form-textarea" rows={6} placeholder="Digite os principais pontos narrados pelo cliente..." style={{ width: '100%', padding: '12px' }}></textarea>
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
                {Object.entries({
                  horasExtras: 'Horas Extras',
                  intervalo: 'Intervalo Intrajornada',
                  fgts: 'FGTS (Diferenças/Multa)',
                  decimoTerceiro: '13º Salário',
                  ferias: 'Férias (Vencidas/Proporcionais)',
                  verbasRescisorias: 'Verbas Rescisórias',
                  danoMoral: 'Dano Moral',
                }).map(([key, label]) => (
                  <div key={key} className="checkbox-item flex items-center gap-8 p-12 card hover:border-blue-500 cursor-pointer" onClick={() => handleTeseChange(key as keyof typeof teses)}>
                    <input 
                      type="checkbox" 
                      className="checkbox-input" 
                      checked={teses[key as keyof typeof teses]} 
                      onChange={() => {}} 
                    />
                    <label className="checkbox-label flex-1 cursor-pointer">{label}</label>
                  </div>
                ))}
              </div>

              <div className="card p-16 mt-24 bg-gray-800">
                <h4 className="mb-12 font-bold text-green-400">Pronto para gerar</h4>
                <p className="text-gray-400 mb-16">Revise as informações se necessário e clique em Gerar Petição. O processo pode levar alguns segundos.</p>
                <div className="preview-area border border-gray-700 p-16 rounded mb-16" style={{ minHeight: '150px', background: '#111827' }}>
                  <p className="text-gray-500 text-center italic mt-16">A pré-visualização da peça aparecerá aqui após a geração...</p>
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
            <button className="btn btn-success bg-green-600 hover:bg-green-700 text-white px-24 py-8 rounded">
              ✨ Gerar Petição
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
