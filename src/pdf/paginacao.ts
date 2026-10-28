// Divisão do gráfico em páginas A4.
// Cada página mostra um número redondo de pontos (múltiplo de 10), para as
// linhas grossas de 10 em 10 coincidirem com as bordas das páginas.

export const A4 = { largura: 210, altura: 297 }; // mm
// 10 mm: seguro para qualquer impressora e deixa caber 60 colunas por folha
// (a largura padrão do nível iniciante) com quadradinhos de 3 mm.
export const MARGEM = 10; // mm
export const CABECALHO = 14; // mm (título da página)
export const RODAPE = 8; // mm
export const REGUA = 7; // mm (números das colunas e linhas)

export type TamanhoQuadradinho = 'normal' | 'ampliado';
export const MM_POR_PONTO: Record<TamanhoQuadradinho, number> = { normal: 3, ampliado: 4 };

/** Área livre para os quadradinhos em cada página, em mm. */
export function areaDoGrafico(): { largura: number; altura: number } {
  return {
    largura: A4.largura - 2 * MARGEM - REGUA,
    altura: A4.altura - 2 * MARGEM - CABECALHO - RODAPE - REGUA,
  };
}

/** Quantos pontos cabem em cada página (sempre múltiplo de 10). */
export function pontosPorPagina(mmPorPonto: number): { colunas: number; linhas: number } {
  const area = areaDoGrafico();
  const redondo = (n: number) => Math.max(10, Math.floor(n / 10) * 10);
  return { colunas: redondo(area.largura / mmPorPonto), linhas: redondo(area.altura / mmPorPonto) };
}

export interface PaginaDoGrafico {
  /** Número da página dentro desta versão do gráfico (1, 2, 3...). */
  numero: number;
  /** Posição no mapa de páginas (0 = primeira coluna / primeira fileira). */
  posicaoX: number;
  posicaoY: number;
  /** Pontos desta página: colunas [coluna0, coluna1) e linhas [linha0, linha1). */
  coluna0: number;
  coluna1: number;
  linha0: number;
  linha1: number;
  /** Primeiras colunas e linhas que repetem o fim da folha vizinha (ficam acinzentadas). */
  repeteColunas: number;
  repeteLinhas: number;
}

/** Colunas e linhas repetidas entre folhas vizinhas, para ajudar a emendar. */
export const SOBREPOSICAO = 2;

/** Onde começa cada folha numa direção: a partir da segunda, recua a sobreposição. */
function cortes(total: number, porPagina: number, sobra: number): number[] {
  if (total <= porPagina) return [0];
  const passo = porPagina - sobra;
  const inicios: number[] = [];
  for (let i = 0; ; i += passo) {
    inicios.push(i);
    if (i + porPagina >= total) return inicios;
  }
}

/**
 * Divide o gráfico em páginas, da esquerda para a direita e de cima para baixo
 * (como se lê um livro). Cada folha repete as últimas `sobra` colunas/linhas da
 * folha anterior.
 */
export function dividirEmPaginas(
  largura: number,
  altura: number,
  colunasPorPagina: number,
  linhasPorPagina: number,
  sobra = 0,
): PaginaDoGrafico[] {
  const paginas: PaginaDoGrafico[] = [];
  const xs = cortes(largura, colunasPorPagina, sobra);
  const ys = cortes(altura, linhasPorPagina, sobra);
  ys.forEach((linha0, y) => {
    xs.forEach((coluna0, x) => {
      paginas.push({
        numero: paginas.length + 1,
        posicaoX: x,
        posicaoY: y,
        coluna0,
        coluna1: Math.min(largura, coluna0 + colunasPorPagina),
        linha0,
        linha1: Math.min(altura, linha0 + linhasPorPagina),
        repeteColunas: x > 0 ? sobra : 0,
        repeteLinhas: y > 0 ? sobra : 0,
      });
    });
  });
  return paginas;
}

/** Quantas linhas da legenda cabem em cada página. */
export const LINHAS_LEGENDA_POR_PAGINA = 20;

/** Páginas da Parte 1 (capa + guia para iniciantes). Conferido pelos testes. */
export const PAGINAS_DA_APOSTILA = 7;

export type Versoes = 'ambos' | 'colorido' | 'pb';

export function quantasVersoes(v: Versoes): number {
  return v === 'ambos' ? 2 : 1;
}

export function paginasDoGrafico(largura: number, altura: number, tamanho: TamanhoQuadradinho): PaginaDoGrafico[] {
  const { colunas, linhas } = pontosPorPagina(MM_POR_PONTO[tamanho]);
  return dividirEmPaginas(largura, altura, colunas, linhas, SOBREPOSICAO);
}

/** Total de páginas do PDF (para avisar antes de gerar). */
export function contarPaginas(
  g: { largura: number; altura: number; paleta: readonly unknown[] },
  op: { versoes: Versoes; tamanho: TamanhoQuadradinho },
): { total: number; apostila: number; resumo: number; mapa: number; legenda: number; acompanhamento: number; grafico: number; instrucoes: number } {
  const legenda = Math.ceil(g.paleta.length / LINHAS_LEGENDA_POR_PAGINA);
  const folhas = paginasDoGrafico(g.largura, g.altura, op.tamanho).length;
  const grafico = quantasVersoes(op.versoes) * folhas;
  const partes = { apostila: PAGINAS_DA_APOSTILA, resumo: 1, mapa: folhas > 1 ? 1 : 0, legenda, acompanhamento: legenda, grafico, instrucoes: 1 };
  return { total: Object.values(partes).reduce((s, n) => s + n, 0), ...partes };
}
