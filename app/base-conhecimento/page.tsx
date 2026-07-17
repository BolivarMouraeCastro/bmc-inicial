'use client';

import React, { useState } from 'react';

const mockBase = [
  { id: 1, title: 'Modelo - Petição Inicial Horas Extras', desc: 'Petição padrão focada em horas extras, intervalo e reflexos.', cat: 'Petições Modelo', date: '2023-10-15', icon: '📄' },
  { id: 2, title: 'Jurisprudência TST - Dano Moral', desc: 'Acórdão recente sobre assédio moral no ambiente corporativo.', cat: 'Jurisprudências', date: '2023-11-02', icon: '⚖️' },
  { id: 3, title: 'Modelo de Cálculo - Rescisão Indireta', desc: 'Planilha pré-configurada para cálculo de verbas em rescisão indireta.', cat: 'Modelos de Cálculo', date: '2023-09-20', icon: '📊' },
  { id: 4, title: 'Modelo - Contestação Justa Causa', desc: 'Estrutura defensiva para reversão de justa causa com base na CLT.', cat: 'Petições Modelo', date: '2024-01-10', icon: '📄' },
  { id: 5, title: 'CLT Comentada 2024', desc: 'Documento de referência com a CLT atualizada e principais súmulas.', cat: 'Doutrinas', date: '2024-02-05', icon: '📚' }
];

export default function BaseConhecimento() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = mockBase.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header flex flex-between items-center mb-24" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient">Base de Conhecimento</h1>
          <p className="page-subtitle text-gray-400">Gerencie petições modelo e documentos de referência</p>
        </div>
        <button className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white px-16 py-8 rounded flex items-center gap-8">
          ➕ Adicionar Documento
        </button>
      </div>

      <div className="stats-grid mb-24" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="stat-card card p-16 border-l-4 border-blue-500">
          <div className="stat-label text-sm text-gray-400">Total de Documentos</div>
          <div className="stat-value text-2xl font-bold">{mockBase.length}</div>
        </div>
        <div className="stat-card card p-16 border-l-4 border-green-500">
          <div className="stat-label text-sm text-gray-400">Petições Modelo</div>
          <div className="stat-value text-2xl font-bold">2</div>
        </div>
        <div className="stat-card card p-16 border-l-4 border-purple-500">
          <div className="stat-label text-sm text-gray-400">Jurisprudências</div>
          <div className="stat-value text-2xl font-bold">1</div>
        </div>
        <div className="stat-card card p-16 border-l-4 border-yellow-500">
          <div className="stat-label text-sm text-gray-400">Modelos de Cálculo</div>
          <div className="stat-value text-2xl font-bold">1</div>
        </div>
      </div>

      <div className="filter-bar mb-24">
        <input 
          type="text" 
          className="search-input form-input w-full p-12 rounded bg-gray-800 border border-gray-700" 
          placeholder="🔍 Buscar por título ou categoria..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state card p-48 text-center bg-gray-800">
          <div className="empty-state-icon text-5xl mb-16">📄</div>
          <h3 className="empty-state-title text-xl font-bold mb-8">Nenhum documento encontrado</h3>
          <p className="empty-state-text text-gray-400">Tente buscar por termos diferentes ou adicione um novo.</p>
        </div>
      ) : (
        <div className="grid gap-16" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredItems.map(item => (
            <div key={item.id} className="card p-16 bg-gray-800 border border-gray-700 hover:border-blue-500 transition-colors flex flex-col justify-between" style={{ height: '100%' }}>
              <div>
                <div className="flex flex-between items-start mb-12" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-2xl">{item.icon}</span>
                  <span className="badge badge-info bg-blue-900 text-blue-200 text-xs px-8 py-4 rounded">{item.cat}</span>
                </div>
                <h3 className="card-title font-bold text-lg mb-8">{item.title}</h3>
                <p className="text-sm text-gray-400 mb-16">{item.desc}</p>
              </div>
              
              <div className="border-t border-gray-700 pt-12 mt-auto">
                <div className="flex flex-between items-center" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-xs text-gray-500">Adicionado em: {new Date(item.date).toLocaleDateString('pt-BR')}</span>
                  <div className="flex gap-8">
                    <button className="btn btn-sm text-blue-400 hover:text-blue-300">Visualizar</button>
                    <button className="btn btn-sm text-yellow-400 hover:text-yellow-300">Editar</button>
                    <button className="btn btn-sm text-red-400 hover:text-red-300">Excluir</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
