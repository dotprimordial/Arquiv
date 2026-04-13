export interface Norm {
  id: string;
  code: string;
  country: string;
  category: string;
  title: string;
  description: string;
  keywords: string[];
}

export const normsDatabase: Norm[] = [
  // Portugal
  {
    id: "pt-1",
    code: "RGEU",
    country: "Portugal",
    category: "Urbanismo",
    title: "Regulamento Geral das Edificações Urbanas",
    description: "Define as regras gerais para a construção de edifícios em Portugal, incluindo afastamentos, alturas e condições de habitabilidade.",
    keywords: ["afastamento", "edifícios", "construção", "habitabilidade", "janelas", "vãos"]
  },
  {
    id: "pt-2",
    code: "REH",
    country: "Portugal",
    category: "Térmica e Acústica",
    title: "Regulamento de Desempenho Energético dos Edifícios de Habitação",
    description: "Estabelece os requisitos de eficiência energética e isolamento térmico para habitações.",
    keywords: ["energia", "térmica", "isolamento", "climatização", "eficiência"]
  },
  {
    id: "pt-3",
    code: "DL 163/2006",
    country: "Portugal",
    category: "Acessibilidade",
    title: "Regime da Acessibilidade aos Edifícios e Via Pública",
    description: "Normas técnicas de acessibilidade para pessoas com mobilidade condicionada.",
    keywords: ["acessibilidade", "rampas", "cadeira de rodas", "mobilidade", "deficientes"]
  },
  {
    id: "pt-4",
    code: "SCIE",
    country: "Portugal",
    category: "Segurança contra Incêndio",
    title: "Segurança Contra Incêndio em Edifícios",
    description: "Regulamento técnico que define as medidas de proteção contra incêndios em diversos tipos de edifícios.",
    keywords: ["fogo", "incêndio", "evacuação", "extintores", "segurança"]
  },
  {
    id: "pt-5",
    code: "RGEU Art. 73",
    country: "Portugal",
    category: "Urbanismo",
    title: "Afastamentos Laterais e de Tardoz",
    description: "Especifica as distâncias mínimas entre edifícios e os limites do lote para garantir iluminação e ventilação.",
    keywords: ["afastamento", "lote", "vizinho", "janela", "ventilação"]
  },

  // Brasil
  {
    id: "br-1",
    code: "NBR 9050",
    country: "Brasil",
    category: "Acessibilidade",
    title: "Acessibilidade a edificações, mobiliário, espaços e equipamentos urbanos",
    description: "A principal norma brasileira sobre acessibilidade, definindo parâmetros técnicos para garantir o uso por todos.",
    keywords: ["acessibilidade", "rampas", "banheiros", "sinalização", "piso tátil"]
  },
  {
    id: "br-2",
    code: "NBR 6118",
    country: "Brasil",
    category: "Estruturas",
    title: "Projeto de estruturas de concreto - Procedimento",
    description: "Define os critérios para o dimensionamento e execução de estruturas de concreto armado e protendido.",
    keywords: ["concreto", "estrutura", "dimensionamento", "vigas", "pilares"]
  },
  {
    id: "br-3",
    code: "NBR 15575",
    country: "Brasil",
    category: "Sustentabilidade",
    title: "Edificações habitacionais — Desempenho",
    description: "Conhecida como a Norma de Desempenho, estabelece requisitos para a vida útil, conforto térmico e acústico das edificações.",
    keywords: ["desempenho", "conforto", "vida útil", "acústica", "térmica"]
  },
  {
    id: "br-4",
    code: "NBR 5410",
    country: "Brasil",
    category: "Instalações Elétricas",
    title: "Instalações elétricas de baixa tensão",
    description: "Regras para garantir a segurança e o funcionamento correto das instalações elétricas em edifícios.",
    keywords: ["elétrica", "fiação", "quadro", "disjuntor", "segurança"]
  },
  {
    id: "br-5",
    code: "Código de Obras",
    country: "Brasil",
    category: "Urbanismo",
    title: "Afastamentos e Recuos Obrigatórios",
    description: "Define as distâncias mínimas que uma construção deve manter em relação aos limites do terreno e à via pública.",
    keywords: ["recuo", "afastamento", "terreno", "calçada", "limite"]
  },

  // Alemanha (DE)
  {
    id: "de-1",
    code: "DIN 18040-1",
    country: "Alemanha",
    category: "Acessibilidade",
    title: "Barrierefreies Bauen - Planungsgrundlagen - Teil 1: Öffentlich zugängliche Gebäude",
    description: "Norma alemã para construção sem barreiras em edifícios públicos.",
    keywords: ["barrierefrei", "acessibilidade", "público", "planeamento"]
  },
  {
    id: "de-2",
    code: "EnEV",
    country: "Alemanha",
    category: "Térmica e Acústica",
    title: "Energieeinsparverordnung",
    description: "Regulamento de poupança de energia para edifícios na Alemanha.",
    keywords: ["energia", "eficiência", "isolamento", "aquecimento"]
  },
  {
    id: "de-3",
    code: "BauO",
    country: "Alemanha",
    category: "Urbanismo",
    title: "Bauordnung",
    description: "Regulamentos de construção estaduais que definem afastamentos e segurança.",
    keywords: ["afastamento", "segurança", "construção", "distância"]
  }
];
