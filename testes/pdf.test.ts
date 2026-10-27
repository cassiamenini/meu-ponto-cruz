import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gerarPdf, nomeDoArquivo, type Fontes } from '../src/pdf/gerar';
import type { OpcoesPdf } from '../src/pdf/grafico-pdf';
import { contarPaginas as contar } from '../src/pdf/paginacao';

const contarPaginas = (...a: Parameters<typeof contar>) => contar(...a).total;
import { converter } from '../src/processamento/converter';

const fontes: Fontes = {
  regular: readFileSync('public/fonts/AtkinsonHyperlegible-Regular.ttf').buffer as ArrayBuffer,
  negrito: readFileSync('public/fonts/AtkinsonHyperlegible-Bold.ttf').buffer as ArrayBuffer,
};

function graficoDeTeste(largura: number, altura: number, maxCores: number) {
  const w = largura * 4;
  const h = altura * 4;
  const p = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      p.set([(x * 255) / w, (y * 255) / h, ((x + y) * 128) / (w + h), 255], (y * w + x) * 4);
    }
  }
  return converter(p, w, h, { largura, altura, maxCores, limpeza: 'media' });
}

const opcoes = (o: Partial<OpcoesPdf> = {}): OpcoesPdf => ({
  nomeProjeto: 'Casinha de Campo',
  versoes: 'ambos',
  tamanho: 'normal',
  tecido: 14,
  ...o,
});

/** Conta as páginas lendo o PDF gerado. */
async function paginasDoPdf(blob: Blob): Promise<number> {
  const texto = new TextDecoder('latin1').decode(await blob.arrayBuffer());
  return (texto.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

describe('PDF', () => {
  it('gráfico pequeno: apostila + resumo + legenda + 1 página colorida + 1 P&B + instruções', async () => {
    const g = graficoDeTeste(40, 30, 8);
    const blob = await gerarPdf(g, opcoes(), {}, fontes);
    expect(blob.type).toBe('application/pdf');
    const paginas = await paginasDoPdf(blob);
    expect(paginas).toBe(contarPaginas(g, opcoes()));
    expect(paginas).toBe(7 + 1 + 1 + 2 + 1);
    // guarda uma cópia para conferência visual
    mkdirSync('dados/testes', { recursive: true });
    writeFileSync('dados/testes/exemplo-pequeno.pdf', Buffer.from(await blob.arrayBuffer()));
  }, 30000);

  it('a apostila está sempre presente, mesmo com só uma versão do gráfico', async () => {
    const g = graficoDeTeste(20, 20, 3);
    const blob = await gerarPdf(g, opcoes({ versoes: 'pb' }), {}, fontes);
    expect(await paginasDoPdf(blob)).toBe(7 + 1 + 1 + 1 + 1);
  }, 30000);

  it('o maior gráfico (250 × 188, 40 cores) é dividido em páginas e termina a tempo', async () => {
    const g = graficoDeTeste(250, 188, 40);
    const inicio = performance.now();
    const blob = await gerarPdf(g, opcoes({ tamanho: 'ampliado' }), {}, fontes);
    const segundos = (performance.now() - inicio) / 1000;
    expect(await paginasDoPdf(blob)).toBe(contarPaginas(g, opcoes({ tamanho: 'ampliado' })));
    console.log(`PDF grande: ${await paginasDoPdf(blob)} páginas, ${(blob.size / 1024 / 1024).toFixed(1)} MB, ${segundos.toFixed(1)} s`);
    writeFileSync('dados/testes/exemplo-grande.pdf', Buffer.from(await blob.arrayBuffer()));
    expect(segundos).toBeLessThan(60);
  }, 120000);

  it('nome do arquivo sem acentos nem espaços', () => {
    expect(nomeDoArquivo('Casinha de Campo da Vovó!')).toBe('meu-ponto-cruz-casinha-de-campo-da-vovo.pdf');
    expect(nomeDoArquivo('   ')).toBe('meu-ponto-cruz.pdf');
  });
});
