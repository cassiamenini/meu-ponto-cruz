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
}

/**
 * Divide o gráfico em páginas, da esquerda para a direita e de cima para baixo
 * (como se lê um livro).
 */
export function dividirEmPaginas(largura: number, altura: number, colunasPorPagina: number, linhasPorPagina: number): PaginaDoGrafico[] {
  const paginas: PaginaDoGrafico[] = [];
  const nx = Math.ceil(largura / colunasPorPagina);
  const ny = Math.ceil(altura / linhasPorPagina);
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      paginas.push({
        numero: paginas.length + 1,
        posicaoX: x,
        posicaoY: y,
        coluna0: x * colunasPorPagina,
        coluna1: Math.min(largura, (x + 1) * colunasPorPagina),
        linha0: y * linhasPorPagina,
        linha1: Math.min(altura, (y + 1) * linhasPorPagina),
      });
    }
  }
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
  return dividirEmPaginas(largura, altura, colunas, linhas);
}

/** Total de páginas do PDF (para avisar antes de gerar). */
export function contarPaginas(
  g: { largura: number; altura: number; paleta: readonly unknown[] },
  op: { versoes: Versoes; tamanho: TamanhoQuadradinho },
): { total: number; apostila: number; resumo: number; legenda: number; grafico: number; instrucoes: number } {
  const legenda = Math.ceil(g.paleta.length / LINHAS_LEGENDA_POR_PAGINA);
  const grafico = quantasVersoes(op.versoes) * paginasDoGrafico(g.largura, g.altura, op.tamanho).length;
  const partes = { apostila: PAGINAS_DA_APOSTILA, resumo: 1, legenda, grafico, instrucoes: 1 };
  return { total: partes.apostila + partes.resumo + partes.legenda + partes.grafico + partes.instrucoes, ...partes };
}
