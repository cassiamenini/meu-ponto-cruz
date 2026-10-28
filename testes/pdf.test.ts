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
  it('gráfico pequeno: apostila + resumo + legenda + acompanhamento + 1 página colorida + 1 P&B + instruções', async () => {
    const g = graficoDeTeste(40, 30, 8);
    const blob = await gerarPdf(g, opcoes(), {}, fontes);
    expect(blob.type).toBe('application/pdf');
    const paginas = await paginasDoPdf(blob);
    expect(paginas).toBe(contarPaginas(g, opcoes()));
    expect(paginas).toBe(7 + 1 + 1 + 1 + 2 + 1);
    // guarda uma cópia para conferência visual
    mkdirSync('dados/testes', { recursive: true });
    writeFileSync('dados/testes/exemplo-pequeno.pdf', Buffer.from(await blob.arrayBuffer()));
  }, 30000);

  it('a apostila está sempre presente, mesmo com só uma versão do gráfico', async () => {
    const g = graficoDeTeste(20, 20, 3);
    const blob = await gerarPdf(g, opcoes({ versoes: 'pb' }), {}, fontes);
    expect(await paginasDoPdf(blob)).toBe(7 + 1 + 1 + 1 + 1 + 1);
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

  it('o conteúdo está certo: guia, gráfico, legenda e páginas em A4', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const g = graficoDeTeste(40, 30, 8);
    const blob = await gerarPdf(g, opcoes(), {}, fontes);
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts: false }).promise;
    const textoDa = async (n: number) => {
      const p = await pdf.getPage(n);
      const c = await p.getTextContent();
      return c.items.map((i) => ('str' in i ? i.str : '')).join(' ');
    };
    const todas = await Promise.all(Array.from({ length: pdf.numPages }, (_, i) => textoDa(i + 1)));
    const tudo = todas.join(' | ');

    // Parte 1: os 10 tópicos do guia, em ordem
    const topicos = [
      'O que é ponto cruz',
      'Materiais necessários',
      'Como escolher o tecido e a agulha',
      'Como preparar a linha e colocar na agulha',
      'Como fazer o primeiro ponto cruz',
      'Como começar e arrematar o bordado',
      'Como entender quadrículas e símbolos',
      'Como interpretar a legenda',
      'Como localizar o centro',
      'Dicas para iniciantes e erros comuns',
      'Outros pontos que você pode encontrar',
    ];
    let posicao = -1;
    for (const t of topicos) {
      const p = tudo.indexOf(t);
      expect(p, t).toBeGreaterThan(posicao);
      posicao = p;
    }
    // Parte 2
    expect(todas[7]).toContain('PARTE 2');
    expect(todas[7]).toContain('40 × 30 pontos');
    expect(tudo).toContain('Legenda e lista de compras');
    expect(tudo).toContain('Folha de acompanhamento');
    expect(tudo).toContain('Anchor');
    expect(tudo).toContain('Maxi');
    for (const linha of g.paleta) expect(tudo).toContain(`DMC ${linha.codigo}`);
    expect(tudo).toContain('Gráfico colorido — página 1 de 1');
    expect(tudo).toContain('Gráfico em preto e branco — página 1 de 1');
    expect(tudo).toContain('Como imprimir e bordar seu gráfico');
    // texto selecionável com acentos (a fonte foi embutida corretamente)
    expect(tudo).toContain('ç');
    // todas as páginas em A4 (210 × 297 mm = 595,28 × 841,89 pt)
    for (let n = 1; n <= pdf.numPages; n++) {
      const [, , largura, altura] = (await pdf.getPage(n)).view;
      expect(largura).toBeCloseTo(595.28, 0);
      expect(altura).toBeCloseTo(841.89, 0);
    }
  }, 30000);

  it('com fundo sem bordar: o PDF explica e os quadradinhos vazios não entram na contagem', async () => {
    const w = 120;
    const h = 120;
    const p = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dentro = (x - 60) ** 2 + (y - 60) ** 2 < 40 ** 2;
        p.set(dentro ? [199, 43, 59, 255] : [255, 255, 255, 255], (y * w + x) * 4);
      }
    }
    const g = converter(p, w, h, { largura: 40, altura: 40, maxCores: 4, limpeza: 'media', fundo: 'auto' });
    expect(g.fundo.removido).toBe(true);
    const blob = await gerarPdf(g, opcoes(), {}, fontes);
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    const resumo = await (await pdf.getPage(8)).getTextContent();
    const texto = resumo.items.map((i) => ('str' in i ? i.str : '')).join(' ');
    expect(texto).toContain('Fundo');
    expect(texto).toContain('mostram o próprio tecido');
    expect(texto).toContain(`${g.contagem.reduce((s, n) => s + n, 0).toLocaleString('pt-BR')} pontos para bordar`);
  }, 30000);

  it('nome do arquivo sem acentos nem espaços', () => {
    expect(nomeDoArquivo('Casinha de Campo da Vovó!')).toBe('meu-ponto-cruz-casinha-de-campo-da-vovo.pdf');
    expect(nomeDoArquivo('   ')).toBe('meu-ponto-cruz.pdf');
  });
});
