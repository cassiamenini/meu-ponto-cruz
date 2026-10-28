// Confere a transcrição da tabela DMC → Anchor: o código Anchor precisa
// existir na cartela, e a cor dele não pode estar longe demais da DMC
// (diferença grande costuma ser erro de leitura).
// Uso: node scripts/conferir-anchor.ts

import { readFileSync } from 'node:fs';
import { deltaE2000, hexParaRgb, rgbParaLab } from '../src/cores/cielab.ts';

const ler = (c: string) => readFileSync(c, 'utf8').replace(/^﻿/, '');
const dmc = new Map<string, { hex: string; nome: string }>(
  JSON.parse(ler('src/catalogo/dmc.json')).cores.map((c: { codigo: string; hex: string; nome: string }) => [c.codigo.toUpperCase(), c]),
);
const anchor: Record<string, [string, string]> = JSON.parse(ler('dados/equivalencias-imagens/stitchmate-anchor-cores.json'));

const linhas = ler('dados/equivalencias/dmc-anchor-tabela-anchor.tsv')
  .split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => l.split('\t').map((s) => s.trim()));

const des: number[] = [];
for (const [d, a] of linhas) {
  const cd = dmc.get(d.toUpperCase());
  const ca = anchor[a];
  if (!cd) { console.log(`DMC inexistente: ${d}→${a}`); continue; }
  if (!ca) { console.log(`Anchor fora da cartela: ${d}→${a}`); continue; }
  const de = deltaE2000(rgbParaLab(hexParaRgb(cd.hex)), rgbParaLab(hexParaRgb(ca[0])));
  des.push(de);
  if (de > 12) console.log(`ΔE ${de.toFixed(1)}\t${d} ${cd.nome}\t→ ${a} ${ca[1]}`);
}
des.sort((x, y) => x - y);
console.log(`n=${des.length} mediana=${des[des.length >> 1].toFixed(1)} p90=${des[Math.floor(des.length * 0.9)].toFixed(1)}`);
