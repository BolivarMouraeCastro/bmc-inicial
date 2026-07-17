'use client';

import { useState } from 'react';

const MOCK_RULES = [
  { id: 1, title: 'Formato padrão de qualificação do reclamante', description: 'Garante que os dados do reclamante sigam a ordem: nacionalidade, estado civil, profissão, RG, CPF, CTPS, endereço.', category: 'Formatação', source: 'Petição 142 - João v. Empresa', date: '15/07/2026', confidence: 95, active: true },
  { id: 2, title: 'Cálculo de horas extras com adicional de 50%', description: 'Aplica adicional de 50% para horas laboradas além da 8ª diária e 44ª semanal.', category: 'Cálculos', source: 'Jurisprudência TST', date: '14/07/2026', confidence: 98, active: true },
  { id: 3, title: 'Inclusão automática de pedido de honorários', description: 'Adiciona pedido de honorários sucumbenciais de 15% em todas as iniciais.', category: 'Teses', source: 'Revisão manual - Dr. Silva', date: '10/07/2026', confidence: 92, active: true },
  { id: 4, title: 'Estrutura de pedidos em ordem de valor', description: 'Ordena os pedidos do maior valor para o menor valor na seção final.', category: 'Estrutura', source: 'Base de Conhecimento', date: '05/07/2026', confidence: 88, active: false },
  { id: 5, title: 'Citação de artigos da CLT para verbas rescisórias', description: 'Sempre cita art. 477 e 467 quando há pedido de verbas rescisórias.', category: 'Teses', source: 'Petição 101 a 110', date: '01/07/2026', confidence: 96, active: true },
  { id: 6, title: 'Formato de valor da causa com base nos pedidos', description: 'A soma dos pedidos líquidos deve corresponder exatamente ao valor da causa.', category: 'Cálculos', source: 'Regra de negócio', date: '28/06/2026', confidence: 90, active: true },
];

export default function RegrasPage() {
  const [activeTab, setActiveTab] = useState('Todas');
  const [rules, setRules] = useState(MOCK_RULES);

  const tabs = ['Todas', 'Formatação', 'Teses', 'Cálculos', 'Estrutura'];

  const filteredRules = activeTab === 'Todas' ? rules : rules.filter(r => r.category === activeTab);

  const toggleRule = (id: number) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const deleteRule = (id: number) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const getBadgeClass = (category: string) => {
    switch(category) {
      case 'Formatação': return 'badge-info';
      case 'Cálculos': return 'badge-warning';
      case 'Teses': return 'badge-success';
      case 'Estrutura': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-gradient">Regras Aprendidas</h1>
        <p className="page-subtitle">Regras extraídas automaticamente das petições</p>
      </div>

      <div className="filter-bar mb-16 flex gap-8">
        {tabs.map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-16">
        {filteredRules.map(rule => (
          <div key={rule.id} className="card">
            <div className="card-body flex gap-16 items-start flex-between">
              <div className="flex-1">
                <div className="flex items-center gap-8 mb-8">
                  <span className={`badge ${getBadgeClass(rule.category)}`}>{rule.category}</span>
                  <span className="text-sm opacity-70">Aprendido em {rule.date} de: {rule.source}</span>
                  <span className="text-sm font-bold opacity-80">Confiança: {rule.confidence}%</span>
                </div>
                <h3 className="card-title mb-8">{rule.title}</h3>
                <p className="opacity-80">{rule.description}</p>
              </div>
              <div className="flex flex-col items-end gap-12">
                <div className="flex items-center gap-8">
                  <span className="text-sm">{rule.active ? 'Ativa' : 'Inativa'}</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={rule.active} onChange={() => toggleRule(rule.id)} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <button onClick={() => deleteRule(rule.id)} className="btn btn-danger btn-sm">
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredRules.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3 className="empty-state-title">Nenhuma regra encontrada</h3>
            <p className="empty-state-text">Não há regras para a categoria selecionada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
