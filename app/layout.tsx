import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "BM&C Inicial | Gerador de Petições Trabalhistas",
  description:
    "Sistema inteligente de geração de petições iniciais trabalhistas com aprendizado contínuo. Desenvolvido para BM&C Sociedade de Advogados.",
  keywords:
    "petição trabalhista, direito do trabalho, gerador de petições, IA jurídica",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
