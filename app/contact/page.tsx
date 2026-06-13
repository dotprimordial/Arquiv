"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Contact() {
  useEffect(() => {
    document.title = "Contacto | Arquiv";
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-zinc-100 bg-zinc-50/60">
        <div className="max-w-7xl mx-auto px-6 py-14 md:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-3">Contacto</p>
            <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight leading-tight mb-4">
              Fale Connosco
            </h1>
            <p className="text-zinc-500 text-base leading-relaxed">
              Tem dúvidas, sugestões ou quer reportar um problema? Estamos à disposição.
            </p>
            <p className="mt-4 text-xs text-zinc-400">
              Última actualização: Junho 2026
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <main className="max-w-3xl">
          <p className="text-zinc-600 text-sm leading-relaxed mb-8">
            Preencha o formulário abaixo ou contacte-nos directamente através dos canais indicados.
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
              <h2 className="text-sm font-semibold text-zinc-900 mb-4">Email</h2>
              <a
                href="mailto:support@arquiv.org"
                className="text-lg font-medium text-zinc-800 underline underline-offset-4 hover:text-zinc-900 transition-colors"
              >
                support@arquiv.org
              </a>
              <p className="text-xs text-zinc-400 mt-2">Respondemos dentro de 24-48 horas.</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
              <h2 className="text-sm font-semibold text-zinc-900 mb-4">Telefone</h2>
              <a
                href="tel:+258879599201"
                className="text-lg font-medium text-zinc-800 underline underline-offset-4 hover:text-zinc-900 transition-colors"
              >
                +258 87 95 99 201
              </a>
              <p className="text-xs text-zinc-400 mt-2">Horário comercial (GMT+2).</p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 p-8">
            <h2 className="text-base font-semibold text-zinc-900 mb-6">Envie-nos uma mensagem</h2>
            <form
              action="mailto:support@arquiv.org"
              method="POST"
              encType="text/plain"
              className="space-y-5"
            >
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Nome</label>
                <input
                  type="text"
                  name="nome"
                  required
                  className="mt-1 w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300 outline-none transition-all text-sm"
                  placeholder="O seu nome"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="mt-1 w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300 outline-none transition-all text-sm"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Assunto</label>
                <input
                  type="text"
                  name="assunto"
                  required
                  className="mt-1 w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300 outline-none transition-all text-sm"
                  placeholder="Assunto da mensagem"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Mensagem</label>
                <textarea
                  name="mensagem"
                  required
                  rows={5}
                  className="mt-1 w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300 outline-none transition-all text-sm resize-y"
                  placeholder="A sua mensagem..."
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all"
              >
                Enviar Mensagem
              </button>
            </form>
          </div>

          <div className="mt-16 pt-8 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-400">Última actualização: Junho 2026</p>
              <p className="text-xs text-zinc-400">
                Email:{" "}
                <a href="mailto:support@arquiv.org" className="underline underline-offset-2 hover:text-zinc-600 transition-colors">
                  support@arquiv.org
                </a>
              </p>
            </div>
            <Link href="/about" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 underline underline-offset-2 transition-colors">
              Sobre o Arquiv →
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
