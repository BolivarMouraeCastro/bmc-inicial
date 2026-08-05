'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Peticao {
  id?: string | number;
  cliente?: string;
  client?: string;
  empresa?: string;
  company?: string;
  tipo?: string;
  data?: string;
  date?: string;
  status?: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [peticoes, setPeticoes] = useState<Peticao[]>([]);
  const [documentosCount, setDocumentosCount] = useState<number>(0);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [resUpload, resPeticoes] = await Promise.all([
          fetch('/api/upload'),
          fetch('/api/peticoes'),
        ]);

        if (resUpload.ok) {
          const dataUpload = await resUpload.json();
          setDocumentosCount(dataUpload.documentos?.length || 0);
        }

        if (resPeticoes.ok) {
          const dataPeticoes = await resPeticoes.json();
          setPeticoes(dataPeticoes.peticoes || []);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const totalPeticoes = peticoes.length;
  const emAndamentoCount = peticoes.filter((p) => p.status === 'Rascunho').length;
  const concluidasCount = peticoes.filter((p) => p.status === 'Concluída').length;

  const recentPeticoes = peticoes.slice(0, 5);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-gradient">Dashboard</h1>
        <p className="page-subtitle">Visão geral do sistema de petições</p>
      </div>

      {loading ? (
        <div className="card p-24 text-center mb-24">
          <p className="text-secondary">Carregando dados do dashboard...</p>
        </div>
      ) : (
        <>
          <div className="stats-grid mb-24">
            <div className="stat-card">
              <div className="stat-icon">📄</div>
              <div className="stat-value">{totalPeticoes}</div>
              <div className="stat-label">Petições Geradas</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-value">{emAndamentoCount}</div>
              <div className="stat-label">Em Andamento</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📚</div>
              <div className="stat-value">{documentosCount}</div>
              <div className="stat-label">Base de Conhecimento</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-value">{concluidasCount}</div>
              <div className="stat-label">Concluídas</div>
            </div>
          </div>

          <div className="flex gap-24">
            <div className="card flex-1">
              <div className="card-header">
                <h2 className="card-title">Atividade Recente</h2>
              </div>
              <div className="card-body">
                {recentPeticoes.length === 0 ? (
                  <p className="text-secondary opacity-70">Nenhuma atividade recente.</p>
                ) : (
                  <ul className="flex flex-col gap-12">
                    {recentPeticoes.map((item, index) => {
                      const cliente = item.cliente || item.client || 'Cliente não informado';
                      const empresa = item.empresa || item.company || 'Empresa não informada';
                      const rawDate = item.data || item.date;
                      const dateFormatted = rawDate
                        ? new Date(rawDate).toLocaleDateString('pt-BR')
                        : '';

                      return (
                        <li key={item.id || index} className="flex gap-8 items-start">
                          <div className="mt-1">🔵</div>
                          <div>
                            <p>
                              Petição gerada para {cliente} vs. {empresa}
                            </p>
                            {dateFormatted && (
                              <span className="text-sm opacity-70">{dateFormatted}</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="card flex-1">
              <div className="card-header">
                <h2 className="card-title">Ações Rápidas</h2>
              </div>
              <div className="card-body flex flex-col gap-12">
                <Link
                  href="/nova-peticao"
                  className="btn btn-primary flex justify-center gap-8 w-full"
                >
                  <span>✏️</span> Nova Petição
                </Link>
                <Link
                  href="/base-conhecimento"
                  className="btn btn-secondary flex justify-center gap-8 w-full"
                >
                  <span>📚</span> Base de Conhecimento
                </Link>
                <Link
                  href="/historico"
                  className="btn btn-secondary flex justify-center gap-8 w-full"
                >
                  <span>📋</span> Ver Histórico
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
