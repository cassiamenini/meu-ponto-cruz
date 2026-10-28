// Compara as duas edições da tabela DMC → Maxi da Círculo usando as cores
// medidas nas fotos oficiais das duas marcas (mesmo método de medição).
// Uso: node scripts/analisar-maxi.ts

import { readFileSync } from 'node:fs';
import { deltaE2000, rgbParaLab, type Rgb } from '../src/cores/cielab.ts';

const ler = (c: string) => readFileSync(c, 'utf8').replace(/^﻿/, '');
const tabela = (c: string) =>
  new Map(
    ler(c)
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.split('\t').map((s) => s.trim()) as [string, string]),
  );

const a = tabela('dados/equivalencias/dmc-maxi-circulo-a.tsv');
const b = tabela('dados/equivalencias/dmc-maxi-circulo-b.tsv');
const fotosDmc: Record<string, Rgb> = JSON.parse(ler('dados/amostras-dmc-medias.json'));
const fotosMaxi: Record<string, Rgb> = JSON.parse(ler('dados/equivalencias/maxi-fotos-medias.json')).cores;

const de = (dmc: string, maxi: string) => {
  const d = fotosDmc[dmc.toUpperCase()];
  const m = fotosMaxi[maxi];
  return d && m ? deltaE2000(rgbParaLab(d), rgbParaLab(m)) : null;
};

const fmt = (n: number | null) => (n === null ? '—' : n.toFixed(1));
const estat = (v: number[]) => {
  const s = [...v].sort((x, y) => x - y);
  return `n=${s.length} mediana=${fmt(s[Math.floor(s.length / 2)])} p90=${fmt(s[Math.floor(s.length * 0.9)])}`;
};

for (const [nome, t] of [['A', a], ['B', b]] as const) {
  const des: number[] = [];
  const inexistentes: string[] = [];
  for (const [dmc, maxi] of t) {
    if (maxi === 'x') continue;
    if (!fotosMaxi[maxi]) inexistentes.push(`${dmc}→${maxi}`);
    const d = de(dmc, maxi);
    if (d !== null) des.push(d);
  }
  console.log(`Edição ${nome}: ${estat(des)} | Maxi fora da cartela atual: ${inexistentes.length} ${inexistentes.join(' ')}`);
}

let venceA = 0;
let venceB = 0;
const linhas: string[] = [];
for (const [dmc, ma] of a) {
  const mb = b.get(dmc);
  if (!mb || mb === ma) continue;
  const da = ma === 'x' ? null : de(dmc, ma);
  const db = mb === 'x' ? null : de(dmc, mb);
  if (da !== null && db !== null) (da <= db ? venceA++ : venceB++);
  linhas.push(`${dmc}\tA ${ma} (${fmt(da)})\tB ${mb} (${fmt(db)})`);
}
console.log(`Divergências: ${linhas.length} | A mais próxima: ${venceA} | B mais próxima: ${venceB}`);
console.log(linhas.slice(0, 40).join('\n'));
