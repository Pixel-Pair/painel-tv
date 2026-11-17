// Roda no GitHub Actions: busca Ibovespa e outros índices no Yahoo Finance
// e grava data/indices.json, publicado junto com o painel (sem problema de CORS).
import { mkdirSync, writeFileSync } from "node:fs";

const SIMBOLOS = {
  IBOVESPA: "^BVSP",
  IFIX: "IFIX.SA",
  NASDAQ: "^IXIC",
  DOWJONES: "^DJI",
  SP500: "^GSPC",
};
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" };

async function chart(sym, range, interval) {
  for (const host of ["query1", "query2"]) {
    try {
      const r = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`, { headers: UA });
      if (!r.ok) { console.log(sym, host, r.status); continue; }
      const res = (await r.json()).chart.result[0];
      const ts = res.timestamp || [], cl = res.indicators.quote[0].close || [];
      return { meta: res.meta, pts: ts.map((t, i) => ({ t, v: cl[i] })).filter(p => p.v != null) };
    } catch (e) { console.log(sym, host, e.message); }
  }
  return null;
}

const out = { atualizado: Math.floor(Date.now() / 1000), itens: {} };
for (const [nome, sym] of Object.entries(SIMBOLOS)) {
  const dia = await chart(sym, "1d", "5m");
  const mes = await chart(sym, "1mo", "1d");
  if (!dia && !mes) continue;
  const meta = (dia || mes).meta;
  const preco = meta.regularMarketPrice;
  const anterior = meta.previousClose ?? meta.chartPreviousClose;
  const dv = (dia?.pts || []).map(p => p.v);
  out.itens[nome] = {
    pontos: preco,
    variacao: anterior ? (preco / anterior - 1) * 100 : 0,
    variacaoPts: anterior ? preco - anterior : 0,
    minDia: dv.length ? Math.min(...dv) : meta.regularMarketDayLow,
    maxDia: dv.length ? Math.max(...dv) : meta.regularMarketDayHigh,
    hora: meta.regularMarketTime,
    dia: dv.map(v => Math.round(v * 100) / 100),
    mes: (mes?.pts || []).map(p => ({ t: p.t, v: Math.round(p.v * 100) / 100 })),
  };
  console.log(nome, preco);
}

if (!Object.keys(out.itens).length) { console.error("Nenhum índice obtido"); process.exit(1); }
mkdirSync("_site/data", { recursive: true });
writeFileSync("_site/data/indices.json", JSON.stringify(out));
