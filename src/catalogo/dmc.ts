// Catálogo de linhas DMC (Mouliné Spécial, art. 117).
// Os dados vêm de dmc.json, gerado por scripts/montar-catalogo.ts.
// Veja src/catalogo/FONTES.md para a origem e os limites de cada informação.

import dados from './dmc.json';
import { deltaE2000, rgbParaLab, type Lab, type Rgb } from '../cores/cielab';

export interface Linha {
  marca: 'DMC';
  codigo: string;
  nome: string;
  hex: string;
  rgb: Rgb;
  lab: Lab;
  /** Aviso quando a cor na tela merece desconfiança extra. */
  conferir?: string;
}

export const AVISO_CORES = dados.aviso;

export const LINHAS_DMC: readonly Linha[] = dados.cores.map((c) => ({
  marca: 'DMC',
  codigo: c.codigo,
  nome: c.nome,
  hex: c.hex,
  rgb: c.rgb as unknown as Rgb,
  lab: rgbParaLab(c.rgb as unknown as Rgb),
  ...('conferir' in c && typeof c.conferir === 'string' ? { conferir: c.conferir } : {}),
}));

const porCodigo = new Map(LINHAS_DMC.map((l) => [l.codigo.toUpperCase(), l]));

export function buscarLinha(codigo: string): Linha | undefined {
  return porCodigo.get(codigo.trim().toUpperCase());
}

/**
 * Encontra a linha cuja cor é a mais parecida com a cor pedida,
 * medindo a diferença como o olho humano percebe (CIEDE2000).
 */
export function linhaMaisProxima(cor: Lab | Rgb, opcoes: readonly Linha[] = LINHAS_DMC): { linha: Linha; deltaE: number } {
  if (opcoes.length === 0) throw new Error('Nenhuma linha para comparar.');
  const alvo = Array.isArray(cor) ? rgbParaLab(cor as Rgb) : (cor as Lab);
  let melhor = opcoes[0];
  let menor = Infinity;
  for (const linha of opcoes) {
    const d = deltaE2000(alvo, linha.lab);
    if (d < menor) {
      menor = d;
      melhor = linha;
    }
  }
  return { linha: melhor, deltaE: menor };
}
