// Parte 2 do PDF: o gráfico personalizado.
// Resumo, legenda com lista de compras, gráfico colorido e em preto e branco
// (dividido em páginas A4) e instruções de impressão.

import type { Tecido } from '../estado';
import { SEM_PONTO, type Grafico } from '../processamento/converter';
import { formatarCm, MARGEM_CM, pontosParaCm } from '../processamento/medidas';
import { corDoSimbolo, simboloDa } from '../grafico/simbolos';
import { equivalentes } from '../catalogo/equivalencias';
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
    doc.caixa('Várias folhas', 'Seu gráfico ocupa mais de uma folha. Na página "Mapa do gráfico inteiro" você vê o desenho todo e onde fica cada folha.');
  }
}

// ---------- Legenda e lista de compras ----------

/** Quadradinho da legenda: símbolo sobre a cor, ou em preto e branco. */
function amostraPdf(d: Documento['doc'], pincel: PincelPdf, g: Grafico, i: number, x: number, y: number, lado: number, colorido: boolean): void {
  d.setFillColor(colorido ? g.paleta[i].hex : '#FFFFFF');
  d.setDrawColor(CORES.bordaForte);
  d.setLineWidth(0.2);
  d.rect(x, y, lado, lado, 'FD');
  pincel.cor(colorido ? corDoSimbolo(g.paleta[i].lab.L) : '#000000');
  simboloDa(i).desenhar(pincel, x, y, lado);
}

/** Código de outra marca em duas linhas: "376" + "ou 388", ou "sem cor" + "correlata". */
function codigoDeOutraMarca(doc: Documento, codigos: readonly string[], x: number, y: number): void {
  const d = doc.doc;
  if (codigos.length === 0) {
    doc.fonte(10, false, CORES.suave);
    d.text(['sem cor', 'correlata'], x, y + 1.6, { baseline: 'top', lineHeightFactor: 1.15 });
    return;
  }
  doc.fonte(12.5, true);
  d.text(codigos[0], x, y + 1.6, { baseline: 'top' });
  if (codigos.length > 1) {
    doc.fonte(10, false, CORES.suave);
    d.text(`ou ${codigos.slice(1).join(' ou ')}`, x, y + 6.8, { baseline: 'top' });
  }
}

/** Cabeçalho de tabela com linha embaixo. */
function cabecalhoDeTabela(doc: Documento, colunas: [string, number][]): void {
  const d = doc.doc;
  doc.fonte(11, true, CORES.suave);
  for (const [texto, x] of colunas) d.text(texto, x, doc.y, { baseline: 'top' });
  doc.y += 7;
  d.setDrawColor(CORES.bordaForte);
  d.setLineWidth(0.6);
  d.line(MARGEM, doc.y - 1.5, A4.largura - MARGEM, doc.y - 1.5);
}

function legenda(doc: Documento, g: Grafico, op: OpcoesPdf): void {
  const d = doc.doc;
  const total = g.contagem.reduce((s, n) => s + n, 0);
  const colunas = { simbolo: MARGEM, pb: MARGEM + 12, linha: MARGEM + 26, anchor: MARGEM + 92, maxi: MARGEM + 122, pontos: MARGEM + 148, meadas: MARGEM + 172 };
  const larguraNome = colunas.anchor - colunas.linha - 4;
  const alturaFila = 11.5;
  const pincel = new PincelPdf(d);

  g.paleta.forEach((linha, i) => {
    if (i % LINHAS_LEGENDA_POR_PAGINA === 0) {
      doc.novaPagina();
      doc.titulo(i === 0 ? 'Legenda e lista de compras' : 'Legenda (continuação)');
      cabecalhoDeTabela(doc, [['Símbolo', colunas.simbolo], ['Linha DMC', colunas.linha], ['Anchor', colunas.anchor], ['Maxi', colunas.maxi], ['Pontos', colunas.pontos], ['Meadas', colunas.meadas]]);
    }
    const y = doc.y;
    if (i % 2 === 1) {
      d.setFillColor(CORES.fundo);
      d.rect(MARGEM, y, doc.larguraUtil, alturaFila, 'F');
    }
    const lado = 9;
    const ys = y + (alturaFila - lado) / 2;
    amostraPdf(d, pincel, g, i, colunas.simbolo, ys, lado, true);
    amostraPdf(d, pincel, g, i, colunas.pb, ys, lado, false);

    doc.fonte(12.5, true);
    d.text(`DMC ${linha.codigo}${linha.conferir ? ' *' : ''}`, colunas.linha, y + 1.6, { baseline: 'top' });
    doc.fonte(10.5, false, CORES.suave);
    const partes: string[] = d.splitTextToSize(linha.nome || 'sem nome oficial', larguraNome);
    d.text(partes.length > 1 ? `${partes[0]}…` : partes[0], colunas.linha, y + 6.6, { baseline: 'top' });

    const outras = equivalentes(linha.codigo);
    codigoDeOutraMarca(doc, outras.anchor, colunas.anchor, y);
    codigoDeOutraMarca(doc, outras.maxi ? [outras.maxi] : [], colunas.maxi, y);

    doc.fonte(12);
    d.text(fmt(g.contagem[i]), colunas.pontos, y + 2, { baseline: 'top' });
    doc.fonte(9.5, false, CORES.suave);
    d.text(`${((g.contagem[i] / total) * 100).toFixed(1).replace('.', ',')}%`, colunas.pontos, y + 7, { baseline: 'top' });
    doc.fonte(12.5, true);
    d.text(String(meadasNecessarias(g.contagem[i], op.tecido)), colunas.meadas + 7, y + alturaFila / 2, { baseline: 'middle', align: 'center' });
    doc.y += alturaFila;
  });

  doc.y += 6;
  const lCm = pontosParaCm(g.largura, op.tecido);
  const aCm = pontosParaCm(g.altura, op.tecido);
  doc.subtitulo('Materiais');
  doc.lista([
    `Tecido Etamine ${op.tecido}: um pedaço de pelo menos ${Math.ceil(lCm + 2 * MARGEM_CM)} × ${Math.ceil(aCm + 2 * MARGEM_CM)} cm.`,
    `Linhas de bordar: as cores e as quantidades da tabela acima. Use ${fiosRecomendados(op.tecido)} ${fiosRecomendados(op.tecido) === 1 ? 'fio' : 'fios'} da meada.`,
    `Agulha de tapeçaria (ponta arredondada) nº ${agulhaRecomendada(op.tecido)}.`,
    'Bastidor, tesoura pequena e um lápis ou marca-texto.',
  ]);
  doc.caixa(
    'Sobre as quantidades e as marcas',
    'O número de meadas é uma estimativa com sobra de 50% (cada meada DMC tem 8 m). Nas cores com muitos pontos, vale comprar uma a mais. ' +
      'Anchor e Maxi são cores aproximadas, tiradas das tabelas de conversão dos fabricantes; "sem cor correlata" quer dizer que a tabela não indica uma cor parecida. ' +
      'Para o bordado ficar igual ao gráfico, prefira uma marca só. As cores impressas também são aproximadas: compre pelo código.' +
      (g.paleta.some((l) => l.conferir) ? ' * Cor difícil de mostrar na tela e no papel: confira com a meada na loja.' : ''),
    CORES.acento,
  );
}

// ---------- Folha de acompanhamento ----------

function caixaDeMarcar(d: Documento['doc'], x: number, y: number, lado: number): void {
  d.setFillColor('#FFFFFF');
  d.setDrawColor('#000000');
  d.setLineWidth(0.4);
  d.rect(x, y, lado, lado, 'FD');
}

function acompanhamento(doc: Documento, g: Grafico, op: OpcoesPdf): void {
  const d = doc.doc;
  const colunas = { simbolo: MARGEM, linha: MARGEM + 22, anchor: MARGEM + 46, maxi: MARGEM + 76, meadas: MARGEM + 100, comprei: MARGEM + 128, terminei: MARGEM + 158 };
  const alturaFila = 11.5;
  const pincel = new PincelPdf(d);

  g.paleta.forEach((linha, i) => {
    if (i % LINHAS_LEGENDA_POR_PAGINA === 0) {
      doc.novaPagina();
      doc.titulo(i === 0 ? 'Folha de acompanhamento' : 'Folha de acompanhamento (continuação)');
      if (i === 0) {
        doc.paragrafo('Leve esta folha à loja e marque um X quando comprar cada linha. Depois, marque quando terminar de bordar aquela cor.', { tamanhoPt: 11.5 });
      }
      cabecalhoDeTabela(doc, [['Símbolo', colunas.simbolo], ['DMC', colunas.linha], ['Anchor', colunas.anchor], ['Maxi', colunas.maxi], ['Meadas', colunas.meadas], ['Comprei', colunas.comprei], ['Terminei', colunas.terminei]]);
    }
    const y = doc.y;
    if (i % 2 === 1) {
      d.setFillColor(CORES.fundo);
      d.rect(MARGEM, y, doc.larguraUtil, alturaFila, 'F');
    }
    amostraPdf(d, pincel, g, i, colunas.simbolo, y + 1.25, 9, true);
    doc.fonte(12.5, true);
    d.text(linha.codigo, colunas.linha, y + 1.6, { baseline: 'top' });
    const outras = equivalentes(linha.codigo);
    codigoDeOutraMarca(doc, outras.anchor, colunas.anchor, y);
    codigoDeOutraMarca(doc, outras.maxi ? [outras.maxi] : [], colunas.maxi, y);
    doc.fonte(12.5, true);
    d.text(String(meadasNecessarias(g.contagem[i], op.tecido)), colunas.meadas + 7, y + alturaFila / 2, { baseline: 'middle', align: 'center' });
    caixaDeMarcar(d, colunas.comprei + 5, y + 2.25, 7);
    caixaDeMarcar(d, colunas.terminei + 5, y + 2.25, 7);
    doc.y += alturaFila;
  });
}

// ---------- Mapa do gráfico inteiro ----------

function mapaDoGrafico(doc: Documento, g: Grafico, paginas: PaginaDoGrafico[]): void {
  const d = doc.doc;
  doc.novaPagina();
  doc.titulo('Mapa do gráfico inteiro');
  doc.paragrafo(
    'O desenho todo numa página só. Os números mostram em que folha do gráfico fica cada parte. Junte as folhas nesta posição.',
    { tamanhoPt: 11.5 },
  );
  const larguraMax = doc.larguraUtil;
  const alturaMax = doc.limiteInferior - doc.y - 4;
  const mm = Math.min(larguraMax / g.largura, alturaMax / g.altura);
  const x0 = MARGEM + (larguraMax - g.largura * mm) / 2;
  const y0 = doc.y + 2;

  d.setFillColor('#FFFFFF');
  d.rect(x0, y0, g.largura * mm, g.altura * mm, 'F');
  for (let l = 0; l < g.altura; l++) {
    let c = 0;
    while (c < g.largura) {
      const i = g.celulas[l * g.largura + c];
      let fim = c + 1;
      while (fim < g.largura && g.celulas[l * g.largura + fim] === i) fim++;
      if (i !== SEM_PONTO) {
        d.setFillColor(g.paleta[i].hex);
        // um pouco maior que o quadradinho, para não aparecerem frestas entre as fileiras
        d.rect(x0 + c * mm, y0 + l * mm, (fim - c) * mm + mm * 0.2, mm * 1.2, 'F');
      }
      c = fim;
    }
  }
  // folhas: cada uma é contornada a partir de onde começa a parte nova dela
  for (const p of paginas) {
    const px = x0 + (p.coluna0 + p.repeteColunas) * mm;
    const py = y0 + (p.linha0 + p.repeteLinhas) * mm;
    const pl = (p.coluna1 - p.coluna0 - p.repeteColunas) * mm;
    const pa = (p.linha1 - p.linha0 - p.repeteLinhas) * mm;
    d.setDrawColor('#000000');
    d.setLineWidth(0.9);
    d.rect(px, py, pl, pa, 'S');
    const raio = Math.min(7, pl / 3, pa / 3);
    d.setFillColor('#FFFFFF');
    d.setDrawColor(CORES.acento);
    d.setLineWidth(0.6);
    d.circle(px + pl / 2, py + pa / 2, raio, 'FD');
    doc.fonte(Math.min(18, raio * 3.2), true, CORES.acento);
    d.text(String(p.numero), px + pl / 2, py + pa / 2, { align: 'center', baseline: 'middle' });
  }
  doc.y = y0 + g.altura * mm + 4;
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
    `Colunas ${pagina.coluna0 + 1} a ${pagina.coluna1} · Linhas ${pagina.linha0 + 1} a ${pagina.linha1}` +
      (pagina.repeteColunas || pagina.repeteLinhas ? ' · faixa cinza: repete a folha vizinha' : ` · ${doc.nomeProjeto}`),
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

  // faixa repetida da folha vizinha: fundo cinza (no preto e branco) e marca cinza na régua
  const faixas: [number, number, number, number][] = [];
  if (pagina.repeteColunas) faixas.push([px(pagina.coluna0), py(pagina.linha0), pagina.repeteColunas * mm, (pagina.linha1 - pagina.linha0) * mm]);
  if (pagina.repeteLinhas) faixas.push([px(pagina.coluna0), py(pagina.linha0), (pagina.coluna1 - pagina.coluna0) * mm, pagina.repeteLinhas * mm]);
  d.setFillColor('#E2E2E2');
  if (!colorido) for (const [x, y, l, a] of faixas) d.rect(x, y, l, a, 'F');
  d.setFillColor('#9A9A9A');
  if (pagina.repeteColunas) d.rect(px(pagina.coluna0), y0 - 3.2, pagina.repeteColunas * mm, 2.6, 'F');
  if (pagina.repeteLinhas) d.rect(x0 - 3.2, py(pagina.linha0), 2.6, pagina.repeteLinhas * mm, 'F');

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
  // divisa da faixa repetida: tracejado preto sobre branco, visível em qualquer cor
  const divisa = (cor: string, largura: number, tracejado: number[]) => {
    d.setDrawColor(cor);
    d.setLineWidth(largura);
    d.setLineDashPattern(tracejado, 0);
    if (pagina.repeteColunas) d.line(px(pagina.coluna0 + pagina.repeteColunas), py(pagina.linha0), px(pagina.coluna0 + pagina.repeteColunas), py(pagina.linha1));
    if (pagina.repeteLinhas) d.line(px(pagina.coluna0), py(pagina.linha0 + pagina.repeteLinhas), px(pagina.coluna1), py(pagina.linha0 + pagina.repeteLinhas));
  };
  divisa('#FFFFFF', 1.3, []);
  divisa('#000000', 0.7, [1.2, 1]);
  d.setLineDashPattern([], 0);
  d.setFillColor(CORES.acento);
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
    'Use o "Mapa do gráfico inteiro" e os números das réguas para encaixar as folhas. Cada folha repete as 2 últimas colunas ou linhas ' +
      'da folha vizinha (marcadas em cinza na régua e separadas por uma linha pontilhada): coloque uma folha sobre a outra nessa faixa. ' +
      'Se quiser, una com fita adesiva pelo verso.',
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
  const paginas = paginasDoGrafico(g, op.tamanho);
  resumo(doc, g, op, imagens);
  if (paginas.length > 1) mapaDoGrafico(doc, g, paginas);
  legenda(doc, g, op);
  acompanhamento(doc, g, op);
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
