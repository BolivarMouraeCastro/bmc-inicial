'use client';

import React, { useState } from 'react';

const mockHistory = [
  { id: 1, client: 'Carlos Silva e Souza', company: 'TechNova Soluções S.A.', date: '2024-03-15', status: 'Concluída', type: 'Reclamatória Trabalhista - Horas Extras' },
  { id: 2, client: 'Amanda Pereira Lima', company: 'Comercial Varejista XYZ', date: '2024-03-12', status: 'Enviada', type: 'Rescisão Indireta' },
  { id: 3, client: 'Roberto Gomes de Oliveira', company: 'Construtora Edificar Ltda', date: '2024-03-10', status: 'Rascunho', type: 'Acidente de Trabalho' },
  { id: 4, client: 'Fernanda Costa Almeida', company: 'Telemarketing Contact Plus', date: '2024-03-05', status: 'Concluída', type: 'Assédio Moral e Reflexos' },
  { id: 5, client: 'José Ricardo Mendes', company: 'Indústria Metalúrgica Ferro Frio', date: '2024-02-28', status: 'Concluída', type: 'Reclamatória Trabalhista - Adicional de Insalubridade' },
  { id: 6, client: 'Mariana Santos', company: 'Escola Educar', date: '2024-02-20', status: 'Rascunho', type: 'Reconhecimento de Vínculo Empregatício' },
];

export default function Historico() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas');
  
  const filteredHistory = mockHistory.filter(item => {
    const matchesSearch = item.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todas' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'Concluída': return 'badge-success bg-green-900 text-green-200';
      case 'Rascunho': return 'badge-warning bg-yellow-900 text-yellow-200';
      case 'Enviada': return 'badge-info bg-blue-900 text-blue-200';
      default: return 'bg-gray-700 text-gray-200';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header mb-24">
        <h1 className="text-gradient">Histórico</h1>
        <p className="page-subtitle text-gray-400">Petições geradas anteriormente</p>
      </div>

      <div className="stats-grid mb-24" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="stat-card card p-16 border-l-4 border-gray-500">
          <div className="stat-label text-sm text-gray-400">Total</div>
          <div className="stat-value text-2xl font-bold">{mockHistory.length}</div>
        </div>
        <div className="stat-card card p-16 border-l-4 border-green-500">
          <div className="stat-label text-sm text-gray-400">Concluídas</div>
          <div className="stat-value text-2xl font-bold">{mockHistory.filter(h => h.status === 'Concluída').length}</div>
        </div>
        <div className="stat-card card p-16 border-l-4 border-yellow-500">
          <div className="stat-label text-sm text-gray-400">Rascunhos</div>
          <div className="stat-value text-2xl font-bold">{mockHistory.filter(h => h.status === 'Rascunho').length}</div>
        </div>
        <div className="stat-card card p-16 border-l-4 border-blue-500">
          <div className="stat-label text-sm text-gray-400">Enviadas</div>
          <div className="stat-value text-2xl font-bold">{mockHistory.filter(h => h.status === 'Enviada').length}</div>
        </div>
      </div>

      <div className="filter-bar card p-16 mb-24 flex gap-16 flex-wrap" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div className="flex-1 min-w-[200px]" style={{ flex: 1 }}>
          <input 
            type="text" 
            className="search-input form-input w-full p-8 rounded bg-gray-800 border border-gray-700" 
            placeholder="🔍 Buscar por cliente ou empresa..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div className="flex items-center gap-8">
          <label className="text-sm text-gray-400">Status:</label>
          <select 
            className="form-select p-8 rounded bg-gray-800 border border-gray-700 text-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>Todas</option>
            <option>Concluída</option>
            <option>Rascunho</option>
            <option>Enviada</option>
          </select>
        </div>
        <div className="flex items-center gap-8">
          <label className="text-sm text-gray-400">Período:</label>
          <input type="date" className="form-input p-8 rounded bg-gray-800 border border-gray-700 text-white" />
          <span className="text-gray-500">até</span>
          <input type="date" className="form-input p-8 rounded bg-gray-800 border border-gray-700 text-white" />
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="empty-state card p-48 text-center bg-gray-800 mt-24">
          <div className="empty-state-icon text-5xl mb-16">📂</div>
          <h3 className="empty-state-title text-xl font-bold mb-8">Nenhum histórico encontrado</h3>
          <p className="empty-state-text text-gray-400">Ajuste os filtros ou crie uma nova petição.</p>
        </div>
      ) : (
        <div className="table-responsive card overflow-hidden">
          <table className="table w-full text-left" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="p-16 text-sm font-semibold text-gray-300">Cliente / Empresa</th>
                <th className="p-16 text-sm font-semibold text-gray-300">Tipo de Petição</th>
                <th className="p-16 text-sm font-semibold text-gray-300">Data</th>
                <th className="p-16 text-sm font-semibold text-gray-300">Status</th>
                <th className="p-16 text-sm font-semibold text-gray-300 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map(item => (
                <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                  <td className="p-16">
                    <div className="font-bold text-white">{item.client}</div>
                    <div className="text-sm text-gray-400">{item.company}</div>
                  </td>
                  <td className="p-16 text-gray-300">{item.type}</td>
                  <td className="p-16 text-gray-400">{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                  <td className="p-16">
                    <span className={`badge px-8 py-4 rounded text-xs ${getStatusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-16 text-right">
                    <div className="flex justify-end gap-8" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="btn btn-sm text-blue-400 hover:text-blue-300 px-8 py-4">Visualizar</button>
                      <button className="btn btn-sm text-yellow-400 hover:text-yellow-300 px-8 py-4">Editar</button>
                      <button className="btn btn-sm text-green-400 hover:text-green-300 px-8 py-4">Baixar PDF</button>
                      <button className="btn btn-sm text-red-400 hover:text-red-300 px-8 py-4">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
