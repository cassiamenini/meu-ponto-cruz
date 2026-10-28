// Equivalências DMC → Anchor e DMC → Maxi, tiradas das tabelas de conversão
// impressas pelos fabricantes. Gerado por scripts/montar-equivalencias.ts;
// veja src/catalogo/FONTES.md.

import dados from './equivalencias.json';

export const SEM_COR_CORRELATA = 'sem cor correlata';
export const AVISO_EQUIVALENCIAS = dados.aviso;

const cores = Object.fromEntries(
  Object.entries(dados.cores as Record<string, { anchor?: string[]; maxi?: string }>).map(([k, v]) => [k.toUpperCase(), v]),
);

export interface Equivalentes {
  /** Uma ou duas opções, da mais parecida para a menos parecida. Vazio = sem cor correlata. */
  anchor: readonly string[];
  maxi?: string;
}

export function equivalentes(codigoDmc: string): Equivalentes {
  const c = cores[codigoDmc.trim().toUpperCase()];
  return { anchor: c?.anchor ?? [], maxi: c?.maxi };
}

/** Texto curto para a legenda: "42", "376 ou 388" ou "sem cor correlata". */
export function textoAnchor(codigoDmc: string): string {
  const { anchor } = equivalentes(codigoDmc);
  return anchor.length ? anchor.join(' ou ') : SEM_COR_CORRELATA;
}

export function textoMaxi(codigoDmc: string): string {
  return equivalentes(codigoDmc).maxi ?? SEM_COR_CORRELATA;
}
