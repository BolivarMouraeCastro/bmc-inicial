'use client';

import React, { useState, useEffect } from 'react';

export default function Configuracoes() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [escritorio, setEscritorio] = useState({
    nome: 'BM&C Sociedade de Advogados',
    oab: '',
    endereco: '',
    cidade: '',
    telefone: '',
    email: '',
  });
  const [preferencias, setPreferencias] = useState({
    formato: 'PDF',
    numeracao: true,
    cabecalho: true,
    negrito: false,
    fonte: 'Arial',
    tamanhoFonte: '12',
  });
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const [modeloAtual, setModeloAtual] = useState<{nome: string, url: string} | null>(null);

  // Verificar se a API do Gemini está funcionando e carregar modelo
  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetch('/api/peticoes');
        if (res.ok) {
          setApiStatus('connected');
        } else {
          setApiStatus('error');
        }
      } catch {
        setApiStatus('error');
      }
    };
    
    const loadModelo = async () => {
      try {
        const res = await fetch('/api/modelo-peticao');
        const data = await res.json();
        if (data.modelo) {
          setModeloAtual(data.modelo);
        }
      } catch {}
    };

    checkApi();
    loadModelo();
  }, []);

  const handleEscritorioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEscritorio(prev => ({ ...prev, [name]: value }));
  };

  const handlePreferenciaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setPreferencias(prev => ({ ...prev, [name]: checked }));
    } else {
      setPreferencias(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="page-container">
      <div className="page-header mb-24">
        <h1 className="text-gradient">Configurações</h1>
        <p className="page-subtitle">Configure o sistema de geração de petições</p>
      </div>

      {/* Status da IA */}
      <div className="card mb-24" style={{ border: apiStatus === 'connected' ? '1px solid var(--accent-green)' : '1px solid var(--accent-red)' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: apiStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0
          }}>
            {apiStatus === 'loading' ? '⏳' : apiStatus === 'connected' ? '🤖' : '⚠️'}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
              Google Gemini AI
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
              Modelo: <strong>Gemini 2.5 Flash</strong> — Motor de geração de petições
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                background: apiStatus === 'connected' ? 'var(--accent-green)' : apiStatus === 'error' ? 'var(--accent-red)' : 'var(--accent-yellow)',
                animation: apiStatus === 'loading' ? 'pulse 1.5s infinite' : 'none'
              }} />
              <span style={{ fontSize: '13px', color: apiStatus === 'connected' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {apiStatus === 'loading' ? 'Verificando conexão...' : apiStatus === 'connected' ? 'Conectado e funcionando' : 'Não conectado — verifique a API Key'}
              </span>
            </div>
          </div>
          {apiStatus === 'error' && (
            <a
              href="https://vercel.com/bolivar-moura-e-castro-s-projects/bmc-inicial/settings/environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ whiteSpace: 'nowrap' }}
            >
              Configurar no Vercel
            </a>
          )}
        </div>
      </div>

      {/* Como configurar - só mostra se não estiver conectado */}
      {apiStatus === 'error' && (
      <div className="card mb-24">
        <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>🔑 Como configurar a API Key</h3>
        </div>
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span className="badge badge-info" style={{ minWidth: '28px', textAlign: 'center' }}>1</span>
              <div>
                <p style={{ fontSize: '14px' }}>Acesse o <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>Google AI Studio</a> e crie ou copie sua API Key</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span className="badge badge-info" style={{ minWidth: '28px', textAlign: 'center' }}>2</span>
              <div>
                <p style={{ fontSize: '14px' }}>Vá em <a href="https://vercel.com/bolivar-moura-e-castro-s-projects/bmc-inicial/settings/environment-variables" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>Vercel → Environment Variables</a></p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span className="badge badge-info" style={{ minWidth: '28px', textAlign: 'center' }}>3</span>
              <div>
                <p style={{ fontSize: '14px' }}>Adicione: <code style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '4px', fontSize: '13px' }}>GEMINI_API_KEY</code> = sua chave</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span className="badge badge-info" style={{ minWidth: '28px', textAlign: 'center' }}>4</span>
              <div>
                <p style={{ fontSize: '14px' }}>Clique em <strong>Redeploy</strong> para aplicar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        {/* Dados do Escritório */}
        <div className="card">
          <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>🏛️ Dados do Escritório</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px' }}>
            <div className="form-group">
              <label className="form-label">Nome do Escritório</label>
              <input className="form-input" type="text" name="nome" value={escritorio.nome} onChange={handleEscritorioChange} />
            </div>
            <div className="form-group">
              <label className="form-label">OAB Principal</label>
              <input className="form-input" type="text" name="oab" value={escritorio.oab} onChange={handleEscritorioChange} placeholder="Ex: OAB/SP 123.456" />
            </div>
            <div className="form-group">
              <label className="form-label">Endereço</label>
              <input className="form-input" type="text" name="endereco" value={escritorio.endereco} onChange={handleEscritorioChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Cidade/Estado</label>
              <input className="form-input" type="text" name="cidade" value={escritorio.cidade} onChange={handleEscritorioChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-input" type="text" name="telefone" value={escritorio.telefone} onChange={handleEscritorioChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="text" name="email" value={escritorio.email} onChange={handleEscritorioChange} />
            </div>
            <button className="btn btn-primary" onClick={() => showToast('✅ Dados do escritório salvos!')}>
              Salvar Dados
            </button>
          </div>
        </div>

        {/* Preferências de Petição */}
        <div className="card">
          <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>📄 Preferências de Petição</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px' }}>
            <div className="form-group">
              <label className="form-label">Formato Padrão</label>
              <select className="form-select" name="formato" value={preferencias.formato} onChange={handlePreferenciaChange}>
                <option>PDF</option>
                <option>DOCX</option>
                <option>TXT</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" className="checkbox-input" id="numeracao" name="numeracao" checked={preferencias.numeracao} onChange={handlePreferenciaChange} />
                <label htmlFor="numeracao" className="checkbox-label">Incluir numeração de páginas</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" className="checkbox-input" id="cabecalho" name="cabecalho" checked={preferencias.cabecalho} onChange={handlePreferenciaChange} />
                <label htmlFor="cabecalho" className="checkbox-label">Incluir cabeçalho do escritório</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" className="checkbox-input" id="negrito" name="negrito" checked={preferencias.negrito} onChange={handlePreferenciaChange} />
                <label htmlFor="negrito" className="checkbox-label">Negrito em nomes próprios</label>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Fonte</label>
              <select className="form-select" name="fonte" value={preferencias.fonte} onChange={handlePreferenciaChange}>
                <option>Arial</option>
                <option>Times New Roman</option>
                <option>Calibri</option>
                <option>Courier New</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tamanho da Fonte</label>
              <input className="form-input" type="number" name="tamanhoFonte" value={preferencias.tamanhoFonte} onChange={handlePreferenciaChange} min="8" max="16" />
            </div>
            <button className="btn btn-primary" onClick={() => showToast('✅ Preferências salvas!')}>
              Salvar Preferências
            </button>
          </div>
        </div>

        {/* Upload de Petição Modelo */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>📑 Petição Modelo Padrão</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Faça o upload de um arquivo Word (.doc ou .docx) com a formatação e logo do seu escritório. 
              A IA vai analisar a estrutura e o estilo deste arquivo para gerar todas as novas petições baseadas nele.
            </p>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <input 
                type="file" 
                id="upload-modelo" 
                accept=".doc,.docx,.pdf,.txt" 
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  showToast('⏳ Fazendo upload do modelo...');
                  const form = new FormData();
                  form.append('file', file);
                  
                  try {
                    const res = await fetch('/api/modelo-peticao', {
                      method: 'POST',
                      body: form
                    });
                    if (res.ok) {
                      showToast('✅ Modelo salvo! A IA usará este formato.');
                      window.location.reload();
                    } else {
                      showToast('❌ Erro ao salvar modelo.');
                    }
                  } catch (err) {
                    showToast('❌ Erro de conexão.');
                  }
                }}
              />
              <button 
                className="btn btn-primary" 
                onClick={() => document.getElementById('upload-modelo')?.click()}
              >
                Subir Novo Modelo
              </button>
              <button 
                className="btn btn-secondary"
                onClick={async () => {
                  if (confirm('Tem certeza que deseja remover o modelo padrão?')) {
                    await fetch('/api/modelo-peticao', { method: 'DELETE' });
                    showToast('✅ Modelo removido.');
                    window.location.reload();
                  }
                }}
              >
                Remover Modelo
              </button>
            </div>
            
            <div id="modelo-status" style={{ marginTop: '12px' }}>
              {modeloAtual ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-green)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '20px' }}>✅</span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-green)', margin: 0 }}>Modelo Ativo: {modeloAtual.nome}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Todas as petições serão geradas seguindo o padrão deste documento.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--bg-input)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '20px' }}>ℹ️</span>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Nenhum modelo padrão cadastrado. A IA usará a estrutura padrão do sistema.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          padding: '14px 24px', background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)', borderRadius: '8px',
          zIndex: 1000, boxShadow: 'var(--shadow)',
          fontSize: '14px'
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
