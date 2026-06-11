"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const sections = [
  { id: "agreement-to-terms", num: 1, title: "AGREEMENT TO TERMS" },
  { id: "eligibility-and-accessibility", num: 2, title: "ELIGIBILITY AND ACCESSIBILITY" },
  { id: "user-accounts-and-credentials", num: 3, title: "USER ACCOUNTS AND CREDENTIALS" },
  { id: "topups-credit-financial-policy", num: 4, title: "TOP-UPS, CREDIT, AND FINANCIAL POLICY" },
  { id: "intellectual-property-and-permitted-use", num: 5, title: "INTELLECTUAL PROPERTY AND PERMITTED USE" },
  { id: "governing-law-and-jurisdiction", num: 6, title: "GOVERNING LAW AND JURISDICTION" },
  { id: "prohibited-activities", num: 7, title: "PROHIBITED ACTIVITIES" },
  { id: "site-management-and-service-interruptions", num: 8, title: "SITE MANAGEMENT AND SERVICE INTERRUPTIONS" },
  { id: "disclaimer-of-ai-search-accuracy", num: 9, title: "DISCLAIMER OF AI SEARCH ACCURACY" },
  { id: "limitation-of-liability", num: 10, title: "LIMITATION OF LIABILITY" },
  { id: "modifications-and-corrections", num: 11, title: "MODIFICATIONS AND CORRECTIONS" },
  { id: "term-and-termination", num: 12, title: "TERM AND TERMINATION" },
  { id: "user-data-and-electronic-communications", num: 13, title: "USER DATA AND ELECTRONIC COMMUNICATIONS" },
  { id: "contact-information", num: 14, title: "CONTACT INFORMATION" },
];

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

function SectionHeading({ id, num, children }: { id: string; num: number; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="group flex items-baseline gap-3 text-lg font-semibold tracking-tight text-zinc-900 mt-14 mb-4 pb-3 border-b border-zinc-100 scroll-mt-28"
      style={{ fontFamily: "var(--font-equinox, var(--font-sans))" }}
    >
      <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-900 text-white text-xs font-bold">
        {num}
      </span>
      <span>{children}</span>
    </h2>
  );
}

function Note({ children }: { children: React.ReactNode }) {
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

function Warning({ children }: { children: React.ReactNode }) {
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

function Bullet({ label, children }: { label?: string; children: React.ReactNode }) {
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

export default function TermsOfUse() {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
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
            <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-3">Legal</p>
            <h1
              className="text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight leading-tight mb-4"
              style={{ fontFamily: "var(--font-equinox, var(--font-sans))" }}
            >
              Terms of Use
            </h1>
            <p className="text-zinc-500 text-base leading-relaxed">
              The rules and conditions governing your use of the <strong className="text-zinc-700">arquiv</strong> platform and services.
            </p>
            <p className="mt-4 text-xs text-zinc-400">
              Last updated: June 11, 2026 · Contact:{" "}
              <a href="mailto:seantomasytbr@gmail.com" className="underline underline-offset-2 hover:text-zinc-600 transition-colors">
                seantomasytbr@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-12 flex gap-12 items-start">

        {/* Sticky ToC */}
        <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-24 self-start">
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-4">Table of Contents</p>
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

          {/* Intro */}
          <p className="text-zinc-600 leading-relaxed mb-2">
            These Terms of Use constitute a legally binding agreement between you and{" "}
            <strong className="text-zinc-800">SaaSarc</strong>, doing business as{" "}
            <strong className="text-zinc-800">arquiv</strong>, concerning your access to and use of{" "}
            <a href="https://arquiv.org" className="text-zinc-800 underline underline-offset-2 hover:text-zinc-900" target="_blank" rel="noopener noreferrer">
              arquiv.org
            </a>{" "}
            and all related media forms, channels, or applications (collectively, the "Site").
          </p>

          <Warning>
            <strong>IMPORTANT NOTICE:</strong> By accessing the Site, you have read, understood, and agreed to be bound by all of these Terms of Use. IF YOU DO NOT AGREE WITH ALL OF THESE TERMS OF USE, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SITE AND YOU MUST DISCONTINUE USE IMMEDIATELY.
          </Warning>

          {/* Mobile ToC */}
          <div className="lg:hidden my-8 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-3">Table of Contents</p>
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

          <SectionHeading id="agreement-to-terms" num={1}>AGREEMENT TO TERMS</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            By using this Site, you confirm your binding agreement to these guidelines. We reserve the right to alter these terms as legal frameworks change. Continued use after revisions constitutes full acceptance of the updated framework.
          </p>

          <SectionHeading id="eligibility-and-accessibility" num={2}>ELIGIBILITY AND ACCESSIBILITY</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            There is no minimum age restriction to access or use our Site, as the core Services consist strictly of architectural semantic search, text processing, and document visualization, containing no sensitive, age-restricted, or explicit content. By registering an account, you represent and warrant that all registration information you submit is truthful, accurate, and that your use of the Services does not violate any applicable law or regulation.
          </p>

          <SectionHeading id="user-accounts-and-credentials" num={3}>USER ACCOUNTS AND CREDENTIALS</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            To utilize certain features of the platform, including conducting semantic searches, you are required to create an account by logging in via Google. You are entirely responsible for all activities that occur under your session authentication.
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet>You are responsible for maintaining the confidentiality of your login credentials and account activity.</Bullet>
            <Bullet>We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.</Bullet>
            <Bullet>
              If you wish to terminate your account, contact us at{" "}
              <a href="mailto:seantomasytbr@gmail.com" className="text-zinc-800 underline underline-offset-2">seantomasytbr@gmail.com</a>
              {" "}and your account data will be permanently deleted from our system.
            </Bullet>
          </ul>

          <SectionHeading id="topups-credit-financial-policy" num={4}>TOP-UPS, CREDIT, AND FINANCIAL POLICY</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            The Site operates on a prepaid credit system via dynamic balances ("top-ups").
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet label="Credit Expiration">Credits acquired through top-ups do not have an expiration date. They remain active and available on your account indefinitely until actively consumed by utilizing our AI-powered search services.</Bullet>
            <Bullet label="No Refunds">All financial transactions, top-ups, and credit purchases made through our third-party payment gateways (PayPal, Visa, MasterCard, and e-Mola) are <strong className="text-zinc-800">strictly final and non-refundable</strong>. No cash returns, rollbacks, or refunds will be issued for unused credits.</Bullet>
          </ul>

          <SectionHeading id="intellectual-property-and-permitted-use" num={5}>INTELLECTUAL PROPERTY AND PERMITTED USE</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            Our Services provide semantic search and document visualization capabilities. All interface design, software components, algorithms, and technical compilation belong to SaaSarc.
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet label="No Downloads">The Site does not permit or grant the right to download any architectural documents, technical standards, or source files stored within our database. All technical content is restricted to <strong className="text-zinc-800">on-screen visualization and reading privileges only</strong>.</Bullet>
            <Bullet label="Prohibited Scraping and Automated Access">
              The use of automated systems, bots, spiders, crawlers, scrapers, or scripts to extract data, queries, or technical documents from the website is <strong className="text-zinc-800">strictly prohibited</strong>. Any automated querying of our Gemma 4 semantic system will result in an immediate and permanent account ban without credit restoration.
            </Bullet>
          </ul>

          <SectionHeading id="governing-law-and-jurisdiction" num={6}>GOVERNING LAW AND JURISDICTION</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            These Terms of Use and your use of the Site are governed by and construed in accordance with the <strong className="text-zinc-800">laws of Mozambique</strong>, without regard to its conflict of law principles. You irrevocably consent that any legal action, suit, or proceeding arising out of or relating to these Terms shall be settled within the competent local courts of Mozambique.
          </p>

          <SectionHeading id="prohibited-activities" num={7}>PROHIBITED ACTIVITIES</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">As a user of the Site, you agree not to:</p>
          <ul className="space-y-2 mb-4">
            <Bullet>Systematically retrieve data or other content from the Site to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</Bullet>
            <Bullet>Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information.</Bullet>
            <Bullet>Circumvent, disable, or otherwise interfere with security-related features of the Site, including features that prevent or restrict the use or copying of any content.</Bullet>
            <Bullet>Engage in any automated use of the system, such as using scripts, data mining, robots, or similar data gathering and extraction tools.</Bullet>
            <Bullet>Interfere with, disrupt, or create an undue burden on the Site or the networks or services connected to the Site.</Bullet>
            <Bullet>Decipher, decompile, disassemble, or reverse engineer any of the software comprising or in any way making up a part of the Site.</Bullet>
          </ul>

          <SectionHeading id="site-management-and-service-interruptions" num={8}>SITE MANAGEMENT AND SERVICE INTERRUPTIONS</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            We reserve the right, but not the obligation, to monitor the Site for violations, take legal action against breaches, and restrict access to accounts violating these rules. We cannot guarantee the Site will be available at all times. Maintenance windows may cause interruptions, delays, or errors. You agree that we have no liability whatsoever for any loss or inconvenience caused by downtime.
          </p>

          <SectionHeading id="disclaimer-of-ai-search-accuracy" num={9}>DISCLAIMER OF AI SEARCH ACCURACY</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            The Site utilizes advanced AI capabilities (<strong className="text-zinc-800">Gemma 4</strong>) to deliver contextual and semantic search results.
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet>AI-generated interpretations, document indexing, and search summaries are provided for informational and educational purposes only.</Bullet>
            <Bullet>We do not warrant, guarantee, or assume liability for the architectural accuracy, absolute technical precision, or regulatory compliance of data interpreted by the AI infrastructure.</Bullet>
            <Bullet>It remains your sole responsibility to visually inspect, read, and verify the physical technical documents displayed before applying them to any real-world construction or engineering context.</Bullet>
          </ul>

          <SectionHeading id="limitation-of-liability" num={10}>LIMITATION OF LIABILITY</SectionHeading>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 mb-4">
            <p className="text-sm text-zinc-600 leading-relaxed m-0 uppercase tracking-wide">
              In no event will we or our directors, employees, or agents be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages, including lost profit, lost revenue, loss of data, or other damages arising from your use of the site, even if we have been advised of the possibility of such damages.
            </p>
          </div>

          <SectionHeading id="modifications-and-corrections" num={11}>MODIFICATIONS AND CORRECTIONS</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            We reserve the right to change, modify, or remove the contents of these Terms of Use at any time or for any reason at our sole discretion without notice. We also reserve the right to modify or discontinue all or part of the Site without notice at any time.
          </p>

          <SectionHeading id="term-and-termination" num={12}>TERM AND TERMINATION</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            These Terms of Use shall remain in full force and effect while you use the Site. We reserve the right to, in our sole discretion and without notice or liability, deny access to and use of the Site to any person for any reason or for no reason, including without limitation for breach of any representation, warranty, or covenant contained in these Terms of Use, or of any applicable law or regulation.
          </p>

          <SectionHeading id="user-data-and-electronic-communications" num={13}>USER DATA AND ELECTRONIC COMMUNICATIONS</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            We will maintain certain data that you transmit to the Site for the purpose of managing the performance of the Site, as well as data relating to your use of the Site. Visiting the Site, sending us emails, and completing online forms constitute electronic communications, and you consent to receive electronic communications from us.
          </p>

          <SectionHeading id="contact-information" num={14}>CONTACT INFORMATION</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us at:
          </p>
          <Note>
            <strong>SaaSarc / arquiv</strong>
            <br />
            Email:{" "}
            <a href="mailto:seantomasytbr@gmail.com" className="underline underline-offset-2">
              seantomasytbr@gmail.com
            </a>
          </Note>

          {/* Footer bar */}
          <div className="mt-16 pt-8 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-400">Last updated: June 11, 2026</p>
              <p className="text-xs text-zinc-400">
                Contact:{" "}
                <a href="mailto:seantomasytbr@gmail.com" className="underline underline-offset-2 hover:text-zinc-600 transition-colors">
                  seantomasytbr@gmail.com
                </a>
              </p>
            </div>
            <Link href="/privacypolicy" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 underline underline-offset-2 transition-colors">
              ← View Privacy Policy
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}