'use client';

import { useState } from 'react';

export default function ConfiguracoesPage() {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelo, setModelo] = useState('GPT-4o');
  const [temperatura, setTemperatura] = useState(0.3);

  const [nomeEscritorio, setNomeEscritorio] = useState('BM&C Sociedade de Advogados');
  const [oab, setOab] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');

  const [formatoPadrao, setFormatoPadrao] = useState('PDF');
  const [numeracaoPaginas, setNumeracaoPaginas] = useState(true);
  const [cabecalho, setCabecalho] = useState(true);
  const [negrito, setNegrito] = useState(true);
  const [fonte, setFonte] = useState('Arial');
  const [tamanhoFonte, setTamanhoFonte] = useState(12);

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSaveApi = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Configurações de API salvas com sucesso!');
  };

  const handleSaveDados = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Dados do escritório salvos com sucesso!');
  };

  const handleSavePrefs = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Preferências de petição salvas com sucesso!');
  };

  return (
    <div className="page-container relative">
      <div className="page-header">
        <h1 className="text-gradient">Configurações</h1>
        <p className="page-subtitle">Configure o sistema de geração de petições</p>
      </div>

      <div className="flex flex-col gap-24">
        {/* Configurações da API */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Configurações da API</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSaveApi} className="form-section">
              <div className="form-group mb-12">
                <label className="form-label">OpenAI API Key</label>
                <div className="flex gap-8">
                  <input 
                    type={showApiKey ? "text" : "password"} 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="form-input flex-1" 
                    placeholder="sk-..."
                  />
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="btn btn-secondary">
                    {showApiKey ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
              
              <div className="form-grid mb-16">
                <div className="form-group">
                  <label className="form-label">Modelo</label>
                  <select value={modelo} onChange={(e) => setModelo(e.target.value)} className="form-select">
                    <option value="GPT-4o">GPT-4o</option>
                    <option value="GPT-4">GPT-4</option>
                    <option value="GPT-3.5-turbo">GPT-3.5-turbo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Temperatura</label>
                  <input 
                    type="number" 
                    min="0" max="1" step="0.1" 
                    value={temperatura}
                    onChange={(e) => setTemperatura(parseFloat(e.target.value))}
                    className="form-input" 
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Salvar Configurações</button>
            </form>
          </div>
        </div>

        {/* Dados do Escritório */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Dados do Escritório</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSaveDados} className="form-section">
              <div className="form-group mb-12">
                <label className="form-label">Nome do Escritório</label>
                <input type="text" value={nomeEscritorio} onChange={e => setNomeEscritorio(e.target.value)} className="form-input" />
              </div>
              <div className="form-group mb-12">
                <label className="form-label">OAB Principal</label>
                <input type="text" value={oab} onChange={e => setOab(e.target.value)} className="form-input" />
              </div>
              <div className="form-grid mb-12">
                <div className="form-group">
                  <label className="form-label">Endereço do Escritório</label>
                  <input type="text" value={endereco} onChange={e => setEndereco(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Cidade/Estado</label>
                  <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} className="form-input" />
                </div>
              </div>
              <div className="form-grid mb-16">
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Salvar Dados</button>
            </form>
          </div>
        </div>

        {/* Preferências de Petição */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Preferências de Petição</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSavePrefs} className="form-section">
              <div className="form-group mb-12">
                <label className="form-label">Formato Padrão</label>
                <select value={formatoPadrao} onChange={e => setFormatoPadrao(e.target.value)} className="form-select">
                  <option value="DOCX">DOCX</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-12 mb-16">
                <div className="checkbox-item flex items-center gap-8">
                  <input type="checkbox" id="numPaginas" checked={numeracaoPaginas} onChange={e => setNumeracaoPaginas(e.target.checked)} className="checkbox-input" />
                  <label htmlFor="numPaginas" className="checkbox-label">Incluir numeração de páginas</label>
                </div>
                <div className="checkbox-item flex items-center gap-8">
                  <input type="checkbox" id="cabecalho" checked={cabecalho} onChange={e => setCabecalho(e.target.checked)} className="checkbox-input" />
                  <label htmlFor="cabecalho" className="checkbox-label">Incluir cabeçalho do escritório</label>
                </div>
                <div className="checkbox-item flex items-center gap-8">
                  <input type="checkbox" id="negrito" checked={negrito} onChange={e => setNegrito(e.target.checked)} className="checkbox-input" />
                  <label htmlFor="negrito" className="checkbox-label">Negrito em nomes próprios</label>
                </div>
              </div>

              <div className="form-grid mb-16">
                <div className="form-group">
                  <label className="form-label">Fonte</label>
                  <select value={fonte} onChange={e => setFonte(e.target.value)} className="form-select">
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Arial">Arial</option>
                    <option value="Calibri">Calibri</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tamanho da fonte</label>
                  <input type="number" value={tamanhoFonte} onChange={e => setTamanhoFonte(parseInt(e.target.value))} className="form-input" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Salvar Preferências</button>
            </form>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '16px 24px', background: '#4CAF50', color: '#fff', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
