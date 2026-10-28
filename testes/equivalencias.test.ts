import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import dados from '../src/catalogo/equivalencias.json';
import { buscarLinha } from '../src/catalogo/dmc';
import { equivalentes, SEM_COR_CORRELATA, textoAnchor, textoMaxi } from '../src/catalogo/equivalencias';

const pares = (arquivo: string) =>
  readFileSync(arquivo, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('\t').map((s) => s.trim().toUpperCase()));

const tabelaAnchor = pares('dados/equivalencias/dmc-anchor-tabela-anchor.tsv');
const maxiA = new Map(pares('dados/equivalencias/dmc-maxi-circulo-a.tsv') as [string, string][]);
const maxiB = new Map(pares('dados/equivalencias/dmc-maxi-circulo-b.tsv') as [string, string][]);
const cores = dados.cores as Record<string, { anchor?: string[]; maxi?: string }>;

describe('equivalências DMC → Anchor e Maxi', () => {
  it('nada é inventado: todo código vem da tabela do fabricante para aquela mesma cor DMC', () => {
    for (const [dmc, c] of Object.entries(cores)) {
      expect(buscarLinha(dmc), dmc).toBeDefined();
      for (const a of c.anchor ?? []) expect(tabelaAnchor.some(([d, x]) => d === dmc.toUpperCase() && x === a), `${dmc}→Anchor ${a}`).toBe(true);
      if (c.maxi) expect([maxiA.get(dmc.toUpperCase()), maxiB.get(dmc.toUpperCase())], `${dmc}→Maxi ${c.maxi}`).toContain(c.maxi);
    }
  });

  it('exemplos conferidos nas tabelas impressas', () => {
    expect(equivalentes('321').anchor).toEqual(['42']);
    expect(equivalentes('3865').anchor).toEqual(['2']);
    expect(equivalentes('B5200').anchor).toEqual(['1']);
    expect(textoMaxi('BLANC')).toBe('100');
    expect(textoMaxi('ECRU')).toBe('888');
  });

  it('quando a tabela não traz a cor, mostra "sem cor correlata" e segue', () => {
    // Blanc e Ecru não estão na tabela da Anchor, mas estão na da Maxi
    expect(textoAnchor('BLANC')).toBe(SEM_COR_CORRELATA);
    expect(textoAnchor('ECRU')).toBe(SEM_COR_CORRELATA);
    expect(textoMaxi('53')).toBe(SEM_COR_CORRELATA); // "x" nas duas edições da Círculo
    expect(textoAnchor('código que não existe')).toBe(SEM_COR_CORRELATA);
  });

  it('várias opções Anchor aparecem juntas, no máximo duas', () => {
    expect(textoAnchor('842')).toMatch(/^\d+ ou \d+$/);
    for (const c of Object.values(cores)) expect((c.anchor ?? []).length).toBeLessThanOrEqual(2);
  });
});
