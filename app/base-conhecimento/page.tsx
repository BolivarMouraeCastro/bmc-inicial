'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Documento {
  url: string;
  pathname: string;
  nome: string;
  tamanho: number;
  categoria: string;
  criadoEm: string;
}

const CATEGORIAS = ['Todos', 'Modelo', 'Tese', 'Jurisprudência', 'Trecho', 'Instrução', 'Iniciais por Humanos', 'CCT'];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getIconForFile(nome: string) {
  const ext = nome.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return '📕';
    case 'doc': case 'docx': return '📘';
    case 'txt': return '📄';
    default: return '📎';
  }
}

export default function BaseConhecimento() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos');
  const [categoriaUpload, setCategoriaUpload] = useState('Iniciais por Humanos');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const carregarDocumentos = useCallback(async () => {
    try {
      const res = await fetch('/api/upload');
      const data = await res.json();
      setDocumentos(data.documentos || []);
    } catch {
      console.error('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDocumentos();
  }, [carregarDocumentos]);

  const handleUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    let sucesso = 0;
    let erros = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Enviando ${i + 1} de ${files.length}: ${file.name}`);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('categoria', categoriaUpload);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          sucesso++;
        } else {
          erros++;
        }
      } catch {
        erros++;
      }
    }

    setUploading(false);
    setUploadProgress('');

    if (sucesso > 0) {
      showToast(`✅ ${sucesso} arquivo(s) enviado(s) com sucesso!`);
      carregarDocumentos();
    }
    if (erros > 0) {
      showToast(`❌ ${erros} arquivo(s) falharam no envio.`);
    }
  };

  const handleDelete = async (doc: Documento) => {
    if (!confirm(`Excluir "${doc.nome}"?`)) return;

    try {
      const res = await fetch(`/api/upload/delete?url=${encodeURIComponent(doc.url)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('Arquivo excluído com sucesso');
        carregarDocumentos();
      }
    } catch {
      showToast('Erro ao excluir arquivo');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedDocs.size} arquivo(s) selecionado(s)?`)) return;

    setIsDeletingBulk(true);
    let sucesso = 0;
    
    // Create an array of selected document URLs
    const urlsToDelete = Array.from(selectedDocs);
    
    for (const url of urlsToDelete) {
      try {
        const res = await fetch(`/api/upload/delete?url=${encodeURIComponent(url)}`, {
          method: 'DELETE',
        });
        if (res.ok) sucesso++;
      } catch {
        console.error('Erro ao excluir', url);
      }
    }

    setIsDeletingBulk(false);
    setSelectedDocs(new Set());
    showToast(`✅ ${sucesso} arquivo(s) excluído(s) com sucesso!`);
    carregarDocumentos();
  };

  const toggleSelect = (url: string) => {
    const newSet = new Set(selectedDocs);
    if (newSet.has(url)) {
      newSet.delete(url);
    } else {
      newSet.add(url);
    }
    setSelectedDocs(newSet);
  };

  const toggleSelectAll = (filteredDocs: Documento[]) => {
    if (selectedDocs.size === filteredDocs.length && filteredDocs.length > 0) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocs.map(d => d.url)));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUpload(e.target.files);
    }
  };

  const documentosFiltrados = documentos.filter(doc => {
    const matchCategoria = categoriaFiltro === 'Todos' || doc.categoria === categoriaFiltro;
    const matchBusca = doc.nome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategoria && matchBusca;
  });

  const contPorCategoria = (cat: string) => documentos.filter(d => d.categoria === cat).length;

  return (
    <div className="page-container relative">
      <div className="page-header flex flex-between items-center mb-24" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient">Base de Conhecimento</h1>
          <p className="page-subtitle text-gray-400">Modelos, teses, jurisprudências e trechos para enriquecer as petições</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="card mb-24">
        <div className="card-body">
          <div className="flex gap-16 items-center mb-16" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Classificar arquivo como:</label>
            <select
              className="form-select"
              value={categoriaUpload}
              onChange={e => setCategoriaUpload(e.target.value)}
              style={{ maxWidth: '250px' }}
            >
              {CATEGORIAS.filter(c => c !== 'Todos').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div
            className={`upload-area ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            style={dragOver ? { borderColor: 'var(--accent-blue)', background: 'var(--accent-blue-light)' } : {}}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {uploading ? (
              <>
                <div className="upload-icon">⏳</div>
                <p className="upload-text">{uploadProgress}</p>
                <div style={{ marginTop: '12px', width: '200px', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden', margin: '12px auto 0' }}>
                  <div style={{ width: '60%', height: '100%', background: 'var(--accent-blue)', borderRadius: '2px', animation: 'shimmer 1.5s infinite' }} />
                </div>
              </>
            ) : (
              <>
                <span className="upload-icon">📄</span>
                <p className="upload-text">Arraste arquivos ou clique para fazer upload</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  PDF, DOC, DOCX, TXT — você pode arrastar vários arquivos de uma vez
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filtros e Seleção */}
      <div className="filter-bar mb-24" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="search-input form-input"
            placeholder="🔍 Buscar na base de conhecimento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ maxWidth: '350px' }}
          />
          <div className="flex gap-8" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {CATEGORIAS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaFiltro(cat)}
                className={`btn btn-sm ${categoriaFiltro === cat ? 'btn-primary' : 'btn-secondary'}`}
              >
                {cat} {cat !== 'Todos' && contPorCategoria(cat) > 0 && `(${contPorCategoria(cat)})`}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        {documentosFiltrados.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={selectedDocs.size === documentosFiltrados.length && documentosFiltrados.length > 0}
                onChange={() => toggleSelectAll(documentosFiltrados)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                {selectedDocs.size > 0 ? `${selectedDocs.size} selecionado(s)` : 'Selecionar Todos'}
              </span>
            </label>
            
            {selectedDocs.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="btn btn-sm" 
                style={{ background: 'var(--accent-red)', color: 'white', border: 'none', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
                disabled={isDeletingBulk}
              >
                {isDeletingBulk ? '⏳ Excluindo...' : '🗑️ Excluir Selecionados'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid mb-24" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div className="stat-card card p-16 border-l-4" style={{ borderLeftColor: 'var(--accent-blue)' }}>
          <div className="stat-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total</div>
          <div className="stat-value" style={{ fontSize: '24px', fontWeight: 700 }}>{documentos.length}</div>
        </div>
        <div className="stat-card card p-16 border-l-4" style={{ borderLeftColor: 'var(--accent-green)' }}>
          <div className="stat-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Iniciais por Humanos</div>
          <div className="stat-value" style={{ fontSize: '24px', fontWeight: 700 }}>{contPorCategoria('Iniciais por Humanos')}</div>
        </div>
        <div className="stat-card card p-16 border-l-4" style={{ borderLeftColor: 'var(--accent-purple)' }}>
          <div className="stat-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Modelos</div>
          <div className="stat-value" style={{ fontSize: '24px', fontWeight: 700 }}>{contPorCategoria('Modelo')}</div>
        </div>
        <div className="stat-card card p-16 border-l-4" style={{ borderLeftColor: 'var(--accent-yellow)' }}>
          <div className="stat-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Teses</div>
          <div className="stat-value" style={{ fontSize: '24px', fontWeight: 700 }}>{contPorCategoria('Tese')}</div>
        </div>
      </div>

      {/* Lista de Documentos */}
      {loading ? (
        <div className="card p-48 text-center">
          <p style={{ color: 'var(--text-secondary)' }}>Carregando documentos...</p>
        </div>
      ) : documentosFiltrados.length === 0 ? (
        <div className="empty-state card p-48 text-center" style={{ background: 'var(--bg-card)' }}>
          <div className="empty-state-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
          <h3 className="empty-state-title" style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Nenhum item encontrado</h3>
          <p className="empty-state-text" style={{ color: 'var(--text-secondary)' }}>Tente ajustar os filtros de busca.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {documentosFiltrados.map((doc, idx) => (
            <div key={idx} className={`card ${selectedDocs.has(doc.url) ? 'selected' : ''}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: selectedDocs.has(doc.url) ? '2px solid var(--accent-blue)' : undefined, transition: 'all 0.2s' }}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'row', gap: '12px' }}>
                <div style={{ paddingTop: '4px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedDocs.has(doc.url)}
                    onChange={() => toggleSelect(doc.url)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>{getIconForFile(doc.nome)}</span>
                    <span className={`badge badge-info`} style={{ fontSize: '11px' }}>{doc.categoria}</span>
                  </div>
                  <h3 className="card-title" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', wordBreak: 'break-word', cursor: 'pointer' }} onClick={() => toggleSelect(doc.url)}>
                    {doc.nome}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {formatFileSize(doc.tamanho)}
                  </p>
                </div>
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {new Date(doc.criadoEm).toLocaleDateString('pt-BR')}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ color: 'var(--accent-blue)', fontSize: '12px' }}>
                    Abrir
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          padding: '14px 24px', background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)', borderRadius: '8px',
          zIndex: 1000, boxShadow: 'var(--shadow)',
          animation: 'slideUp 0.3s ease',
          fontSize: '14px'
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
