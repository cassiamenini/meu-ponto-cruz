// Parte 1 do PDF: guia para quem está começando.
// Textos e desenhos originais deste projeto.

import type { jsPDF } from 'jspdf';
import { CORES, Documento } from './documento';
import { A4, MARGEM } from './paginacao';

// ---------- Desenhos ----------

/** Pedaço de tecido Etamine: quadradinhos com os furinhos nos cantos. */
function tecido(d: jsPDF, x: number, y: number, colunas: number, linhas: number, passo: number): void {
  d.setFillColor('#FFFDF7');
  d.rect(x, y, colunas * passo, linhas * passo, 'F');
  d.setDrawColor('#E6DBC9');
  d.setLineWidth(0.25);
  for (let c = 0; c <= colunas; c++) d.line(x + c * passo, y, x + c * passo, y + linhas * passo);
  for (let l = 0; l <= linhas; l++) d.line(x, y + l * passo, x + colunas * passo, y + l * passo);
  d.setFillColor('#A8957A');
  for (let c = 0; c <= colunas; c++) for (let l = 0; l <= linhas; l++) d.circle(x + c * passo, y + l * passo, passo * 0.09, 'F');
}

function pontoX(d: jsPDF, x: number, y: number, passo: number, cor: string, meio = false): void {
  const folga = passo * 0.12;
  d.setDrawColor(cor);
  d.setLineWidth(passo * 0.22);
  d.setLineCap('round');
  d.line(x + folga, y + passo - folga, x + passo - folga, y + folga); // "/"
  if (!meio) d.line(x + folga, y + folga, x + passo - folga, y + passo - folga); // "\"
}

function seta(d: jsPDF, x1: number, y1: number, x2: number, y2: number, cor = CORES.acento): void {
  d.setDrawColor(cor);
  d.setFillColor(cor);
  d.setLineWidth(0.6);
  d.line(x1, y1, x2, y2);
  const angulo = Math.atan2(y2 - y1, x2 - x1);
  const t = 2.6;
  d.triangle(
    x2,
    y2,
    x2 - t * Math.cos(angulo - 0.45),
    y2 - t * Math.sin(angulo - 0.45),
    x2 - t * Math.cos(angulo + 0.45),
    y2 - t * Math.sin(angulo + 0.45),
    'F',
  );
}

function numeroNoFuro(d: jsPDF, doc: Documento, n: number, x: number, y: number): void {
  d.setFillColor(CORES.acento);
  d.circle(x, y, 2.3, 'F');
  doc.fonte(9, true, '#FFFFFF');
  d.text(String(n), x, y + 0.1, { align: 'center', baseline: 'middle' });
}

function legendaDesenho(doc: Documento, texto: string, x: number, y: number, largura: number): void {
  doc.fonte(10.5, false, CORES.suave);
  doc.doc.text(doc.doc.splitTextToSize(texto, largura), x + largura / 2, y, { align: 'center', baseline: 'top' });
}

// ---------- Capa ----------

function capa(doc: Documento, imagemPrevia?: { dados: string; largura: number; altura: number }): void {
  const d = doc.doc;
  // moldura de pontinhos em X
  const passo = 6;
  for (let x = MARGEM; x <= A4.largura - MARGEM - passo; x += passo) {
    pontoX(d, x, MARGEM, passo * 0.7, CORES.acento);
    pontoX(d, x, A4.altura - MARGEM - passo * 0.7, passo * 0.7, CORES.acento);
  }
  for (let y = MARGEM + passo; y <= A4.altura - MARGEM - 2 * passo; y += passo) {
    pontoX(d, MARGEM, y, passo * 0.7, CORES.acento);
    pontoX(d, A4.largura - MARGEM - passo * 0.7, y, passo * 0.7, CORES.acento);
  }

  const centro = A4.largura / 2;
  doc.fonte(15, true, CORES.suave);
  d.text('Meu Ponto Cruz', centro, 38, { align: 'center', baseline: 'top' });
  doc.fonte(30, true, CORES.acento);
  d.text(d.splitTextToSize(doc.nomeProjeto, 160), centro, 50, { align: 'center', baseline: 'top' });
  doc.fonte(16, false, CORES.texto);
  d.text('Apostila de ponto cruz', centro, 80, { align: 'center', baseline: 'top' });

  if (imagemPrevia) {
    const maxL = 120;
    const maxA = 110;
    const escala = Math.min(maxL / imagemPrevia.largura, maxA / imagemPrevia.altura);
    const l = imagemPrevia.largura * escala;
    const a = imagemPrevia.altura * escala;
    d.setFillColor(CORES.fundo);
    d.rect(centro - l / 2 - 4, 98 - 4, l + 8, a + 8, 'F');
    // o "apelido" faz o PDF guardar a imagem uma vez só, mesmo usada em duas páginas
    d.addImage(imagemPrevia.dados, 'PNG', centro - l / 2, 98, l, a, 'previa', 'FAST');
  }

  doc.fonte(13, false, CORES.texto);
  const yPartes = 222;
  d.text('Parte 1 — Guia para quem está começando', centro, yPartes, { align: 'center', baseline: 'top' });
  d.text('Parte 2 — Seu gráfico personalizado', centro, yPartes + 8, { align: 'center', baseline: 'top' });
  doc.fonte(11, false, CORES.suave);
  const hoje = new Date().toLocaleDateString('pt-BR');
  d.text(`Gerada em ${hoje}`, centro, yPartes + 22, { align: 'center', baseline: 'top' });
  d.text('cassiamenini.github.io/meu-ponto-cruz', centro, yPartes + 29, { align: 'center', baseline: 'top' });
}

// ---------- Seções ----------

function oQueE(doc: Documento): void {
  doc.titulo('1. O que é ponto cruz');
  doc.paragrafo(
    'Ponto cruz é um bordado feito com pequenos pontos em forma de X. Cada X ocupa um quadradinho do tecido. ' +
      'Juntando muitos X de cores diferentes, aparece um desenho, como num mosaico.',
  );
  doc.paragrafo(
    'O jeito de trabalhar é sempre o mesmo: você olha o gráfico, vê o símbolo de cada quadradinho, ' +
      'procura na legenda qual linha usar e borda um X no lugar certo do tecido.',
  );
  // um coraçãozinho bordado
  const coracao = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  const passo = 6;
  const x0 = A4.largura / 2 - (9 * passo) / 2;
  const y0 = doc.y + 2;
  tecido(doc.doc, x0, y0, 9, 8, passo);
  coracao.forEach((linha, l) =>
    [...linha].forEach((c, k) => c === 'X' && pontoX(doc.doc, x0 + (k + 1) * passo, y0 + (l + 1) * passo, passo, CORES.acento)),
  );
  const pontos = coracao.join('').split('X').length - 1;
  legendaDesenho(doc, `Um coração feito com ${pontos} pontos em X.`, x0 - 20, y0 + 8 * passo + 2, 9 * passo + 40);
  doc.y = y0 + 8 * passo + 12;
}

function materiais(doc: Documento): void {
  doc.titulo('2. Materiais necessários');
  doc.lista([
    'Tecido próprio para ponto cruz, chamado Etamine (ou Aida). Ele já tem os furinhos marcados em quadradinhos.',
    'Linhas de bordar em meadas. Este gráfico usa linhas DMC Mouliné: a lista de compras está na Parte 2.',
    'Agulha de tapeçaria: tem a ponta arredondada (não fura o dedo nem o tecido) e o buraco maior.',
    'Tesoura pequena e bem afiada.',
    'Bastidor: um aro de madeira ou plástico que deixa o tecido esticado. Ajuda bastante, mas não é obrigatório.',
    'O gráfico impresso e um lápis ou marca-texto para marcar o que já foi bordado.',
    'Boa luz. Se precisar, use óculos ou uma lupa.',
  ]);
}

function tecidoEAgulha(doc: Documento): void {
  doc.titulo('3. Como escolher o tecido e a agulha');
  doc.paragrafo(
    'O número do tecido Etamine diz quantos quadradinhos cabem em 2,54 cm (uma polegada). ' +
      'Quanto maior o número, menores os pontos e menor o bordado pronto.',
  );
  const d = doc.doc;
  const colunas = ['Tecido', 'Quadradinhos por cm', 'Fios da linha', 'Agulha nº'];
  const larguras = [42, 56, 42, 46];
  const dados = [
    ['Etamine 11', '4,3', '3 fios', '22'],
    ['Etamine 14', '5,5', '2 fios', '24'],
    ['Etamine 16', '6,3', '2 fios', '24 ou 26'],
    ['Etamine 18', '7,1', '1 ou 2 fios', '26'],
  ];
  const alturaFila = 9;
  doc.garantirEspaco(alturaFila * 5 + 6);
  let y = doc.y;
  const desenharFila = (textos: string[], cabecalho: boolean, par: boolean) => {
    if (cabecalho || par) {
      d.setFillColor(cabecalho ? CORES.acentoClaro : CORES.fundo);
      d.rect(MARGEM, y, larguras.reduce((s, n) => s + n, 0), alturaFila, 'F');
    }
    let x = MARGEM;
    textos.forEach((t, i) => {
      doc.fonte(12, cabecalho, CORES.texto);
      d.text(t, x + 3, y + alturaFila / 2, { baseline: 'middle' });
      x += larguras[i];
    });
    y += alturaFila;
  };
  desenharFila(colunas, true, false);
  dados.forEach((f, i) => desenharFila(f, false, i % 2 === 1));
  doc.y = y + 5;
  doc.caixa('Dica', 'Para começar, prefira Etamine 11 ou 14: os furinhos são fáceis de ver e de contar.');
  doc.paragrafo(
    'Corte o tecido com pelo menos 5 cm a mais em cada lado do desenho. Para não desfiar, ' +
      'passe fita crepe nas bordas ou faça um zigue-zague à máquina.',
  );
}

function prepararLinha(doc: Documento): void {
  doc.titulo('4. Como preparar a linha e colocar na agulha');
  doc.lista(
    [
      'A meada tem 6 fios finos torcidos juntos. Segure a meada e puxe a ponta que sai perto da etiqueta: a linha sai sem embolar.',
      'Corte um pedaço de mais ou menos 50 cm (do dedo ao cotovelo). Pedaços maiores embolam e se desgastam.',
      'Separe os fios um a um, puxando devagar, e junte de novo só a quantidade indicada (normalmente 2 fios).',
      'Dobre a ponta da linha sobre a agulha, aperte bem a dobra entre os dedos e passe essa dobra pelo buraco. Um passa-linha ajuda muito.',
      'Não dê nó na ponta. No ponto cruz, o nó faz volume e pode aparecer do lado direito.',
    ],
    true,
  );
  doc.caixa('Dica', 'Guarde cada linha com a etiqueta ou numa cartela com o código escrito. Assim você nunca confunde as cores.');
}

function primeiroPonto(doc: Documento): void {
  doc.titulo('5. Como fazer o primeiro ponto cruz');
  doc.paragrafo('Os números mostram a ordem dos furos. "Suba" é passar a agulha de trás para a frente; "desça" é da frente para trás.');

  const d = doc.doc;
  const passo = 14;
  const quadro = passo * 2;
  const espaco = (doc.larguraUtil - 4 * quadro) / 3;
  const y0 = doc.y + 4;
  const textos = ['Suba no furo 1 (embaixo, à esquerda).', 'Desça no furo 2 (em cima, à direita). Meio ponto pronto.', 'Suba no furo 3 (embaixo, à direita).', 'Desça no furo 4 (em cima, à esquerda). Um X completo!'];
  for (let i = 0; i < 4; i++) {
    const x0 = MARGEM + i * (quadro + espaco);
    tecido(d, x0, y0, 2, 2, passo);
    const x = x0 + passo / 2;
    const y = y0 + passo / 2;
    if (i >= 1) pontoX(d, x, y, passo, CORES.verde, i < 3);
    if (i === 3) pontoX(d, x, y, passo, CORES.verde);
    const furos: [number, number][] = [[x, y + passo], [x + passo, y], [x + passo, y + passo], [x, y]];
    numeroNoFuro(d, doc, i + 1, furos[i][0], furos[i][1]);
    const larguraTexto = quadro + Math.min(espaco - 4, 14);
    legendaDesenho(doc, textos[i], x0 + quadro / 2 - larguraTexto / 2, y0 + quadro + 3, larguraTexto);
  }
  doc.y = y0 + quadro + 22;

  doc.subtitulo('Vários pontos da mesma cor, em fila');
  doc.paragrafo('Faça primeiro meio ponto ( / ) em todos os quadradinhos da fila, indo para a direita. Depois volte fechando cada um com o outro meio ( \\ ).');
  const p2 = 10;
  const y1 = doc.y + 2;
  const xa = MARGEM + 10;
  tecido(d, xa, y1, 6, 3, p2);
  for (let k = 0; k < 4; k++) pontoX(d, xa + (k + 1) * p2, y1 + p2, p2, CORES.verde, true);
  seta(d, xa + p2, y1 + 2.6 * p2, xa + 5 * p2, y1 + 2.6 * p2);
  legendaDesenho(doc, 'Ida: só " / "', xa, y1 + 3 * p2 + 2, 6 * p2);
  const xb = MARGEM + doc.larguraUtil - 6 * p2 - 10;
  tecido(d, xb, y1, 6, 3, p2);
  for (let k = 0; k < 4; k++) pontoX(d, xb + (k + 1) * p2, y1 + p2, p2, CORES.verde);
  seta(d, xb + 5 * p2, y1 + 2.6 * p2, xb + p2, y1 + 2.6 * p2);
  legendaDesenho(doc, 'Volta: fechando com " \\ "', xb, y1 + 3 * p2 + 2, 6 * p2);
  doc.y = y1 + 3 * p2 + 12;

  doc.caixa(
    'Importante',
    'Todos os pontos devem cruzar do mesmo jeito: a perna de cima sempre na mesma direção. É isso que deixa o bordado bonito e uniforme.',
    CORES.acento,
  );
}

function comecarEArrematar(doc: Documento): void {
  doc.titulo('6. Como começar e arrematar o bordado');
  doc.subtitulo('Para começar (sem nó)');
  doc.paragrafo(
    'Suba a agulha e deixe uma ponta de uns 3 cm atrás do tecido. Segure essa ponta com o dedo, encostada no avesso, ' +
      'e faça os primeiros pontos por cima dela. Depois de 4 ou 5 pontos ela fica presa, e você corta o que sobrar.',
  );

  const d = doc.doc;
  const passo = 9;
  const y0 = doc.y + 2;
  const x0 = A4.largura / 2 - 4 * passo;
  d.setFillColor('#F1E8DA');
  d.rect(x0, y0, 8 * passo, 3 * passo, 'F');
  // a ponta solta, presa por baixo das passadas
  d.setDrawColor(CORES.acento);
  d.setLineWidth(1);
  d.line(x0 + 0.5 * passo, y0 + 1.5 * passo, x0 + 6.5 * passo, y0 + 1.5 * passo);
  d.setDrawColor(CORES.verde);
  d.setLineWidth(1.6);
  for (let k = 1; k <= 5; k++) d.line(x0 + (k + 0.5) * passo, y0 + 0.6 * passo, x0 + (k + 0.5) * passo, y0 + 2.4 * passo);
  legendaDesenho(doc, 'Visto pelo avesso: a ponta (vinho) fica presa embaixo das passadas da linha (verde).', x0 - 25, y0 + 3 * passo + 2, 8 * passo + 50);
  doc.y = y0 + 3 * passo + 14;

  doc.subtitulo('Para terminar (arrematar)');
  doc.paragrafo(
    'Quando sobrar uns 8 cm de linha, vire o tecido. Passe a agulha por baixo de 4 ou 5 pontos já feitos, ' +
      'do lado do avesso, e corte rente. Também não precisa de nó.',
  );
  doc.caixa(
    'Cuidado',
    'Evite levar a linha pelo avesso de um ponto a outro muito longe (mais de 3 quadradinhos). Ela pode aparecer pela frente, ' +
      'principalmente em tecido claro. Nesses casos, arremate e comece de novo.',
    CORES.acento,
  );
}

function quadriculas(doc: Documento): void {
  doc.titulo('7. Como entender quadrículas e símbolos');
  doc.paragrafo(
    'O gráfico é como um papel quadriculado. Cada quadradinho do gráfico é um X no tecido. O símbolo dentro do quadradinho ' +
      'diz qual linha usar. Quadradinho em branco quer dizer: não borda, ali aparece o próprio tecido.',
  );
  const d = doc.doc;
  const passo = 9;
  const y0 = doc.y + 2;
  const xg = MARGEM + 20;
  const desenho = ['.AA.', 'ABBA', 'ABBA', '.AA.'];
  // gráfico
  d.setDrawColor('#000000');
  d.setLineWidth(0.25);
  for (let l = 0; l < 4; l++) {
    for (let c = 0; c < 4; c++) {
      d.rect(xg + c * passo, y0 + l * passo, passo, passo, 'S');
      const s = desenho[l][c];
      d.setFillColor('#000000');
      if (s === 'A') d.circle(xg + (c + 0.5) * passo, y0 + (l + 0.5) * passo, passo * 0.28, 'F');
      if (s === 'B') {
        d.triangle(xg + (c + 0.5) * passo, y0 + (l + 0.18) * passo, xg + (c + 0.85) * passo, y0 + (l + 0.8) * passo, xg + (c + 0.15) * passo, y0 + (l + 0.8) * passo, 'F');
      }
    }
  }
  legendaDesenho(doc, 'No gráfico', xg, y0 + 4 * passo + 2, 4 * passo);
  seta(d, xg + 4 * passo + 8, y0 + 2 * passo, xg + 4 * passo + 38, y0 + 2 * passo);
  // tecido bordado
  const xt = xg + 4 * passo + 48;
  tecido(d, xt, y0, 4, 4, passo);
  for (let l = 0; l < 4; l++) {
    for (let c = 0; c < 4; c++) {
      const s = desenho[l][c];
      if (s !== '.') pontoX(d, xt + c * passo, y0 + l * passo, passo, s === 'A' ? '#C72B3B' : '#F0B020');
    }
  }
  legendaDesenho(doc, 'No tecido', xt, y0 + 4 * passo + 2, 4 * passo);
  doc.y = y0 + 4 * passo + 12;
  doc.paragrafo(
    'No gráfico, as linhas mais grossas aparecem a cada 10 quadradinhos, e os números nas bordas também contam de 10 em 10. ' +
      'Isso ajuda a não se perder na contagem.',
  );
}

function legendaExplicada(doc: Documento): void {
  doc.titulo('8. Como interpretar a legenda');
  doc.paragrafo('A legenda é a lista de linhas do seu bordado. Cada linha da legenda mostra:');
  doc.lista([
    'o símbolo usado no gráfico;',
    'a cor (aproximada, só para orientar);',
    'o código da linha, por exemplo DMC 310 — é por ele que você compra;',
    'o nome da cor, quando o fabricante informa;',
    'quantos pontos dessa cor existem no bordado;',
    'quantas meadas comprar (uma estimativa).',
  ]);
  doc.caixa(
    'Atenção às cores',
    'A cor impressa e a cor na tela são sempre aproximadas. O que vale é o código. Se puder, compare com a meada na loja antes de comprar.',
    CORES.acento,
  );
}

function centro(doc: Documento): void {
  doc.titulo('9. Como localizar o centro');
  doc.paragrafo('Começar pelo centro garante que o desenho fique no meio do tecido.');
  const d = doc.doc;
  const y0 = doc.y + 2;
  const l = 60;
  const a = 45;
  const x0 = MARGEM + 10;
  d.setFillColor('#FFFDF7');
  d.setDrawColor(CORES.bordaForte);
  d.setLineWidth(0.4);
  d.rect(x0, y0, l, a, 'FD');
  d.setDrawColor(CORES.acento);
  d.setLineWidth(0.6);
  d.setLineDashPattern([2, 1.5], 0);
  d.line(x0 + l / 2, y0, x0 + l / 2, y0 + a);
  d.line(x0, y0 + a / 2, x0 + l, y0 + a / 2);
  d.setLineDashPattern([], 0);
  d.setFillColor(CORES.acento);
  d.circle(x0 + l / 2, y0 + a / 2, 1.8, 'F');
  legendaDesenho(doc, 'No tecido: dobre ao meio nos dois sentidos.', x0 - 5, y0 + a + 2, l + 10);

  // gráfico com as setas do centro
  const x1 = A4.largura - MARGEM - l - 10;
  d.setDrawColor('#000000');
  d.setLineWidth(0.15);
  for (let k = 0; k <= 12; k++) d.line(x1 + k * 5, y0, x1 + k * 5, y0 + a);
  for (let k = 0; k <= 9; k++) d.line(x1, y0 + k * 5, x1 + l, y0 + k * 5);
  d.setDrawColor(CORES.acento);
  d.setLineWidth(0.7);
  d.setLineDashPattern([2, 1.5], 0);
  d.line(x1 + l / 2, y0, x1 + l / 2, y0 + a);
  d.line(x1, y0 + a / 2, x1 + l, y0 + a / 2);
  d.setLineDashPattern([], 0);
  d.setFillColor(CORES.acento);
  d.triangle(x1 + l / 2 - 2.5, y0 - 4, x1 + l / 2 + 2.5, y0 - 4, x1 + l / 2, y0 - 0.5, 'F');
  d.triangle(x1 - 4, y0 + a / 2 - 2.5, x1 - 4, y0 + a / 2 + 2.5, x1 - 0.5, y0 + a / 2, 'F');
  legendaDesenho(doc, 'No gráfico: siga as setinhas e as linhas tracejadas.', x1 - 5, y0 + a + 2, l + 10);
  doc.y = y0 + a + 14;

  doc.lista([
    'No tecido: dobre ao meio no comprimento e depois ao meio na largura. Onde as dobras se cruzam é o centro. Marque com um alfinete ou com um alinhavo (pontos grandes com linha de costura, que depois são retirados).',
    'No gráfico: procure as setinhas vinho nas réguas e as linhas tracejadas. Onde elas se cruzam é o centro do desenho.',
    'Comece a bordar ali, a partir do centro, e vá crescendo para os lados.',
  ]);
}

function dicas(doc: Documento): void {
  doc.titulo('10. Dicas para iniciantes e erros comuns');
  doc.lista([
    'Borde uma cor por vez, numa área pequena, e marque no gráfico o que já fez.',
    'Conte duas vezes antes de bordar, principalmente longe de outros pontos.',
    'Não puxe a linha com força: o tecido franze. Também não deixe frouxo demais.',
    'De vez em quando, solte a agulha e deixe a linha pendurada: ela destorce sozinha.',
    'Errou? Desfaça com a ponta da agulha, com calma, sem cortar o tecido.',
    'Lave as mãos antes de bordar e guarde o trabalho num saquinho limpo.',
    'Faça pausas: elas descansam os olhos e as mãos.',
    'Ao terminar, lave à mão com água fria e sabão neutro, e passe a ferro pelo avesso sobre uma toalha.',
  ]);
}

// ---------- Tudo junto ----------

export function escreverApostila(doc: Documento, imagemPrevia?: { dados: string; largura: number; altura: number }): void {
  capa(doc, imagemPrevia);
  doc.novaPagina();
  oQueE(doc);
  materiais(doc);
  doc.novaPagina();
  tecidoEAgulha(doc);
  prepararLinha(doc);
  doc.novaPagina();
  primeiroPonto(doc);
  doc.novaPagina();
  comecarEArrematar(doc);
  quadriculas(doc);
  doc.novaPagina();
  legendaExplicada(doc);
  centro(doc);
  doc.novaPagina();
  dicas(doc);
}
