'use client';

import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-gradient">Dashboard</h1>
        <p className="page-subtitle">Visão geral do sistema de petições</p>
      </div>

      <div className="stats-grid mb-24">
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-value">24</div>
          <div className="stat-label">Petições Geradas</div>
          <div className="text-sm text-green-500 mt-2">+3 este mês</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">5</div>
          <div className="stat-label">Em Andamento</div>
          <div className="text-sm text-yellow-500 mt-2">2 aguardando revisão</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🧠</div>
          <div className="stat-value">18</div>
          <div className="stat-label">Regras Ativas</div>
          <div className="text-sm text-blue-500 mt-2">+2 novas regras</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-value">47</div>
          <div className="stat-label">Base de Conhecimento</div>
          <div className="text-sm text-purple-500 mt-2">12 petições modelo</div>
        </div>
      </div>

      <div className="flex gap-24">
        <div className="card flex-1">
          <div className="card-header">
            <h2 className="card-title">Atividade Recente</h2>
          </div>
          <div className="card-body">
            <ul className="flex flex-col gap-12">
              <li className="flex gap-8 items-start">
                <div className="mt-1">🔵</div>
                <div>
                  <p>Petição gerada para Maria Silva vs. Tech Corp LTDA</p>
                  <span className="text-sm opacity-70">2h atrás</span>
                </div>
              </li>
              <li className="flex gap-8 items-start">
                <div className="mt-1">🟢</div>
                <div>
                  <p>Nova regra aprendida: Formato de cálculo de horas extras</p>
                  <span className="text-sm opacity-70">5h atrás</span>
                </div>
              </li>
              <li className="flex gap-8 items-start">
                <div className="mt-1">🟣</div>
                <div>
                  <p>Documento adicionado à base de conhecimento</p>
                  <span className="text-sm opacity-70">1 dia atrás</span>
                </div>
              </li>
              <li className="flex gap-8 items-start">
                <div className="mt-1">🟡</div>
                <div>
                  <p>Petição revisada e aprovada - João Santos</p>
                  <span className="text-sm opacity-70">2 dias atrás</span>
                </div>
              </li>
              <li className="flex gap-8 items-start">
                <div className="mt-1">🟠</div>
                <div>
                  <p>Nova jurisprudência indexada - TST</p>
                  <span className="text-sm opacity-70">3 dias atrás</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="card flex-1">
          <div className="card-header">
            <h2 className="card-title">Ações Rápidas</h2>
          </div>
          <div className="card-body flex flex-col gap-12">
            <Link href="/nova-peticao" className="btn btn-primary flex justify-center gap-8 w-full">
              <span>✏️</span> Nova Petição
            </Link>
            <Link href="/base-conhecimento" className="btn btn-secondary flex justify-center gap-8 w-full">
              <span>📚</span> Base de Conhecimento
            </Link>
            <Link href="/historico" className="btn btn-secondary flex justify-center gap-8 w-full">
              <span>📋</span> Ver Histórico
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
