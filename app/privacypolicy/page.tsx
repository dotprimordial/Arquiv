"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SectionHeading, Note, Warning, Bullet } from "@/components/ui/legal-doc-components";

const sections = [
  { id: "que-informacoes-colectamos", num: 1, title: "QUE INFORMAÇÕES COLECTAMOS?" },
  { id: "como-processamos-as-suas-informacoes", num: 2, title: "COMO PROCESSAMOS AS SUAS INFORMAÇÕES?" },
  { id: "bases-legais", num: 3, title: "QUAIS AS BASES LEGAIS?" },
  { id: "quando-e-com-quem-partilhamos", num: 4, title: "QUANDO E COM QUEM PARTILHAMOS?" },
  { id: "sites-de-terceiros", num: 5, title: "QUAL A NOSSA POSIÇÃO SOBRE SITES DE TERCEIROS?" },
  { id: "produtos-ia", num: 6, title: "OFERECEMOS PRODUTOS BASEADOS EM IA?" },
  { id: "logins-sociais", num: 7, title: "COMO LIDAMOS COM OS SEUS LOGINS SOCIAIS?" },
  { id: "por-quanto-tempo-mantemos", num: 8, title: "POR QUANTO TEMPO MANTEMOS AS SUAS INFORMAÇÕES?" },
  { id: "seguranca", num: 9, title: "COMO MANTEMOS AS SUAS INFORMAÇÕES SEGURAS?" },
  { id: "direitos-de-privacidade", num: 10, title: "QUAIS SÃO OS SEUS DIREITOS DE PRIVACIDADE?" },
  { id: "nao-rastreamento", num: 11, title: "CONTROLES PARA FUNÇÕES DE NÃO RASTREAMENTO" },
  { id: "residentes-eua", num: 12, title: "RESIDENTES DOS EUA TÊM DIREITOS ESPECÍFICOS?" },
  { id: "outras-regioes", num: 13, title: "OUTRAS REGIÕES TÊM DIREITOS ESPECÍFICOS?" },
  { id: "atualizacoes", num: 14, title: "FAZEMOS ATUALIZAÇÕES A ESTE AVISO?" },
  { id: "contacto", num: 15, title: "COMO PODE CONTACTAR-NOS?" },
  { id: "revisao-eliminacao", num: 16, title: "COMO PODE REVER, ATUALIZAR OU ELIMINAR OS SEUS DADOS?" },
];

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

export default function PrivacyPolicy() {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    document.title = 'Política de Privacidade | Arquiv';
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
            >
              Política de Privacidade
            </h1>
            <p className="text-zinc-500 text-base leading-relaxed">
              Como o <strong className="text-zinc-700">arquiv</strong> coleta, usa e protege as suas informações pessoais.
            </p>
            <p className="mt-4 text-xs text-zinc-400">
              Última atualização: 11 de Junho de 2026 · Contacto:{" "}
              <a href="mailto:support@arquiv.org" className="underline underline-offset-2 hover:text-zinc-600 transition-colors">
                support@arquiv.org
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-12 flex gap-12 items-start">

        {/* Sticky ToC */}
        <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-24 self-start">
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-4">Índice</p>
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
            Este Aviso de Privacidade da <strong className="text-zinc-800">SaaSarc</strong> descreve como e por que podemos aceder, coletar, armazenar, usar e/ou partilhar as suas informações pessoais quando utiliza os nossos serviços, incluindo quando visita o nosso site em{" "}
            <a href="https://arquiv.org" className="text-zinc-800 underline underline-offset-2 hover:text-zinc-900" target="_blank" rel="noopener noreferrer">
              arquiv.org
            </a>
            .
          </p>

          <Note>
            <strong>Dúvidas ou preocupações?</strong> A leitura deste Aviso de Privacidade ajudá-lo-á a compreender os seus direitos de privacidade e escolhas. Se não concordar com as nossas políticas e práticas, por favor não utilize os nossos Serviços. Se ainda tiver dúvidas ou preocupações, contacte-nos através de support@arquiv.org.
          </Note>

          {/* Mobile ToC */}
          <div className="lg:hidden my-8 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-3">Índice</p>
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

          <SectionHeading id="que-informacoes-colectamos" num={1}>QUE INFORMAÇÕES COLECTAMOS?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            <em className="text-zinc-500">Em resumo:</em> Coletamos informações pessoais que nos fornece, bem como métricas de conectividade essenciais, como o seu endereço IP.
          </p>

          <h3 className="text-sm font-semibold text-zinc-800 mt-6 mb-2">Informações pessoais que nos divulga</h3>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            Coletamos informações pessoais que nos fornece voluntariamente quando se regista nos Serviços, manifesta interesse em obter informações sobre nós ou os nossos produtos e Serviços, ou quando nos contacta.
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet label="Dados de Login Social">Oferecemos a opção de se registar e iniciar sessão usando os detalhes da sua conta Google. Os dados que recebemos dependem das suas configurações de privacidade do Google, mas geralmente incluem o seu nome, endereço de e-mail e foto de perfil.</Bullet>
          </ul>

          <h3 className="text-sm font-semibold text-zinc-800 mt-6 mb-2">Informações recolhidas automaticamente</h3>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            <em className="text-zinc-500">Em resumo:</em> Algumas informações — como o seu endereço de Protocolo de Internet (IP) e/ou características do navegador e dispositivo — são coletadas automaticamente quando visita os nossos Serviços.
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            Coletamos automaticamente certas informações quando visita, utiliza ou navega nos Serviços. Estas informações não revelam a sua identidade específica, mas incluem:
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet label="Dados de Registo e Utilização">Coletamos o seu endereço de Protocolo de Internet (IP), características do navegador, sistema operativo, preferências de idioma, nome do dispositivo e informações sobre como e quando utiliza os nossos Serviços.</Bullet>
          </ul>

          <SectionHeading id="como-processamos-as-suas-informacoes" num={2}>COMO PROCESSAMOS AS SUAS INFORMAÇÕES?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            <em className="text-zinc-500">Em resumo:</em> Processamos as suas informações para fornecer, melhorar e administrar os nossos Serviços, comunicar consigo, para segurança e prevenção de fraudes, e para cumprir a lei.
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            Processamos as suas informações pessoais por várias razões, dependendo de como interage com os nossos Serviços, incluindo:
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet label="Para facilitar a criação e autenticação de conta">Processamos os seus dados de login social do Google para permitir que crie e aceda à sua conta de forma integrada.</Bullet>
            <Bullet label="Para gerir contas de utilizador e saldos">Processamos as suas informações para manter a sua conta em funcionamento e rastrear os seus créditos de serviço disponíveis.</Bullet>
            <Bullet label="Para fornecer e facilitar a prestação de serviços">Processamos as suas consultas e dados de interação para lhe fornecer capacidades de pesquisa de documentos arquitetónicos.</Bullet>
            <Bullet label="Para proteger os nossos Serviços">Monitorizamos endereços IP e dados de login como parte dos nossos esforços para manter os nossos Serviços seguros e prevenir atividades fraudulentas.</Bullet>
          </ul>

          <SectionHeading id="bases-legais" num={3}>QUAIS AS BASES LEGAIS PARA PROCESSAR AS SUAS INFORMAÇÕES PESSOAIS?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            <em className="text-zinc-500">Em resumo:</em> Processamos as suas informações pessoais apenas quando acreditamos ser necessário e temos uma razão legal válida para o fazer ao abrigo da lei aplicável.
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            Baseamo-nos nas seguintes bases legais válidas para processar as suas informações pessoais:
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet label="Consentimento">Processamos os seus dados se nos tiver dado permissão clara para um fim específico (por exemplo, iniciar sessão via Google).</Bullet>
            <Bullet label="Execução de um Contrato">Processamos as suas informações, incluindo o seu saldo e estado da conta, quando necessário para cumprir o nosso compromisso de fornecer os nossos Serviços e processar os seus carregamentos.</Bullet>
            <Bullet label="Interesses Legítimos">Processamos os seus dados quando acreditamos ser razoavelmente necessário para atingir os nossos legítimos interesses comerciais, como otimizar a nossa infraestrutura de pesquisa e proteger a nossa aplicação contra abusos.</Bullet>
          </ul>

          <SectionHeading id="quando-e-com-quem-partilhamos" num={4}>QUANDO E COM QUEM PARTILHAMOS AS SUAS INFORMAÇÕES PESSOAIS?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            <em className="text-zinc-500">Em resumo:</em> Não vendemos os seus dados. Partilhamos informações apenas em situações específicas com processadores financeiros para realizar transações.
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            Podemos precisar de partilhar as suas informações pessoais nas seguintes situações:
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet label="Processadores de Pagamento">Não armazenamos ou coletamos diretamente os detalhes do seu cartão de pagamento ou carteira móvel. Para transações financeiras, as suas informações de pagamento são fornecidas diretamente aos nossos processadores de pagamento terceiros (<strong>PayPal, Visa, MasterCard ou e-Mola</strong>). A utilização das suas informações pessoais por estes é regida pelas respetivas Políticas de Privacidade.</Bullet>
          </ul>

          <SectionHeading id="sites-de-terceiros" num={5}>QUAL A NOSSA POSIÇÃO SOBRE SITES DE TERCEIROS?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            <em className="text-zinc-500">Em resumo:</em> Não somos responsáveis pela segurança de qualquer informação que partilhe com fornecedores terceiros que processam a sua autenticação ou transações financeiras.
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Os nossos Serviços utilizam plataformas terceiras para autenticação (Google) e transações financeiras (PayPal, e-Mola, etc.). Não podemos garantir a segurança e privacidade dos dados que fornece diretamente a estes terceiros depois de sair da nossa plataforma. Quaisquer dados coletados por terceiros são regidos pelas suas próprias práticas e políticas de privacidade.
          </p>

          <SectionHeading id="produtos-ia" num={6}>OFERECEMOS PRODUTOS BASEADOS EM INTELIGÊNCIA ARTIFICIAL?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            <em className="text-zinc-500">Em resumo:</em> Sim, utilizamos Inteligência Artificial para processar as suas pesquisas, mas não partilhamos a sua identidade privada com os modelos de IA.
          </p>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            Como parte das nossas funcionalidades principais, utilizamos capacidades de pesquisa semântica avançada alimentadas por Inteligência Artificial (<strong>Gemma 4</strong>).
          </p>
          <ul className="space-y-2 mb-4">
            <Bullet label="O que partilhamos">Quando realiza uma pesquisa na nossa plataforma, o texto da sua consulta é transmitido à infraestrutura do modelo de linguagem de IA apenas para analisar, interpretar e compreender o significado contextual da sua pesquisa.</Bullet>
            <Bullet label="O que NÃO partilhamos">Não enviamos o seu nome, endereço de e-mail, endereço IP ou identificadores de conta ao fornecedor do modelo de IA. A IA processa apenas os termos de pesquisa brutos para devolver resultados arquitetónicos e documentais precisos.</Bullet>
          </ul>

          <SectionHeading id="logins-sociais" num={7}>COMO LIDAMOS COM OS SEUS LOGINS SOCIAIS?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Os nossos Serviços oferecem a capacidade de se registar e iniciar sessão usando as credenciais da sua conta Google. Se escolher fazê-lo, receberemos certas informações de perfil suas do Google, geralmente incluindo o seu nome e endereço de e-mail. Utilizaremos as informações recebidas apenas para os fins descritos neste Aviso de Privacidade. Note que não controlamos e não somos responsáveis por outros usos das suas informações pessoais por parte do Google.
          </p>

          <SectionHeading id="por-quanto-tempo-mantemos" num={8}>POR QUANTO TEMPO MANTEMOS AS SUAS INFORMAÇÕES?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Manteremos as suas informações pessoais apenas pelo tempo necessário para os fins estabelecidos neste Aviso de Privacidade, como manter a sua conta ativa e o histórico de transações.
          </p>
          <Note>
            Se desejar encerrar a sua conta e ter os seus dados removidos, pode solicitar a eliminação da conta a qualquer momento enviando um e-mail. Após receber o seu pedido de eliminação, todos os seus dados pessoais associados (incluindo e-mail, registos de IP e saldos) serão permanente e imediatamente eliminados das nossas bases de dados ativas.
          </Note>

          <SectionHeading id="seguranca" num={9}>COMO MANTEMOS AS SUAS INFORMAÇÕES SEGURAS?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Implementamos medidas de segurança técnicas e organizacionais apropriadas para proteger a segurança de qualquer informação pessoal que processamos, incluindo encriptação para dados em trânsito e armazenamento seguro em base de dados. No entanto, apesar das nossas salvaguardas, nenhuma transmissão eletrónica pela Internet ou tecnologia de armazenamento de informações pode ser garantida como 100% segura, pelo que não podemos prometer ou garantir que cibercriminosos ou outros terceiros não autorizados não consigam derrotar a nossa segurança e coletar, aceder, roubar ou modificar indevidamente as suas informações.
          </p>

          <SectionHeading id="direitos-de-privacidade" num={10}>QUAIS SÃO OS SEUS DIREITOS DE PRIVACIDADE?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Independentemente de onde reside globalmente, respeitamos os seus direitos de privacidade e fornecemos-lhe a capacidade de solicitar acesso, retificação ou eliminação absoluta dos seus dados pessoais. Se estiver localizado no Espaço Económico Europeu (EEE), Reino Unido (RU) ou outras jurisdições com estruturas de privacidade abrangentes (como o GDPR), possui direitos legais específicos relativamente aos seus dados, que honramos através das nossas políticas globais de eliminação e acesso a dados.
          </p>

          <SectionHeading id="nao-rastreamento" num={11}>CONTROLES PARA FUNÇÕES DE NÃO RASTREAMENTO</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            A maioria dos navegadores web e alguns sistemas operativos móveis incluem uma funcionalidade ou definição Do-Not-Track (&ldquo;DNT&rdquo;) que pode ativar para sinalizar a sua preferência de privacidade. Nesta fase, nenhum padrão tecnológico uniforme para reconhecer e implementar sinais DNT foi finalizado. Como tal, atualmente não respondemos a sinais de navegador DNT ou qualquer outro mecanismo que comunique automaticamente a sua escolha de não ser rastreado online.
          </p>

          <SectionHeading id="residentes-eua" num={12}>RESIDENTES DOS ESTADOS UNIDOS TÊM DIREITOS ESPECÍFICOS DE PRIVACIDADE?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Sim, se for residente de estados com leis de privacidade abrangentes (como Califórnia, Virgínia, Colorado, Connecticut ou Utah), são-lhe concedidos direitos específicos relativamente às suas informações pessoais. Garantimos a conformidade não vendendo os seus dados pessoais, não os partilhando para publicidade comportamental entre contextos e permitindo-lhe solicitar a eliminação imediata dos seus dados contactando-nos diretamente.
          </p>

          <SectionHeading id="outras-regioes" num={13}>OUTRAS REGIÕES TÊM DIREITOS ESPECÍFICOS DE PRIVACIDADE?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Sim, os utilizadores que acedem aos nossos serviços de outras regiões, incluindo nações africanas (como Moçambique ao abrigo das leis locais de transações eletrónicas e proteção de dados), têm a garantia de que os seus dados eletrónicos são processados de forma transparente, segura e exclusivamente para a execução dos serviços de pesquisa arquitetónica explicitamente contratados na nossa plataforma.
          </p>

          <SectionHeading id="atualizacoes" num={14}>FAZEMOS ATUALIZAÇÕES A ESTE AVISO?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Podemos atualizar este Aviso de Privacidade periodicamente. A versão atualizada será indicada por uma data &ldquo;Revisto&rdquo; atualizada e entrará em vigor assim que estiver acessível. Encorajamo-lo a rever este Aviso de Privacidade frequentemente para se manter informado sobre como estamos a proteger as suas informações.
          </p>

          <SectionHeading id="contacto" num={15}>COMO PODE CONTACTAR-NOS SOBRE ESTE AVISO?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-4">
            Se tiver perguntas, comentários ou preocupações sobre este aviso, pode enviar-nos um e-mail diretamente para:
          </p>
          <Note>
            <strong>SaaSarc / arquiv</strong>
            <br />
            E-mail:{" "}
            <a href="mailto:support@arquiv.org" className="underline underline-offset-2">
              support@arquiv.org
            </a>
          </Note>

          <SectionHeading id="revisao-eliminacao" num={16}>COMO PODE REVER, ATUALIZAR OU ELIMINAR OS DADOS QUE COLECTAMOS DE SI?</SectionHeading>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            Com base nas leis aplicáveis do seu país, tem o direito de solicitar acesso às informações pessoais que coletamos de si, alterar essas informações ou eliminá-las.
          </p>
          <Warning>
            <strong>Eliminação de conta:</strong> Para solicitar a eliminação da sua conta e apagar permanentemente os seus dados do nosso sistema, envie um pedido de e-mail explícito para support@arquiv.org usando o endereço de e-mail associado à sua conta. Processaremos o seu pedido e eliminaremos permanentemente os seus registos das nossas bases de dados imediatamente após a verificação.
          </Warning>

          {/* Footer bar */}
          <div className="mt-16 pt-8 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-400">Última atualização: 11 de Junho de 2026</p>
              <p className="text-xs text-zinc-400">
                Contacto:{" "}
                <a href="mailto:support@arquiv.org" className="underline underline-offset-2 hover:text-zinc-600 transition-colors">
                  support@arquiv.org
                </a>
              </p>
            </div>
            <Link href="/termosofuse" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 underline underline-offset-2 transition-colors">
              ← Ver Termos de Uso
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
