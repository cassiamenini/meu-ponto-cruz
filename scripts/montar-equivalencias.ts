// Gera src/catalogo/equivalencias.json a partir das tabelas impressas pelos
// fabricantes (transcritas em dados/equivalencias/). Nada é inventado: só
// entram códigos que aparecem nas tabelas. As cores medidas servem apenas para
// ordenar alternativas e escolher entre as duas edições da tabela da Círculo.
// Uso: node scripts/montar-equivalencias.ts

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { deltaE2000, hexParaRgb, rgbParaLab, type Rgb } from '../src/cores/cielab.ts';

/** Acima disto a cor Maxi indicada fica longe demais: tratamos como sem cor correlata. */
const LIMITE_MAXI = 25;
/** Quantas alternativas Anchor mostrar, no máximo. */
const MAX_ANCHOR = 2;

const ler = (c: string) => readFileSync(c, 'utf8').replace(/^﻿/, '');
const pares = (c: string) =>
  ler(c)
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('\t').map((s) => s.trim().toUpperCase()) as [string, string]);

const dmc: { codigo: string; hex: string }[] = JSON.parse(ler('src/catalogo/dmc.json')).cores;
const hexDmc = new Map(dmc.map((c) => [c.codigo.toUpperCase(), c.hex]));

const fotosDmc: Record<string, Rgb> = JSON.parse(ler('dados/amostras-dmc-medias.json'));
const fotoDmc = (codigo: string) => fotosDmc[codigo] ?? fotosDmc[codigo.padStart(2, '0')];
const fotosMaxi: Record<string, Rgb> = JSON.parse(ler('dados/equivalencias/maxi-fotos-medias.json')).cores;

const arquivoAnchor = 'dados/equivalencias-imagens/stitchmate-anchor-cores.json';
const coresAnchor: Record<string, [string, string]> = existsSync(arquivoAnchor) ? JSON.parse(ler(arquivoAnchor)) : {};

// --- Anchor: tabela da própria Anchor; alternativas ordenadas pela cor mais próxima.
const anchorPorDmc = new Map<string, string[]>();
for (const [d, a] of pares('dados/equivalencias/dmc-anchor-tabela-anchor.tsv')) {
  anchorPorDmc.set(d, [...(anchorPorDmc.get(d) ?? []), a]);
}
const distanciaAnchor = (d: string, a: string) => {
  const h = hexDmc.get(d);
  const c = coresAnchor[a];
  return h && c ? deltaE2000(rgbParaLab(hexParaRgb(h)), rgbParaLab(hexParaRgb(c[0]))) : Infinity;
};

// --- Maxi: duas edições da tabela da Círculo; vale o código que ainda existe
// na cartela atual e cuja foto é mais parecida com a foto da DMC.
const edicaoA = new Map(pares('dados/equivalencias/dmc-maxi-circulo-a.tsv'));
const edicaoB = new Map(pares('dados/equivalencias/dmc-maxi-circulo-b.tsv'));
const distanciaMaxi = (d: string, m: string) => {
  const fd = fotoDmc(d);
  const fm = fotosMaxi[m];
  return fd && fm ? deltaE2000(rgbParaLab(fd), rgbParaLab(fm)) : null;
};
function escolherMaxi(d: string): string | undefined {
  const candidatos = [...new Set([edicaoB.get(d), edicaoA.get(d)])].filter(
    (m): m is string => !!m && m !== 'X' && m in fotosMaxi,
  );
  if (candidatos.length === 0) return undefined;
  const medidos = candidatos
    .map((m) => ({ m, de: distanciaMaxi(d, m) }))
    .filter((c): c is { m: string; de: number } => c.de !== null)
    .sort((x, y) => x.de - y.de);
  if (medidos.length === 0) return candidatos[0];
  return medidos[0].de <= LIMITE_MAXI ? medidos[0].m : undefined;
}

const cores: Record<string, { anchor?: string[]; maxi?: string }> = {};
let comAnchor = 0;
let comMaxi = 0;
for (const { codigo } of dmc) {
  const d = codigo.toUpperCase();
  const anchor = [...new Set(anchorPorDmc.get(d) ?? [])]
    .sort((x, y) => distanciaAnchor(d, x) - distanciaAnchor(d, y))
    .slice(0, MAX_ANCHOR);
  const maxi = escolherMaxi(d);
  if (anchor.length) comAnchor++;
  if (maxi) comMaxi++;
  if (anchor.length || maxi) cores[codigo] = { ...(anchor.length ? { anchor } : {}), ...(maxi ? { maxi } : {}) };
}

const saida = {
  aviso:
    'Cores aproximadas, conforme as tabelas de conversão impressas pelos fabricantes. Quando a tabela não traz a cor, mostramos "sem cor correlata".',
  fontes: {
    anchor: 'Tabela de Conversão DMC-Anchor, impressa pela Anchor (2 páginas).',
    maxi: 'Tabela de conversão DMC / Maxi Mouliné – cores aproximadas, Círculo S.A. (duas edições, numeração nova).',
  },
  cores,
};
writeFileSync('src/catalogo/equivalencias.json', JSON.stringify(saida, null, 1) + '\n');
console.log(`DMC: ${dmc.length} | com Anchor: ${comAnchor} | com Maxi: ${comMaxi}`);
