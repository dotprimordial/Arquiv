const BASE = 'http://localhost:3000';

const QUERIES = [
  "qual a area maxima de ocupação do terreno",
  "taxa de ocupação permitida",
  "coeficiente de aproveitamento do terreno",
  "indice de utilização do solo",
  "area de implantação maxima",
  "percentagem de ocupação do lote",
  "coeficiente de ocupação do solo",
  "area maxima construida por metro quadrado",
  "altura maxima do edificio",
  "numero de pavimentos maximo",
  "gabarito de altura permitido",
  "altura da cumeeira",
  "pé direito minimo",
  "altura maxima do muro",
  "recuo frontal minimo",
  "afastamento lateral",
  "recuo de fundos",
  "distancia entre edificios",
  "recuo obrigatorio da via",
  "afastamento das divisas",
  "numero de vagas de garagem obrigatorio",
  "area de estacionamento minima",
  "dimensões minimas de vaga",
  "taxa de estacionamento por metro quadrado",
  "vagas para deficientes obrigatorias",
  "largura minima de porta",
  "rampa de acesso inclinação maxima",
  "corrimão altura obrigatoria",
  "largura minima de corredor",
  "distancia entre pilares",
  "espessura minima de laje",
  "taxa de armadura minima",
  "cobertura de betão minima",
  "distancia maxima saida incendio",
  "largura minima escada incendio",
  "extintor distancia maxima",
  "porta corta fogo obrigatoria",
  "sprinklers obrigatorios",
  "diametro minimo esgoto",
  "altura tomada eletrica",
  "carga eletrica minima",
  "caixa de gordura obrigatoria",
  "area minima de ventilação",
  "iluminação natural obrigatoria",
  "isolamento acustico parede",
  "resistencia termica cobertura",
  "area verde obrigatoria",
  "permeabilidade do solo percentual",
  "numero de sanitarios obrigatorio",
  "area minima de quarto",
];

const TOTAL = 1000;
const CONCURRENCY = 5;

async function sendSearch(query) {
  const body = new URLSearchParams({ query });
  const start = Date.now();
  try {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    return { status: res.status, time: Date.now() - start };
  } catch (err) {
    return { status: 'ERR', time: Date.now() - start, error: err.message };
  }
}

async function worker(completed, times, errors) {
  while (true) {
    const idx = completed.index++;
    if (idx >= TOTAL) break;
    const query = QUERIES[idx % QUERIES.length];
    const result = await sendSearch(query);
    times.push(result.time);
    if (result.status !== 200) errors.push(result);
    if ((idx + 1) % 100 === 0) {
      process.stdout.write(`\r  ${idx + 1}/${TOTAL} requests`);
    }
  }
}

async function run() {
  console.log(`Iniciando teste de carga:`);
  console.log(`  URL: ${BASE}`);
  console.log(`  Total: ${TOTAL} requisições`);
  console.log(`  Concorrência: ${CONCURRENCY} workers`);
  console.log(`  Queries distintas: ${QUERIES.length}`);
  console.log('');

  const completed = { index: 0 };
  const times = [];
  const errors = [];

  const startAll = Date.now();
  await Promise.all(
    Array.from({ length: CONCURRENCY }, () => worker(completed, times, errors))
  );
  const totalTime = Date.now() - startAll;

  process.stdout.write('\r  1000/1000 requests\n\n');

  if (times.length === 0) {
    console.log('Nenhuma requisição completada.');
    return;
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const sorted = [...times].sort((a, b) => a - b);

  console.log('--- RESULTADOS ---');
  console.log(`Tempo total:           ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`Média:                 ${avg.toFixed(0)}ms`);
  console.log(`Mínimo:                ${sorted[0]}ms`);
  console.log(`Máximo:                ${sorted[sorted.length - 1]}ms`);
  console.log(`P50 (mediana):          ${sorted[Math.floor(sorted.length * 0.50)]}ms`);
  console.log(`P75:                   ${sorted[Math.floor(sorted.length * 0.75)]}ms`);
  console.log(`P90:                   ${sorted[Math.floor(sorted.length * 0.90)]}ms`);
  console.log(`P95:                   ${sorted[Math.floor(sorted.length * 0.95)]}ms`);
  console.log(`P99:                   ${sorted[Math.floor(sorted.length * 0.99)]}ms`);
  console.log(`Requisições/segundo:   ${(TOTAL / (totalTime / 1000)).toFixed(1)}`);
  console.log(`Erros:                 ${errors.length}`);
}

run().catch(console.error);
