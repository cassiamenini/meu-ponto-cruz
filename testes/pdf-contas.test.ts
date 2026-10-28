import { describe, expect, it } from 'vitest';
import { dividirEmPaginas, MM_POR_PONTO, pontosPorPagina, areaDoGrafico } from '../src/pdf/paginacao';
import { cmPorPonto, fiosRecomendados, meadasNecessarias } from '../src/pdf/estimativa';

describe('páginas do gráfico', () => {
  it('cada página tem um número redondo de pontos que cabe no A4', () => {
    for (const mm of Object.values(MM_POR_PONTO)) {
      const { colunas, linhas } = pontosPorPagina(mm);
      expect(colunas % 10).toBe(0);
      expect(linhas % 10).toBe(0);
      expect(colunas * mm).toBeLessThanOrEqual(areaDoGrafico().largura);
      expect(linhas * mm).toBeLessThanOrEqual(areaDoGrafico().altura);
    }
  });

  it('tamanho normal: 60 × 80 pontos por página (o iniciante cabe numa folha); ampliado: 40 × 60', () => {
    expect(pontosPorPagina(MM_POR_PONTO.normal)).toEqual({ colunas: 60, linhas: 80 });
    expect(pontosPorPagina(MM_POR_PONTO.ampliado)).toEqual({ colunas: 40, linhas: 60 });
  });

  it('gráfico pequeno cabe em uma página só', () => {
    expect(dividirEmPaginas(45, 30, 50, 80)).toHaveLength(1);
  });

  it('as páginas cobrem todos os pontos, sem sobrar nem repetir', () => {
    const paginas = dividirEmPaginas(123, 171, 50, 80);
    expect(paginas).toHaveLength(3 * 3);
    const cobertos = new Uint8Array(123 * 171);
    for (const p of paginas) for (let l = p.linha0; l < p.linha1; l++) for (let c = p.coluna0; c < p.coluna1; c++) cobertos[l * 123 + c]++;
    expect(cobertos.every((n) => n === 1)).toBe(true);
  });

  it('a ordem é a de leitura: esquerda para a direita, depois para baixo', () => {
    const p = dividirEmPaginas(100, 160, 50, 80);
    expect(p.map((x) => [x.posicaoX, x.posicaoY])).toEqual([[0, 0], [1, 0], [0, 1], [1, 1]]);
    expect(p.map((x) => x.numero)).toEqual([1, 2, 3, 4]);
  });

  it('com sobreposição, cada folha repete 2 colunas e 2 linhas da vizinha e nada fica de fora', () => {
    const paginas = dividirEmPaginas(123, 171, 60, 80, 2);
    const cobertos = new Uint8Array(123 * 171);
    for (const p of paginas) {
      expect(p.coluna1 - p.coluna0).toBeLessThanOrEqual(60);
      expect(p.repeteColunas).toBe(p.posicaoX > 0 ? 2 : 0);
      expect(p.repeteLinhas).toBe(p.posicaoY > 0 ? 2 : 0);
      // a parte "nova" de cada folha não se repete em outra
      for (let l = p.linha0 + p.repeteLinhas; l < p.linha1; l++)
        for (let c = p.coluna0 + p.repeteColunas; c < p.coluna1; c++) cobertos[l * 123 + c]++;
    }
    expect(cobertos.every((n) => n === 1)).toBe(true);
    // e o que se repete é mesmo o fim da folha anterior
    expect(paginas[1].coluna0).toBe(paginas[0].coluna1 - 2);
  });

  it('gráfico que cabe numa folha não ganha sobreposição', () => {
    const p = dividirEmPaginas(60, 80, 60, 80, 2);
    expect(p).toHaveLength(1);
    expect(p[0].repeteColunas + p[0].repeteLinhas).toBe(0);
  });
});

describe('estimativa de meadas', () => {
  it('fios recomendados por tecido', () => {
    expect(fiosRecomendados(11)).toBe(3);
    expect(fiosRecomendados(14)).toBe(2);
    expect(fiosRecomendados(18)).toBe(1);
  });

  it('em Etamine 14 com 2 fios, uma meada rende cerca de 1.800 pontos', () => {
    const pontosPorMeada = 2400 / cmPorPonto(14);
    expect(pontosPorMeada).toBeGreaterThan(1700);
    expect(pontosPorMeada).toBeLessThan(1900);
    expect(meadasNecessarias(1800, 14)).toBe(1);
    expect(meadasNecessarias(1900, 14)).toBe(2);
  });

  it('mesmo poucos pontos pedem uma meada; nenhum ponto, nenhuma', () => {
    expect(meadasNecessarias(3, 14)).toBe(1);
    expect(meadasNecessarias(0, 14)).toBe(0);
  });

  it('tecido de trama mais aberta gasta mais linha por ponto', () => {
    expect(cmPorPonto(11)).toBeGreaterThan(cmPorPonto(14));
  });
});
