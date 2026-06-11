"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const sections = [
  { id: "what-information-do-we-collect", num: 1, title: "WHAT INFORMATION DO WE COLLECT?" },
  { id: "how-do-we-process-your-information", num: 2, title: "HOW DO WE PROCESS YOUR INFORMATION?" },
  { id: "what-legal-bases", num: 3, title: "WHAT LEGAL BASES DO WE RELY ON?" },
  { id: "when-and-with-whom", num: 4, title: "WHEN AND WITH WHOM DO WE SHARE YOUR INFORMATION?" },
  { id: "third-party-websites", num: 5, title: "WHAT IS OUR STANCE ON THIRD-PARTY WEBSITES?" },
  { id: "ai-products", num: 6, title: "DO WE OFFER AI-BASED PRODUCTS?" },
  { id: "social-logins", num: 7, title: "HOW DO WE HANDLE YOUR SOCIAL LOGINS?" },
  { id: "how-long-keep", num: 8, title: "HOW LONG DO WE KEEP YOUR INFORMATION?" },
  { id: "keep-safe", num: 9, title: "HOW DO WE KEEP YOUR INFORMATION SAFE?" },
  { id: "privacy-rights", num: 10, title: "WHAT ARE YOUR PRIVACY RIGHTS?" },
  { id: "do-not-track", num: 11, title: "CONTROLS FOR DO-NOT-TRACK FEATURES" },
  { id: "us-residents", num: 12, title: "DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?" },
  { id: "other-regions", num: 13, title: "DO OTHER REGIONS HAVE SPECIFIC PRIVACY RIGHTS?" },
  { id: "updates-to-notice", num: 14, title: "DO WE MAKE UPDATES TO THIS NOTICE?" },
  { id: "contact-us", num: 15, title: "HOW CAN YOU CONTACT US?" },
  { id: "review-delete", num: 16, title: "HOW CAN YOU REVIEW, UPDATE, OR DELETE YOUR DATA?" },
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

export default function PrivacyPolicy() {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    document.title = "Privacy Policy | Arquiv";
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
            <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight leading-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-zinc-500 text-base leading-relaxed">
              How <strong className="text-zinc-700">arquiv</strong> collects, uses, and protects your personal information.
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
            This Privacy Notice for <strong className="text-zinc-800">SaaSarc</strong> describes how and why we might
            access, collect, store, use, and/or share your personal information when you use our services
            (&quot;Services&quot;), including when you visit our website at{" "}
            <a href="https://arquiv.org" className="text-zinc-800 underline underline-offset-2 hover:text-zinc-900" target="_blank" rel="noopener noreferrer">
              arquiv.org
            </a>{" "}
            or engage with us in other related ways.
          </p>

          <Note>
            <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy
            rights and choices. If you do not agree with our policies and practices, please do not use our Services.
            If you still have any questions or concerns, please contact us at seantomasytbr@gmail.com.
          </Note>

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

          <SectionHeading id="what-information-do-we-collect" num={1}>WHAT INFORMATION DO WE COLLECT?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            <em className="text-zinc-500">We collect personal information that you provide to us, as well as core
            connectivity metrics like your IP address.</em>
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            We collect personal information that you voluntarily provide to us when you register on the Services,
            express an interest in obtaining information about us or our products and Services, or when you
            contact us.
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet label="Social Login Data">
              We provide you with the option to register and log in using your existing Google account details.
              The data we receive depends on your Google privacy settings but typically includes your name, email
              address, and profile picture.
            </Bullet>
          </ul>
          <p className="text-zinc-600 text-sm leading-relaxed mb-1">
            <strong className="text-zinc-800">Information automatically collected</strong>
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            <em className="text-zinc-500">Some information — such as your IP address and/or browser and device
            characteristics — is collected automatically when you visit our Services.</em>
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-2">
            We automatically collect certain information when you visit, use, or navigate the Services. This
            information does not reveal your specific identity but includes:
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet label="Log and Usage Data">
              We collect your Internet Protocol (IP) address, browser characteristics, operating system, language
              preferences, device name, and information about how and when you use our Services.
            </Bullet>
          </ul>

          <SectionHeading id="how-do-we-process-your-information" num={2}>HOW DO WE PROCESS YOUR INFORMATION?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            <em className="text-zinc-500">We process your information to provide, improve, and administer our Services,
            communicate with you, for security and fraud prevention, and to comply with law.</em>
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            We process your personal information for a variety of reasons, depending on how you interact with our
            Services, including:
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet label="Account creation and authentication">
              We process your Google social login data to allow you to seamlessly create and log in to your account.
            </Bullet>
            <Bullet label="User accounts and balances">
              We process your information to keep your account in working order and track your available service credits.
            </Bullet>
            <Bullet label="Service delivery">
              We process your queries and interaction data to provide you with architectural document search capabilities.
            </Bullet>
            <Bullet label="Service protection">
              We monitor IP addresses and login data as part of our efforts to keep our Services safe and secure.
            </Bullet>
          </ul>

          <SectionHeading id="what-legal-bases" num={3}>WHAT LEGAL BASES DO WE RELY ON?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            <em className="text-zinc-500">We only process your personal information when we believe it is necessary and
            we have a valid legal reason to do so under applicable law.</em>
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">We rely on the following legal bases:</p>
          <ul className="space-y-2 mb-4">
            <Bullet label="Consent">
              We process your data if you have given us clear permission for a specific purpose (e.g., logging in via Google).
            </Bullet>
            <Bullet label="Performance of a Contract">
              We process your information when it is necessary to fulfill our commitment to providing our Services
              and processing your top-ups.
            </Bullet>
            <Bullet label="Legitimate Interests">
              We process your data when we believe it is reasonably necessary to achieve our legitimate business
              interests, such as optimizing our search engine infrastructure and securing our application from abuse.
            </Bullet>
          </ul>

          <SectionHeading id="when-and-with-whom" num={4}>WHEN AND WITH WHOM DO WE SHARE YOUR INFORMATION?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            <em className="text-zinc-500">We do not sell your data. We share information only in specific situations
            with financial processors to process transactions.</em>
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            We do not directly store or collect your payment card or mobile wallet details. For financial transactions,
            your payment information is provided directly to our third-party payment processors (<strong className="text-zinc-800">PayPal,
            Visa, MasterCard, or e-Mola</strong>). Their use of your personal information is governed by their
            respective Privacy Policies.
          </p>

          <SectionHeading id="third-party-websites" num={5}>WHAT IS OUR STANCE ON THIRD-PARTY WEBSITES?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            <em className="text-zinc-500">We are not responsible for the safety of any information that you share with
            third-party providers that process your authentication or financial transactions.</em>
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Our Services utilize third-party platforms for authentication (Google) and financial transactions
            (PayPal, e-Mola, etc.). We cannot guarantee the safety and privacy of data you provide directly to these
            third parties once you leave our platform.
          </p>

          <SectionHeading id="ai-products" num={6}>DO WE OFFER AI-BASED PRODUCTS?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            <em className="text-zinc-500">Yes, we utilize Artificial Intelligence to process your search requests, but
            we do not share your private identity with the AI models.</em>
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            As part of our core features, we use advanced semantic search capabilities powered by Artificial
            Intelligence (<strong className="text-zinc-800">Gemma 4</strong>).
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet label="What we share">
              When you perform a search, the text of your query is transmitted to the AI language model infrastructure
              solely to analyze and interpret the contextual meaning of your search.
            </Bullet>
            <Bullet label="What we do NOT share">
              We do not send your name, email address, IP address, or account identifiers to the AI model provider.
              The AI only processes the raw search terms.
            </Bullet>
          </ul>

          <SectionHeading id="social-logins" num={7}>HOW DO WE HANDLE YOUR SOCIAL LOGINS?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Our Services offer you the ability to register and log in using your third-party Google account credentials.
            Where you choose to do this, we will receive certain profile information about you from Google, typically
            including your name and email address. We will use the information received only for the purposes described
            in this Privacy Notice. Please note that we do not control, and are not responsible for, other uses of your
            personal information by Google.
          </p>

          <SectionHeading id="how-long-keep" num={8}>HOW LONG DO WE KEEP YOUR INFORMATION?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            We will only keep your personal information for as long as it is necessary for the purposes set out in this
            Privacy Notice, such as maintaining your active account and transaction history.
          </p>
          <Note>
            If you wish to terminate your account and have your data removed, you may request account deletion at any
            time by sending an email. Upon receiving your deletion request, all your associated personal data (including
            email, IP logs, and balance records) will be permanently and immediately deleted from our active databases.
          </Note>

          <SectionHeading id="keep-safe" num={9}>HOW DO WE KEEP YOUR INFORMATION SAFE?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            We have implemented appropriate technical and organizational security measures designed to protect the
            security of any personal information we process, including encryption for data in transit and secure database
            storage. However, despite our safeguards, no electronic transmission over the Internet or information
            storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that unauthorized
            third parties will not be able to defeat our security and improperly access your information.
          </p>

          <SectionHeading id="privacy-rights" num={10}>WHAT ARE YOUR PRIVACY RIGHTS?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Regardless of where you reside globally, we respect your privacy rights and provide you with the ability to
            request access, rectification, or absolute erasure of your personal data. If you are located in the European
            Economic Area (EEA), United Kingdom (UK), or other jurisdictions with comprehensive privacy frameworks
            (like GDPR), you possess specific legal rights regarding your data which we honor through our global
            deletion and data access policies.
          </p>

          <SectionHeading id="do-not-track" num={11}>CONTROLS FOR DO-NOT-TRACK FEATURES</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Most web browsers and some mobile operating systems include a Do-Not-Track (&quot;DNT&quot;) feature or
            setting you can activate to signal your privacy preference. At this stage, no uniform technology standard
            for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to
            DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked
            online.
          </p>

          <SectionHeading id="us-residents" num={12}>DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Yes, if you are a resident of states with comprehensive privacy laws (such as California, Virginia,
            Colorado, Connecticut, or Utah), you are granted specific rights regarding your personal information.
            We ensure compliance by not selling your personal data, not sharing it for cross-context behavioral
            advertising, and allowing you to request immediate deletion of your data by contacting us directly.
          </p>

          <SectionHeading id="other-regions" num={13}>DO OTHER REGIONS HAVE SPECIFIC PRIVACY RIGHTS?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Yes, users accessing our services from other regions, including African nations (such as Mozambique under
            local electronic transactions and data protection frameworks), are guaranteed that their electronic data is
            processed transparently, securely, and solely for the execution of the architectural search services
            explicitly contracted on our platform.
          </p>

          <SectionHeading id="updates-to-notice" num={14}>DO WE MAKE UPDATES TO THIS NOTICE?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            We may update this Privacy Notice from time to time. The updated version will be indicated by an updated
            &quot;Revised&quot; date and will be effective as soon as it is accessible. We encourage you to review
            this Privacy Notice frequently to be informed of how we are protecting your information.
          </p>

          <SectionHeading id="contact-us" num={15}>HOW CAN YOU CONTACT US?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            If you have questions, comments, or concerns about this notice, you may email us directly at:
          </p>
          <Note>
            <strong>SaaSarc / arquiv</strong>
            <br />
            Email:{" "}
            <a href="mailto:seantomasytbr@gmail.com" className="underline underline-offset-2">
              seantomasytbr@gmail.com
            </a>
          </Note>

          <SectionHeading id="review-delete" num={16}>HOW CAN YOU REVIEW, UPDATE, OR DELETE YOUR DATA?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            Based on the applicable laws of your country, you have the right to request access to the personal
            information we collect from you, change that information, or delete it.
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            To request to <strong className="text-zinc-800">delete your account and permanently erase your data</strong>,
            please send an explicit email request to{" "}
            <a href="mailto:seantomasytbr@gmail.com" className="text-zinc-800 underline underline-offset-2">
              seantomasytbr@gmail.com
            </a>{" "}
            using the email address associated with your account. We will process your request and permanently delete
            your records from our databases immediately upon verification.
          </p>

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
            <Link href="/termosofuse" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 underline underline-offset-2 transition-colors">
              ← View Terms of Use
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
