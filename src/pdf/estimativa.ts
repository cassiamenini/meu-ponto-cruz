// Estimativa de linha (meadas) e materiais.
//
// Conta usada para cada ponto cruz inteiro:
//  - na frente, as duas diagonais do quadradinho: 2 × lado × √2;
//  - no avesso, o caminho até o próximo ponto: cerca de 2 × lado;
//  - mais 50% de sobra (começo, arremate, pontas cortadas e erros).
// Uma meada DMC Mouliné tem 8 m com 6 fios; usando 2 fios, rende 3 pedaços de 8 m.
// É uma estimativa: cada pessoa borda de um jeito. Sempre vale comprar uma a mais.

import type { Tecido } from '../estado';

export const METROS_POR_MEADA = 8;
export const FIOS_POR_MEADA = 6;
export const SOBRA = 1.5;

/** Quantos fios da meada usar em cada tecido (para cobrir bem o tecido). */
export function fiosRecomendados(tecido: Tecido): number {
  return tecido === 11 ? 3 : tecido === 18 ? 1 : 2;
}

/** Número da agulha de tapeçaria (ponta arredondada) mais indicado. */
export function agulhaRecomendada(tecido: Tecido): string {
  return { 11: '22', 14: '24', 16: '24 ou 26', 18: '26' }[tecido];
}

/** Centímetros de linha gastos por ponto, já com a sobra. */
export function cmPorPonto(tecido: Tecido): number {
  const lado = 2.54 / tecido;
  return lado * (2 * Math.SQRT2 + 2) * SOBRA;
}

/** Quantas meadas comprar para fazer esta quantidade de pontos. */
export function meadasNecessarias(pontos: number, tecido: Tecido, fios = fiosRecomendados(tecido)): number {
  if (pontos <= 0) return 0;
  const cmPorMeada = METROS_POR_MEADA * 100 * (FIOS_POR_MEADA / fios);
  return Math.max(1, Math.ceil((pontos * cmPorPonto(tecido)) / cmPorMeada));
}
