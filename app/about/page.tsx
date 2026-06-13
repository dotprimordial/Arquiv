"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function About() {
  useEffect(() => {
    document.title = "Sobre | Arquiv";
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-zinc-100 bg-zinc-50/60">
        <div className="max-w-7xl mx-auto px-6 py-14 md:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-3">Sobre</p>
            <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight leading-tight mb-4">
              Sobre o Arquiv
            </h1>
            <p className="text-zinc-500 text-base leading-relaxed">
              Plataforma de pesquisa semântica de normas técnicas de construção e legislação para Moçambique e PALOP.
            </p>
            <p className="mt-4 text-xs text-zinc-400">
              Última actualização: Junho 2026
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <main className="max-w-3xl">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 mt-10 mb-4 pb-3 border-b border-zinc-100">
            Missão
          </h2>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            O Arquiv nasceu da necessidade de tornar o acesso a normas técnicas de construção mais rápido, preciso e acessível.
            Em Moçambique, profissionais de arquitectura, engenharia e construção enfrentam dificuldades em localizar
            regulamentos actualizados — frequentemente perdidos em PDFs dispersos ou documentos desactualizados.
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            A nossa missão é centralizar, estruturar e disponibilizar estas normas através de inteligência artificial,
            permitindo que qualquer profissional encontre o artigo relevante em segundos, não em horas.
          </p>

          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 mt-14 mb-4 pb-3 border-b border-zinc-100">
            O Que Fazemos
          </h2>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            O Arquiv combina três capacidades principais:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex gap-2 text-zinc-600 text-sm leading-relaxed">
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <span><strong className="text-zinc-800 font-semibold">Pesquisa Semântica com IA:</strong> Usamos o modelo Gemma 4 para interpretar a intenção da sua pergunta e encontrar artigos relevantes, mesmo que não use as palavras exactas da norma.</span>
            </li>
            <li className="flex gap-2 text-zinc-600 text-sm leading-relaxed">
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <span><strong className="text-zinc-800 font-semibold">Visualização de Documentos:</strong> Os documentos são apresentados com destaque nos artigos relevantes, facilitando a leitura e interpretação.</span>
            </li>
            <li className="flex gap-2 text-zinc-600 text-sm leading-relaxed">
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <span><strong className="text-zinc-800 font-semibold">Cobertura Multi-País:</strong> Suporte para normas de Moçambique, Portugal e outros países PALOP.</span>
            </li>
          </ul>

          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 mt-14 mb-4 pb-3 border-b border-zinc-100">
            Tecnologia
          </h2>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            O Arquiv é construído com tecnologias modernas para garantir desempenho, escalabilidade e precisão:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex gap-2 text-zinc-600 text-sm leading-relaxed">
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <span><strong className="text-zinc-800 font-semibold">Frontend:</strong> Next.js 15 + React 19 + Tailwind CSS 4</span>
            </li>
            <li className="flex gap-2 text-zinc-600 text-sm leading-relaxed">
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <span><strong className="text-zinc-800 font-semibold">IA:</strong> Google Gemma 4 (via OpenRouter) para busca semântica e interpretação</span>
            </li>
            <li className="flex gap-2 text-zinc-600 text-sm leading-relaxed">
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <span><strong className="text-zinc-800 font-semibold">Base de Dados:</strong> Supabase (PostgreSQL + vector embeddings)</span>
            </li>
            <li className="flex gap-2 text-zinc-600 text-sm leading-relaxed">
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <span><strong className="text-zinc-800 font-semibold">Deploy:</strong> Cloudflare Pages</span>
            </li>
          </ul>

          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 mt-14 mb-4 pb-3 border-b border-zinc-100">
            Equipa
          </h2>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            O Arquiv é desenvolvido e mantido por <strong className="text-zinc-800">Sean Tomás</strong>. 
            Para questões, sugestões ou parcerias:
          </p>
          <ul className="space-y-2">
            <li className="flex gap-2 text-zinc-600 text-sm leading-relaxed">
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <span>Email: <a href="mailto:seantomasytbr@gmail.com" className="underline underline-offset-2 hover:text-zinc-800 transition-colors">seantomasytbr@gmail.com</a></span>
            </li>
            <li className="flex gap-2 text-zinc-600 text-sm leading-relaxed">
              <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <span>Telefone: <a href="tel:+258879599201" className="underline underline-offset-2 hover:text-zinc-800 transition-colors">+258 87 95 99 201</a></span>
            </li>
          </ul>

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
