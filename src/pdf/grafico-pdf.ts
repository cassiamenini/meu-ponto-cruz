// Parte 2 do PDF: o gráfico personalizado.
// Resumo, legenda com lista de compras, gráfico colorido e em preto e branco
// (dividido em páginas A4) e instruções de impressão.

import type { Tecido } from '../estado';
import { SEM_PONTO, type Grafico } from '../processamento/converter';
import { formatarCm, MARGEM_CM, pontosParaCm } from '../processamento/medidas';
import { corDoSimbolo, simboloDa } from '../grafico/simbolos';
import { CORES, Documento, PincelPdf } from './documento';
import { agulhaRecomendada, fiosRecomendados, meadasNecessarias } from './estimativa';
import {
  A4,
  areaDoGrafico,
  CABECALHO,
  LINHAS_LEGENDA_POR_PAGINA,
  MARGEM,
  MM_POR_PONTO,
  REGUA,
  paginasDoGrafico as paginasPorTamanho,
  type PaginaDoGrafico,
  type TamanhoQuadradinho,
  type Versoes,
} from './paginacao';

export interface OpcoesPdf {
  nomeProjeto: string;
  versoes: Versoes;
  tamanho: TamanhoQuadradinho;
  tecido: Tecido;
}

export interface ImagemPdf {
  dados: string; // data URL
  largura: number;
  altura: number;
}

export interface ImagensPdf {
  referencia?: ImagemPdf;
  previa?: ImagemPdf;
}

const fmt = (n: number) => n.toLocaleString('pt-BR');
const pausa = () => new Promise((ok) => setTimeout(ok, 0));

const paginasDoGrafico = (g: Grafico, tamanho: TamanhoQuadradinho): PaginaDoGrafico[] =>
  paginasPorTamanho(g.largura, g.altura, tamanho);

// ---------- Resumo ----------

function caixaImagem(doc: Documento, img: ImagemPdf | undefined, tipo: 'JPEG' | 'PNG', titulo: string, x: number, y: number, largura: number, altura: number): void {
  const d = doc.doc;
  d.setFillColor(CORES.fundo);
  d.rect(x, y, largura, altura, 'F');
  if (img) {
    const escala = Math.min((largura - 6) / img.largura, (altura - 6) / img.altura);
    const l = img.largura * escala;
    const a = img.altura * escala;
    d.addImage(img.dados, tipo, x + (largura - l) / 2, y + (altura - a) / 2, l, a, tipo === 'PNG' ? 'previa' : 'referencia', 'FAST');
  }
  doc.fonte(11.5, true);
  d.text(titulo, x + largura / 2, y + altura + 2, { align: 'center', baseline: 'top' });
}

/** Desenha as folhas na posição em que se juntam; a folha "atual" fica destacada. Devolve a largura usada. */
function mapaDePaginas(doc: Documento, paginas: PaginaDoGrafico[], x: number, y: number, largura: number, altura: number, atual?: number): number {
  const d = doc.doc;
  const nx = Math.max(...paginas.map((p) => p.posicaoX)) + 1;
  const ny = Math.max(...paginas.map((p) => p.posicaoY)) + 1;
  const lado = Math.min(12, largura / nx, altura / ny);
  for (const p of paginas) {
    const px = x + p.posicaoX * lado;
    const py = y + p.posicaoY * lado;
    d.setDrawColor(CORES.bordaForte);
    d.setLineWidth(0.25);
    d.setFillColor(p.numero === atual ? CORES.acento : '#FFFFFF');
    d.rect(px, py, lado, lado, 'FD');
    if (lado >= 5) {
      doc.fonte(Math.min(11, lado * 2), true, p.numero === atual ? '#FFFFFF' : CORES.texto);
      d.text(String(p.numero), px + lado / 2, py + lado / 2, { align: 'center', baseline: 'middle' });
    }
  }
  return nx * lado;
}

function resumo(doc: Documento, g: Grafico, op: OpcoesPdf, imagens: ImagensPdf): void {
  const d = doc.doc;
  doc.novaPagina();
  doc.fonte(12, true, CORES.suave);
  d.text('PARTE 2 — SEU GRÁFICO PERSONALIZADO', MARGEM, doc.y, { baseline: 'top' });
  doc.y += 8;
  doc.titulo(op.nomeProjeto, 22);

  const largura = (doc.larguraUtil - 8) / 2;
  const altura = 64;
  caixaImagem(doc, imagens.referencia, 'JPEG', 'Imagem de referência', MARGEM, doc.y, largura, altura);
  caixaImagem(doc, imagens.previa, 'PNG', 'Como o bordado vai ficar', MARGEM + largura + 8, doc.y, largura, altura);
  doc.y += altura + 12;

  const total = g.contagem.reduce((s, n) => s + n, 0);
  const { tecido } = op;
  const lCm = pontosParaCm(g.largura, tecido);
  const aCm = pontosParaCm(g.altura, tecido);
  const meadas = g.contagem.reduce((s, n) => s + meadasNecessarias(n, tecido), 0);
  const paginas = paginasDoGrafico(g, op.tamanho);
  const outros = ([11, 14, 16, 18] as Tecido[])
    .filter((t) => t !== tecido)
    .map((t) => `Etamine ${t}: ${formatarCm(pontosParaCm(g.largura, t))} × ${formatarCm(pontosParaCm(g.altura, t))} cm`)
    .join(' · ');
  const versoes = op.versoes === 'ambos' ? 'colorido e em preto e branco' : op.versoes === 'colorido' ? 'colorido' : 'em preto e branco';

  const linhas: [string, string][] = [
    ['Tamanho em pontos', `${g.largura} × ${g.altura} pontos (${fmt(total)} pontos para bordar)`],
    ...(g.fundo.removido
      ? ([['Fundo', `sem bordar: os ${fmt(g.fundo.pontos)} quadradinhos em branco do gráfico mostram o próprio tecido`]] as [string, string][])
      : []),
    ['Tamanho do bordado', `${formatarCm(lCm)} × ${formatarCm(aCm)} cm em Etamine ${tecido}`],
    ['Tecido para cortar', `pelo menos ${Math.ceil(lCm + 2 * MARGEM_CM)} × ${Math.ceil(aCm + 2 * MARGEM_CM)} cm de Etamine ${tecido} (${MARGEM_CM} cm de sobra em cada lado)`],
    ['Em outros tecidos', outros],
    ['Linhas', `${g.paleta.length} ${g.paleta.length === 1 ? 'cor' : 'cores'} DMC Mouliné · cerca de ${meadas} ${meadas === 1 ? 'meada' : 'meadas'} no total`],
    ['Fios e agulha', `${fiosRecomendados(tecido)} ${fiosRecomendados(tecido) === 1 ? 'fio' : 'fios'} da meada · agulha de tapeçaria nº ${agulhaRecomendada(tecido)}`],
    ['Gráfico', `${paginas.length} ${paginas.length === 1 ? 'página' : 'páginas'} por versão (${versoes}), quadradinhos de ${formatarCm(MM_POR_PONTO[op.tamanho])} mm`],
  ];
  const colRotulo = 48;
  for (const [rotulo, valor] of linhas) {
    doc.fonte(12);
    const partes: string[] = d.splitTextToSize(valor, doc.larguraUtil - colRotulo);
    const alturaFila = partes.length * 5.6 + 2.5;
    doc.garantirEspaco(alturaFila);
    doc.fonte(12, true);
    d.text(rotulo, MARGEM, doc.y, { baseline: 'top' });
    doc.fonte(12);
    d.text(partes, MARGEM + colRotulo, doc.y, { baseline: 'top', lineHeightFactor: 1.3 });
    doc.y += alturaFila;
  }

  if (paginas.length > 1) {
    doc.y += 3;
    doc.subtitulo('Mapa das páginas do gráfico');
    doc.paragrafo('Cada quadrado é uma folha. Junte as folhas nesta posição para ver o desenho inteiro.', { tamanhoPt: 11 });
    const ny = Math.max(...paginas.map((p) => p.posicaoY)) + 1;
    const nx = Math.max(...paginas.map((p) => p.posicaoX)) + 1;
    const alturaMapa = Math.min(12, doc.larguraUtil / nx, 42 / ny) * ny;
    mapaDePaginas(doc, paginas, MARGEM, doc.y, doc.larguraUtil, 42);
    doc.y += alturaMapa + 4;
  }
}

// ---------- Legenda e lista de compras ----------

function legenda(doc: Documento, g: Grafico, op: OpcoesPdf): void {
  const d = doc.doc;
  const total = g.contagem.reduce((s, n) => s + n, 0);
  const colunas = { simbolo: MARGEM, pb: MARGEM + 14, linha: MARGEM + 30, pontos: MARGEM + 128, meadas: MARGEM + 160 };
  const alturaFila = 11.5;
  const pincel = new PincelPdf(d);

  g.paleta.forEach((linha, i) => {
    if (i % LINHAS_LEGENDA_POR_PAGINA === 0) {
      doc.novaPagina();
      doc.titulo(i === 0 ? 'Legenda e lista de compras' : 'Legenda (continuação)');
      doc.fonte(11, true, CORES.suave);
      d.text('Símbolo', colunas.simbolo, doc.y, { baseline: 'top' });
      d.text('Linha DMC', colunas.linha, doc.y, { baseline: 'top' });
      d.text('Pontos', colunas.pontos, doc.y, { baseline: 'top' });
      d.text('Meadas', colunas.meadas, doc.y, { baseline: 'top' });
      doc.y += 7;
      d.setDrawColor(CORES.bordaForte);
      d.setLineWidth(0.6);
      d.line(MARGEM, doc.y - 1.5, A4.largura - MARGEM, doc.y - 1.5);
    }
    const y = doc.y;
    if (i % 2 === 1) {
      d.setFillColor(CORES.fundo);
      d.rect(MARGEM, y, doc.larguraUtil, alturaFila, 'F');
    }
    const lado = 9;
    const ys = y + (alturaFila - lado) / 2;
    // símbolo sobre a cor
    d.setFillColor(linha.hex);
    d.setDrawColor(CORES.bordaForte);
    d.setLineWidth(0.2);
    d.rect(colunas.simbolo, ys, lado, lado, 'FD');
    pincel.cor(corDoSimbolo(linha.lab.L));
    simboloDa(i).desenhar(pincel, colunas.simbolo, ys, lado);
    // símbolo em preto e branco
    d.setFillColor('#FFFFFF');
    d.setDrawColor(CORES.bordaForte);
    d.setLineWidth(0.2);
    d.rect(colunas.pb, ys, lado, lado, 'FD');
    pincel.cor('#000000');
    simboloDa(i).desenhar(pincel, colunas.pb, ys, lado);

    doc.fonte(12.5, true);
    d.text(`DMC ${linha.codigo}`, colunas.linha, y + 1.6, { baseline: 'top' });
    doc.fonte(10.5, false, CORES.suave);
    const nome = linha.nome || 'sem nome oficial';
    d.text(linha.conferir ? `${nome} · confira a cor na loja` : nome, colunas.linha, y + 6.6, { baseline: 'top' });
    doc.fonte(12);
    d.text(fmt(g.contagem[i]), colunas.pontos, y + 2, { baseline: 'top' });
    doc.fonte(9.5, false, CORES.suave);
    d.text(`${((g.contagem[i] / total) * 100).toFixed(1).replace('.', ',')}%`, colunas.pontos, y + 7, { baseline: 'top' });
    doc.fonte(12.5, true);
    d.text(String(meadasNecessarias(g.contagem[i], op.tecido)), colunas.meadas + 6, y + alturaFila / 2, { baseline: 'middle', align: 'center' });
    doc.y += alturaFila;
  });

  doc.y += 6;
  const lCm = pontosParaCm(g.largura, op.tecido);
  const aCm = pontosParaCm(g.altura, op.tecido);
  doc.subtitulo('Materiais');
  doc.lista([
    `Tecido Etamine ${op.tecido}: um pedaço de pelo menos ${Math.ceil(lCm + 2 * MARGEM_CM)} × ${Math.ceil(aCm + 2 * MARGEM_CM)} cm.`,
    `Linhas DMC Mouliné: as cores e as quantidades da tabela acima. Use ${fiosRecomendados(op.tecido)} ${fiosRecomendados(op.tecido) === 1 ? 'fio' : 'fios'} da meada.`,
    `Agulha de tapeçaria (ponta arredondada) nº ${agulhaRecomendada(op.tecido)}.`,
    'Bastidor, tesoura pequena e um lápis ou marca-texto.',
  ]);
  doc.caixa(
    'Sobre as quantidades e as cores',
    'O número de meadas é uma estimativa com sobra de 50% (cada meada DMC tem 8 m). Nas cores com muitos pontos, vale comprar uma a mais. ' +
      'As cores impressas são aproximadas: compre pelo código.',
    CORES.acento,
  );
}

// ---------- Páginas do gráfico ----------

function paginaDoGrafico(
  doc: Documento,
  g: Grafico,
  pagina: PaginaDoGrafico,
  todas: PaginaDoGrafico[],
  colorido: boolean,
  mm: number,
): void {
  const d = doc.doc;
  doc.novaPagina();
  const pincel = new PincelPdf(d);

  // cabeçalho
  doc.fonte(15, true, CORES.acento);
  d.text(`Gráfico ${colorido ? 'colorido' : 'em preto e branco'} — página ${pagina.numero} de ${todas.length}`, MARGEM, MARGEM, { baseline: 'top' });
  doc.fonte(10.5, false, CORES.suave);
  d.text(
    `Colunas ${pagina.coluna0 + 1} a ${pagina.coluna1} · Linhas ${pagina.linha0 + 1} a ${pagina.linha1} · ${doc.nomeProjeto}`,
    MARGEM,
    MARGEM + 7.5,
    { baseline: 'top' },
  );
  if (todas.length > 1) {
    // mapa pequeno no canto, para saber onde esta folha se encaixa
    const nx = Math.max(...todas.map((p) => p.posicaoX)) + 1;
    const ny = Math.max(...todas.map((p) => p.posicaoY)) + 1;
    const lado = Math.min(6, 30 / nx, 13 / ny);
    mapaDePaginas(doc, todas, A4.largura - MARGEM - nx * lado, MARGEM - 1, nx * lado, ny * lado, pagina.numero);
  }

  const colunas = pagina.coluna1 - pagina.coluna0;
  const area = areaDoGrafico();
  const x0 = MARGEM + REGUA + Math.max(0, (area.largura - colunas * mm) / 2);
  const y0 = MARGEM + CABECALHO + REGUA;
  const px = (c: number) => x0 + (c - pagina.coluna0) * mm;
  const py = (l: number) => y0 + (l - pagina.linha0) * mm;

  // cores (quadradinhos vizinhos da mesma cor viram um retângulo só)
  if (colorido) {
    for (let l = pagina.linha0; l < pagina.linha1; l++) {
      let c = pagina.coluna0;
      while (c < pagina.coluna1) {
        const i = g.celulas[l * g.largura + c];
        let fim = c + 1;
        while (fim < pagina.coluna1 && g.celulas[l * g.largura + fim] === i) fim++;
        if (i !== SEM_PONTO) {
          d.setFillColor(g.paleta[i].hex);
          d.rect(px(c), py(l), (fim - c) * mm + 0.01, mm + 0.01, 'F');
        }
        c = fim;
      }
    }
  }

  // símbolos
  const corSimbolo = g.paleta.map((linha) => (colorido ? corDoSimbolo(linha.lab.L) : '#000000'));
  for (let l = pagina.linha0; l < pagina.linha1; l++) {
    for (let c = pagina.coluna0; c < pagina.coluna1; c++) {
      const i = g.celulas[l * g.largura + c];
      if (i === SEM_PONTO) continue;
      pincel.cor(corSimbolo[i]);
      simboloDa(i).desenhar(pincel, px(c), py(l), mm);
    }
  }

  // grade fina
  d.setDrawColor(colorido ? '#4A4A4A' : '#8C8C8C');
  d.setLineWidth(0.12);
  for (let c = pagina.coluna0 + 1; c < pagina.coluna1; c++) if (c % 10 !== 0) d.line(px(c), py(pagina.linha0), px(c), py(pagina.linha1));
  for (let l = pagina.linha0 + 1; l < pagina.linha1; l++) if (l % 10 !== 0) d.line(px(pagina.coluna0), py(l), px(pagina.coluna1), py(l));
  // linhas grossas a cada 10 e borda
  d.setDrawColor('#000000');
  d.setLineWidth(0.45);
  for (let c = pagina.coluna0; c <= pagina.coluna1; c++) {
    if (c % 10 === 0 || c === pagina.coluna1) d.line(px(c), py(pagina.linha0), px(c), py(pagina.linha1));
  }
  for (let l = pagina.linha0; l <= pagina.linha1; l++) {
    if (l % 10 === 0 || l === pagina.linha1) d.line(px(pagina.coluna0), py(l), px(pagina.coluna1), py(l));
  }

  // centro
  const cx = g.largura / 2;
  const cy = g.altura / 2;
  d.setDrawColor(CORES.acento);
  d.setFillColor(CORES.acento);
  d.setLineWidth(0.8);
  d.setLineDashPattern([2, 1.2], 0);
  if (cx >= pagina.coluna0 && cx <= pagina.coluna1) d.line(px(cx), py(pagina.linha0), px(cx), py(pagina.linha1));
  if (cy >= pagina.linha0 && cy <= pagina.linha1) d.line(px(pagina.coluna0), py(cy), px(pagina.coluna1), py(cy));
  d.setLineDashPattern([], 0);
  if (cx >= pagina.coluna0 && cx <= pagina.coluna1) d.triangle(px(cx) - 1.8, y0 - 4, px(cx) + 1.8, y0 - 4, px(cx), y0 - 0.6, 'F');
  if (cy >= pagina.linha0 && cy <= pagina.linha1) d.triangle(x0 - 4, py(cy) - 1.8, x0 - 4, py(cy) + 1.8, x0 - 0.6, py(cy), 'F');

  // réguas com os números a cada 10 pontos
  doc.fonte(8, true);
  for (let c = Math.ceil(pagina.coluna0 / 10) * 10; c <= pagina.coluna1; c += 10) {
    if (c > 0) d.text(String(c), px(c), y0 - 4.6, { align: 'center', baseline: 'bottom' });
  }
  for (let l = Math.ceil(pagina.linha0 / 10) * 10; l <= pagina.linha1; l += 10) {
    if (l > 0) d.text(String(l), x0 - 4.6, py(l), { align: 'right', baseline: 'middle' });
  }
}

// ---------- Instruções ----------

function instrucoes(doc: Documento): void {
  const d = doc.doc;
  doc.novaPagina();
  doc.titulo('Como imprimir e bordar seu gráfico');
  doc.subtitulo('Na hora de imprimir');
  doc.lista([
    'Escolha "Tamanho real" ou "100%" na janela de impressão. Não use "Ajustar à página": os quadradinhos ficariam com outro tamanho.',
    'Confira com uma régua: a linha abaixo deve medir exatamente 10 cm no papel.',
    'Sem impressora colorida? Use as páginas em preto e branco: os símbolos já bastam.',
    'Papel A4 comum serve. Se os quadradinhos estiverem pequenos, gere o PDF de novo com "quadradinhos ampliados".',
  ]);
  // régua de 10 cm
  doc.garantirEspaco(22);
  const x = MARGEM + 10;
  const y = doc.y + 6;
  d.setDrawColor('#000000');
  d.setLineWidth(0.5);
  d.line(x, y, x + 100, y);
  doc.fonte(9, true);
  for (let cm = 0; cm <= 10; cm++) {
    d.line(x + cm * 10, y - (cm % 5 === 0 ? 3.5 : 2), x + cm * 10, y);
    d.text(String(cm), x + cm * 10, y + 1.5, { align: 'center', baseline: 'top' });
  }
  doc.fonte(11, false, CORES.suave);
  d.text('10 cm', x + 104, y, { baseline: 'middle' });
  doc.y = y + 12;

  doc.subtitulo('Juntando as folhas');
  doc.paragrafo(
    'Use o mapa das páginas (no resumo) e os números das réguas para encaixar as folhas. Se quiser, una com fita adesiva pelo verso.',
  );
  doc.subtitulo('Bordando');
  doc.lista(
    [
      'Encontre o centro do tecido e o centro do gráfico (setinhas vinho) e comece por ali.',
      'Escolha uma cor, procure o símbolo dela na legenda e borde todos os pontos dessa cor numa área pequena.',
      'Risque com lápis ou marca-texto o que já foi bordado: assim você não se perde.',
      'Passe para a próxima cor e repita, avançando aos poucos para as bordas.',
      'Quadradinhos de outra página continuam na folha vizinha: confira os números das réguas.',
    ],
    true,
  );
  doc.caixa('Bom bordado!', 'Vá com calma e aproveite. Cada X é um passo do seu desenho.');
}

// ---------- Tudo junto ----------

export async function escreverParte2(
  doc: Documento,
  g: Grafico,
  op: OpcoesPdf,
  imagens: ImagensPdf,
  aoProgredir?: (fracao: number) => void,
): Promise<void> {
  resumo(doc, g, op, imagens);
  legenda(doc, g, op);
  const paginas = paginasDoGrafico(g, op.tamanho);
  const versoes = op.versoes === 'ambos' ? [true, false] : [op.versoes === 'colorido'];
  const total = versoes.length * paginas.length;
  let feitas = 0;
  for (const colorido of versoes) {
    for (const p of paginas) {
      paginaDoGrafico(doc, g, p, paginas, colorido, MM_POR_PONTO[op.tamanho]);
      aoProgredir?.(++feitas / total);
      await pausa(); // deixa a tela respirar entre uma página e outra
    }
  }
  instrucoes(doc);
}
