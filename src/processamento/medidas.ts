// Contas de tamanho: pontos, centímetros e tecido.

import { LIMITES_GRADE } from './converter';

export const CM_POR_POLEGADA = 2.54;
/** Sobra de tecido recomendada em cada lado, para o bastidor e o acabamento. */
export const MARGEM_CM = 5;

/** Altura em pontos que mantém a proporção da imagem. */
export function alturaProporcional(largura: number, larguraImagem: number, alturaImagem: number): number {
  return Math.max(1, Math.round((largura * alturaImagem) / larguraImagem));
}

/** Menor e maior largura possíveis para esta imagem, respeitando os limites da grade. */
export function faixaLargura(larguraImagem: number, alturaImagem: number): { min: number; max: number } {
  const { ladoMin, ladoMax } = LIMITES_GRADE;
  // a altura também não pode passar do limite
  const maxPelaAltura = Math.floor((ladoMax * larguraImagem) / alturaImagem);
  const max = Math.max(ladoMin, Math.min(ladoMax, maxPelaAltura));
  return { min: Math.min(ladoMin, max), max };
}

export function pontosParaCm(pontos: number, tecido: number): number {
  return (pontos * CM_POR_POLEGADA) / tecido;
}

/** Ex.: 18,1 */
export function formatarCm(cm: number): string {
  return cm.toFixed(1).replace('.', ',');
}
