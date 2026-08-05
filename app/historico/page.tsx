'use client';

import React, { useState, useEffect } from 'react';

interface Peticao {
  id: string;
  cliente: string;
  empresa: string;
  tipo: string;
  data: string;
  status: string;
  arquivoUrl: string;
  arquivoPathname?: string;
  metaUrl?: string;
}

export default function Historico() {
  const [peticoes, setPeticoes] = useState<Peticao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // State for modal viewing
  const [selectedPeticao, setSelectedPeticao] = useState<Peticao | null>(null);
  const [petitionContent, setPetitionContent] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // State for item being deleted
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPeticoes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/peticoes');
      if (res.ok) {
        const data = await res.json();
        setPeticoes(data.peticoes || []);
      } else {
        console.error('Erro ao buscar petições:', res.statusText);
      }
    } catch (error) {
      console.error('Erro de conexão ao buscar petições:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeticoes();
  }, []);

  const handleView = async (item: Peticao) => {
    setSelectedPeticao(item);
    setPetitionContent(null);
    setModalLoading(true);
    try {
      const res = await fetch(item.arquivoUrl);
      if (res.ok) {
        const text = await res.text();
        setPetitionContent(text);
      } else {
        setPetitionContent('Não foi possível carregar o texto da petição.');
      }
    } catch (err) {
      console.error('Erro ao carregar texto da petição:', err);
      setPetitionContent('Erro de conexão ao carregar o conteúdo.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDownload = (arquivoUrl: string) => {
    if (arquivoUrl) {
      window.open(arquivoUrl, '_blank');
    }
  };

  const handleDelete = async (item: Peticao) => {
    const confirmed = window.confirm(`Tem certeza de que deseja excluir a petição do cliente "${item.cliente}"?`);
    if (!confirmed) return;

    setDeletingId(item.id);
    try {
      const metaUrlParam = item.metaUrl || (item.arquivoUrl ? item.arquivoUrl.replace('/peticoes/', '/peticoes-meta/') + '.json' : '');
      const url = `/api/peticoes?arquivoUrl=${encodeURIComponent(item.arquivoUrl || '')}&metaUrl=${encodeURIComponent(metaUrlParam)}`;
      
      const res = await fetch(url, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPeticoes((prev) => prev.filter((p) => p.id !== item.id));
      } else {
        alert('Erro ao excluir a petição. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao excluir petição:', error);
      alert('Erro de conexão ao excluir a petição.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredHistory = peticoes.filter((item) => {
    const clienteMatch = item.cliente?.toLowerCase().includes(searchTerm.toLowerCase());
    const empresaMatch = item.empresa?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = clienteMatch || empresaMatch;
    
    const matchesStatus = statusFilter === 'Todas' || item.status === statusFilter;

    let matchesDate = true;
    if (startDate) {
      const itemDate = new Date(item.data).setHours(0, 0, 0, 0);
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      if (itemDate < start) matchesDate = false;
    }
    if (endDate) {
      const itemDate = new Date(item.data).setHours(23, 59, 59, 999);
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      if (itemDate > end) matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Concluída':
        return 'badge-success';
      case 'Rascunho':
        return 'badge-warning';
      case 'Enviada':
        return 'badge-info';
      default:
        return 'badge-info';
    }
  };

  const totalCount = peticoes.length;
  const concluidasCount = peticoes.filter((h) => h.status === 'Concluída').length;
  const rascunhosCount = peticoes.filter((h) => h.status === 'Rascunho').length;
  const enviadasCount = peticoes.filter((h) => h.status === 'Enviada').length;

  return (
    <div className="page-container">
      <div className="page-header mb-24">
        <h1 className="text-gradient">Histórico</h1>
        <p className="page-subtitle">Petições geradas anteriormente</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid mb-24">
        <div className="stat-card card">
          <div className="stat-icon purple">📑</div>
          <div>
            <div className="stat-value">{totalCount}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon green">✅</div>
          <div>
            <div className="stat-value">{concluidasCount}</div>
            <div className="stat-label">Concluídas</div>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon yellow">📝</div>
          <div>
            <div className="stat-value">{rascunhosCount}</div>
            <div className="stat-label">Rascunhos</div>
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-icon blue">📤</div>
          <div>
            <div className="stat-value">{enviadasCount}</div>
            <div className="stat-label">Enviadas</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar card p-16 mb-24 flex gap-16 flex-wrap">
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            className="search-input form-input"
            placeholder="🔍 Buscar por cliente ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-8">
          <label className="text-sm form-label mb-0" style={{ textTransform: 'none' }}>Status:</label>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="Todas">Todas</option>
            <option value="Concluída">Concluída</option>
            <option value="Rascunho">Rascunho</option>
            <option value="Enviada">Enviada</option>
          </select>
        </div>
        <div className="flex items-center gap-8">
          <label className="text-sm form-label mb-0" style={{ textTransform: 'none' }}>Período:</label>
          <input
            type="date"
            className="form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: 'auto' }}
          />
          <span style={{ color: 'var(--text-muted)' }}>até</span>
          <input
            type="date"
            className="form-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: 'auto' }}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="card p-48 text-center mb-24">
          <div className="empty-state-icon mb-16">⏳</div>
          <h3 className="empty-state-title">Carregando histórico...</h3>
          <p className="empty-state-text">Buscando as petições registradas no sistema.</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        /* Empty State */
        <div className="empty-state card mb-24">
          <div className="empty-state-icon">📂</div>
          <h3 className="empty-state-title">Nenhum histórico encontrado</h3>
          <p className="empty-state-text">Ajuste os filtros de busca ou crie uma nova petição.</p>
        </div>
      ) : (
        /* Petitions Table */
        <div className="card overflow-hidden">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Cliente / Empresa</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Tipo de Petição</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Data</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.cliente || 'N/I'}</div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{item.empresa || 'N/I'}</div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '13.5px' }}>{item.tipo}</td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                        {item.status || 'Concluída'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleView(item)}
                        >
                          Visualizar
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleDownload(item.arquivoUrl)}
                        >
                          Baixar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item)}
                        >
                          {deletingId === item.id ? 'Excluindo...' : 'Excluir'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for viewing petition text */}
      {selectedPeticao && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setSelectedPeticao(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '850px',
              width: '100%',
              maxHeight: '85vh',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="card-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div>
                <h3 className="card-title" style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
                  Petição - {selectedPeticao.cliente}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {selectedPeticao.tipo} • {selectedPeticao.data ? new Date(selectedPeticao.data).toLocaleDateString('pt-BR') : ''}
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedPeticao(null)}
              >
                ✕ Fechar
              </button>
            </div>

            <div
              className="card-body"
              style={{
                padding: '20px',
                overflowY: 'auto',
                flex: 1,
                backgroundColor: 'var(--bg-input)',
              }}
            >
              {modalLoading ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
                  Carregando conteúdo da petição...
                </div>
              ) : (
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'Consolas, Monaco, monospace, sans-serif',
                    fontSize: '13.5px',
                    lineHeight: '1.6',
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  {petitionContent}
                </div>
              )}
            </div>

            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleDownload(selectedPeticao.arquivoUrl)}
              >
                📥 Baixar Arquivo
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedPeticao(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
