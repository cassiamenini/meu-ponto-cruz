// Ajudantes para escrever o PDF: textos com quebra de linha automática,
// títulos, listas, caixas de dica, rodapés e o "pincel" dos símbolos.

import type { jsPDF } from 'jspdf';
import type { Pincel } from '../grafico/simbolos';
import { A4, MARGEM, RODAPE } from './paginacao';

export const CORES = {
  texto: '#2A211C',
  suave: '#57473D',
  acento: '#9B2C3D',
  acentoClaro: '#F6E4E3',
  verde: '#2F5D43',
  fundo: '#FBF6EE',
  borda: '#CDBBA5',
  bordaForte: '#8A7563',
};

export const FONTE = 'Atkinson';
const MM_POR_PT = 25.4 / 72;

/** Altura de uma linha de texto, em mm. */
export const alturaLinha = (tamanhoPt: number, espaco = 1.4) => tamanhoPt * MM_POR_PT * espaco;

export class Documento {
  /** Posição vertical onde o próximo texto será escrito (mm). */
  y = MARGEM;
  readonly larguraUtil = A4.largura - 2 * MARGEM;

  constructor(
    readonly doc: jsPDF,
    readonly nomeProjeto: string,
  ) {}

  get limiteInferior(): number {
    return A4.altura - MARGEM - RODAPE;
  }

  novaPagina(): void {
    this.doc.addPage();
    this.y = MARGEM;
  }

  /** Começa uma página nova se não couberem mais "mm" milímetros nesta. */
  garantirEspaco(mm: number): void {
    if (this.y + mm > this.limiteInferior) this.novaPagina();
  }

  fonte(tamanhoPt: number, negrito = false, cor = CORES.texto): void {
    this.doc.setFont(FONTE, negrito ? 'bold' : 'normal');
    this.doc.setFontSize(tamanhoPt);
    this.doc.setTextColor(cor);
  }

  /** Título grande de seção, com um "x" bordado antes. */
  titulo(texto: string, tamanhoPt = 21): void {
    this.garantirEspaco(alturaLinha(tamanhoPt) + 20);
    const d = this.doc;
    const lado = tamanhoPt * MM_POR_PT * 0.75;
    const meio = this.y + lado / 2 + 1;
    d.setDrawColor(CORES.acento);
    d.setLineWidth(1.1);
    d.setLineCap('round');
    d.line(MARGEM, meio - lado / 2, MARGEM + lado, meio + lado / 2);
    d.line(MARGEM + lado, meio - lado / 2, MARGEM, meio + lado / 2);
    this.fonte(tamanhoPt, true, CORES.acento);
    d.text(texto, MARGEM + lado + 3, this.y, { baseline: 'top' });
    this.y += alturaLinha(tamanhoPt, 1.25) + 3;
  }

  subtitulo(texto: string, tamanhoPt = 14.5): void {
    this.garantirEspaco(alturaLinha(tamanhoPt) + 12);
    this.fonte(tamanhoPt, true, CORES.texto);
    this.doc.text(texto, MARGEM, this.y, { baseline: 'top' });
    this.y += alturaLinha(tamanhoPt, 1.3) + 1;
  }

  paragrafo(texto: string, opcoes: { tamanhoPt?: number; negrito?: boolean; cor?: string; x?: number; largura?: number } = {}): void {
    const { tamanhoPt = 12.5, negrito = false, cor = CORES.texto, x = MARGEM, largura = this.larguraUtil - (x - MARGEM) } = opcoes;
    this.fonte(tamanhoPt, negrito, cor);
    const linhas: string[] = this.doc.splitTextToSize(texto, largura);
    const altura = alturaLinha(tamanhoPt);
    for (const linha of linhas) {
      this.garantirEspaco(altura);
      this.fonte(tamanhoPt, negrito, cor); // a página nova não guarda a fonte
      this.doc.text(linha, x, this.y, { baseline: 'top' });
      this.y += altura;
    }
    this.y += 2.5;
  }

  /** Lista com marcadores (•) ou números (1., 2., ...). */
  lista(itens: string[], numerada = false, tamanhoPt = 12.5): void {
    const recuo = 7;
    const altura = alturaLinha(tamanhoPt);
    itens.forEach((item, i) => {
      this.fonte(tamanhoPt);
      const linhas: string[] = this.doc.splitTextToSize(item, this.larguraUtil - recuo);
      this.garantirEspaco(altura * Math.min(2, linhas.length));
      this.fonte(tamanhoPt, true, CORES.acento);
      this.doc.text(numerada ? `${i + 1}.` : '•', MARGEM + 1, this.y, { baseline: 'top' });
      for (const linha of linhas) {
        this.garantirEspaco(altura);
        this.fonte(tamanhoPt);
        this.doc.text(linha, MARGEM + recuo, this.y, { baseline: 'top' });
        this.y += altura;
      }
      this.y += 1.2;
    });
    this.y += 1.5;
  }

  /** Caixa de destaque (dica ou atenção), com faixa colorida à esquerda. */
  caixa(titulo: string, texto: string, cor = CORES.verde): void {
    const tamanhoPt = 12;
    this.fonte(tamanhoPt);
    const linhas: string[] = this.doc.splitTextToSize(texto, this.larguraUtil - 14);
    const altura = alturaLinha(tamanhoPt);
    const total = 6 + alturaLinha(tamanhoPt, 1.3) + linhas.length * altura + 3;
    this.garantirEspaco(total + 2);
    const d = this.doc;
    d.setFillColor(CORES.fundo);
    d.rect(MARGEM, this.y, this.larguraUtil, total, 'F');
    d.setFillColor(cor);
    d.rect(MARGEM, this.y, 2.5, total, 'F');
    let y = this.y + 4;
    this.fonte(tamanhoPt, true, cor);
    d.text(titulo, MARGEM + 8, y, { baseline: 'top' });
    y += alturaLinha(tamanhoPt, 1.3);
    this.fonte(tamanhoPt);
    for (const linha of linhas) {
      d.text(linha, MARGEM + 8, y, { baseline: 'top' });
      y += altura;
    }
    this.y += total + 5;
  }

  /** Rodapé em todas as páginas, menos a capa. */
  escreverRodapes(): void {
    const total = this.doc.getNumberOfPages();
    for (let p = 2; p <= total; p++) {
      this.doc.setPage(p);
      const y = A4.altura - MARGEM + 1;
      this.doc.setDrawColor(CORES.borda);
      this.doc.setLineWidth(0.3);
      this.doc.line(MARGEM, y - 3, A4.largura - MARGEM, y - 3);
      this.fonte(9, false, CORES.suave);
      this.doc.text(`Meu Ponto Cruz · ${this.nomeProjeto}`, MARGEM, y, { baseline: 'top' });
      this.doc.text(`Página ${p} de ${total}`, A4.largura - MARGEM, y, { baseline: 'top', align: 'right' });
    }
  }
}

/** O mesmo pincel dos símbolos da tela, desenhando no PDF (medidas em mm). */
export class PincelPdf implements Pincel {
  constructor(private readonly doc: jsPDF) {
    doc.setLineCap('round');
    doc.setLineJoin('round');
  }
  cor(cor: string): void {
    this.doc.setDrawColor(cor);
    this.doc.setFillColor(cor);
    this.doc.setTextColor(cor);
  }
  espessura(mm: number): void {
    this.doc.setLineWidth(mm);
  }
  linha(x1: number, y1: number, x2: number, y2: number): void {
    this.doc.line(x1, y1, x2, y2);
  }
  circulo(cx: number, cy: number, raio: number, cheio: boolean): void {
    this.doc.circle(cx, cy, raio, cheio ? 'F' : 'S');
  }
  poligono(pontos: readonly (readonly [number, number])[], cheio: boolean): void {
    const [x0, y0] = pontos[0];
    const passos = pontos.slice(1).map(([x, y], i) => [x - pontos[i][0], y - pontos[i][1]]);
    this.doc.lines(passos, x0, y0, [1, 1], cheio ? 'F' : 'S', true);
  }
  texto(texto: string, cx: number, cy: number, tamanho: number): void {
    this.doc.setFont(FONTE, 'bold');
    this.doc.setFontSize(tamanho / MM_POR_PT);
    this.doc.text(texto, cx, cy, { align: 'center', baseline: 'middle' });
  }
}
