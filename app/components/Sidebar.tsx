'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: '📊', label: 'Dashboard' },
  { href: '/nova-peticao', icon: '✏️', label: 'Nova Petição' },
  { href: '/base-conhecimento', icon: '📚', label: 'Base de Conhecimento' },
  { href: '/historico', icon: '📋', label: 'Histórico' },
  { href: '/regras', icon: '🧠', label: 'Regras Aprendidas' },
  { href: '/configuracoes', icon: '⚙️', label: 'Configurações' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      <button className="sidebar-toggle" aria-label="Menu" onClick={toggleSidebar}>
        ☰
      </button>
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
            <img
              src="/logo-bmc.jpg"
              alt="Logo BM&C"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
            />
          </div>
          <div className="sidebar-logo-text">
            <h2>BM&C INICIAL</h2>
            <span>Petições Trabalhistas</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>v1.0 • BM&C Sociedade de Advogados</span>
        </div>
      </aside>
    </>
  );
}
