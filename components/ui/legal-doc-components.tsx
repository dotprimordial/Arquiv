import React from "react";

export function SectionHeading({ id, num, children }: { id: string; num: number; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="group flex items-baseline gap-3 text-lg font-semibold tracking-tight text-zinc-900 mt-14 mb-4 pb-3 border-b border-zinc-100 scroll-mt-28"
    >
      <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-900 text-white text-xs font-bold">
        {num}
      </span>
      <span>{children}</span>
    </h2>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-5 flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
      <span className="mt-0.5 flex-shrink-0 text-zinc-400">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
          <path d="M8 7v4M8 5.5V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <p className="text-sm text-zinc-600 leading-relaxed m-0">{children}</p>
    </div>
  );
}

export function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
      <span className="mt-0.5 flex-shrink-0 text-amber-500">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 6v3.5M8 11.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <p className="text-sm text-amber-800 leading-relaxed m-0">{children}</p>
    </div>
  );
}

export function Bullet({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-zinc-600 text-sm leading-relaxed">
      <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-300" />
      <span>
        {label && <strong className="text-zinc-800 font-semibold">{label}: </strong>}
        {children}
      </span>
    </li>
  );
}
