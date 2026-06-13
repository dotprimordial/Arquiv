"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionHeading, Bullet } from "@/components/ui/legal-doc-components";

const sections = [
  { id: "missao", num: 1, title: "Missão" },
  { id: "o-que-fazemos", num: 2, title: "O Que Fazemos" },
  { id: "cobertura", num: 3, title: "Cobertura" },
  { id: "desenvolvedores-e-contato", num: 4, title: "Desenvolvedores e Contato" },
];

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

export default function About() {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    document.title = "Sobre | Arquiv";
    const handleScroll = () => {
      let current = "";
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 120) current = s.id;
      }
      setActiveId(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero header */}
      <div className="border-b border-zinc-100 bg-zinc-50/60">
        <div className="max-w-7xl mx-auto px-6 py-14 md:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-3">Sobre</p>
            <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight leading-tight mb-4">
              Sobre o Arquiv
            </h1>
            <p className="text-zinc-500 text-base leading-relaxed">
              Plataforma de pesquisa inteligente de normas técnicas de construção
            </p>
            <p className="mt-4 text-xs text-zinc-400">
              Última actualização: Junho 2026
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-12 flex gap-12 items-start">

        {/* Sticky ToC */}
        <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-24 self-start">
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-4">Conteúdo</p>
          <nav className="flex flex-col gap-0.5">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`group flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  activeId === s.id
                    ? "bg-zinc-900 text-white font-medium"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                }`}
              >
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    activeId === s.id
                      ? "bg-white text-zinc-900"
                      : "bg-zinc-200 text-zinc-600 group-hover:bg-zinc-300"
                  }`}
                >
                  {s.num}
                </span>
                <span className="leading-snug">{s.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 max-w-3xl">

          {/* Mobile ToC */}
          <div className="lg:hidden mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-3">Conteúdo</p>
            <ol className="space-y-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => scrollTo(s.id)}
                    className="text-left text-sm text-zinc-600 hover:text-zinc-900 transition-colors w-full py-0.5"
                  >
                    <span className="font-semibold text-zinc-400 mr-1.5">{s.num}.</span>
                    {s.title}
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {/* --- Sections --- */}

          <SectionHeading id="missao" num={1}>Missão</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            O Arquiv nasceu da necessidade de tornar o acesso e a pesquisa por normas de construção mais rápido, preciso e acessível.
            Profissionais de arquitectura, engenharia e construção enfrentam dificuldades em localizar
            regulamentos actualizados frequentemente perdidos em PDFs dispersos ou documentos desactualizados.
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            A nossa missão é centralizar, estruturar e disponibilizar estas normas junto com uma poderosa ferramenta de pesquisa,
            onde você pode simplesmente perguntar e obter respostas precisas.
          </p>

          <SectionHeading id="o-que-fazemos" num={2}>O Que Fazemos</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            O Arquiv combina três capacidades principais:
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet>
              <strong className="text-zinc-800 font-semibold">Pesquisa Inteligente:</strong> A nossa tecnologia interpreta a intenção da sua pergunta e encontra artigos relevantes, mesmo que não use as palavras exactas da norma. Agora você pode pesquisar descrevendo uma situação real, um cenário de obra ou uma dúvida em linguagem natural.
            </Bullet>
            <Bullet>
              <strong className="text-zinc-800 font-semibold">Visualização de Documentos:</strong> Os documentos são apresentados com destaque nos artigos relevantes, facilitando a leitura e interpretação.
            </Bullet>
            <Bullet>
              <strong className="text-zinc-800 font-semibold">Assistente AI:</strong> Conte com um assistente virtual especializado que responde dúvidas com base directamente na base de dados de normas.
            </Bullet>
          </ul>

          <SectionHeading id="cobertura" num={3}>Cobertura</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            O Arquiv tem como objectivo centralizar normas técnicas de construção do maior número possível de países, tornando a plataforma numa referência global para profissionais de arquitectura, engenharia e construção.
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Estamos continuamente a expandir a nossa base documental, priorizando regiões com maior demanda e estabelecendo parcerias para garantir acesso a regulamentos actualizados e oficiais.
          </p>

          <SectionHeading id="desenvolvedores-e-contato" num={4}>Desenvolvedores e Contato</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            O Arquiv é desenvolvido e mantido por <strong className="text-zinc-800">Sean Tomás</strong>.
            Para questões, sugestões ou parcerias:
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet>
              Email: <a href="mailto:support@arquiv.org" className="underline underline-offset-2 hover:text-zinc-800 transition-colors">support@arquiv.org</a>
            </Bullet>
            <Bullet>
              Telefone: <a href="tel:+258879599201" className="underline underline-offset-2 hover:text-zinc-800 transition-colors">+258 87 95 99 201</a>
            </Bullet>
          </ul>

          {/* Footer bar */}
          <div className="mt-16 pt-8 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-zinc-400">Última actualização: Junho 2026</p>
            <Link href="/termosofuse" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 underline underline-offset-2 transition-colors">
              Termos de Uso →
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
