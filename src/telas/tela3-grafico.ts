// Tela 3 — Confira seu gráfico.
// O gráfico com símbolos, três modos de ver, ampliação e a legenda.

import { estado } from '../estado';
import type { Grafico } from '../processamento/converter';
import { formatarCm, pontosParaCm } from '../processamento/medidas';
import {
  CELULA_MIN_SIMBOLO,
  desenharGrafico,
  MARGEM_REGUA,
  NIVEIS_ZOOM,
  PincelCanvas,
  pontoNaPosicao,
  zoomInicial,
  type ModoGrafico,
} from '../grafico/desenhar';
import { corDoSimbolo, simboloDa } from '../grafico/simbolos';
import { caixaDeErro, el } from './dom';
import type { ContextoTela } from './etapas';

const MODOS: { valor: ModoGrafico; texto: string }[] = [
  { valor: 'cores-simbolos', texto: 'Cores e símbolos' },
  { valor: 'simbolos', texto: 'Só símbolos (preto e branco)' },
  { valor: 'previa', texto: 'Como vai ficar' },
];

// Escolhas desta tela, lembradas ao voltar para ela.
const vista = { modo: 'cores-simbolos' as ModoGrafico, zoom: -1, destaque: null as number | null };
let graficoDaVista: Grafico | null = null;
let observador: ResizeObserver | null = null;

export function podeContinuarTela3(): boolean {
  return estado.grafico !== null;
}

/** Ex.: "DMC 321 Vermelho Carmim" (ou só o código, quando não há nome oficial). */
export function descreverLinha(g: Grafico, indice: number): string {
  const l = g.paleta[indice];
  return l.nome ? `DMC ${l.codigo} ${l.nome}` : `DMC ${l.codigo}`;
}

export function montarTela3(container: HTMLElement, ctx: ContextoTela): void {
  ctx.atualizarNavegacao();
  const g = estado.grafico;
  if (!g) {
    container.replaceChildren(caixaDeErro('Volte à etapa 2 para preparar o gráfico.'));
    return;
  }
  if (graficoDaVista !== g) {
    // gráfico novo: começa sem destaque e com o zoom recalculado
    graficoDaVista = g;
    vista.zoom = -1;
    vista.destaque = null;
  }

  // ----- resumo -----
  const { tecido } = estado.config;
  const resumo = el(
    'p',
    { className: 'resumo-grafico' },
    el('strong', {}, `${g.largura} × ${g.altura} pontos`),
    ` · ${formatarCm(pontosParaCm(g.largura, tecido))} × ${formatarCm(pontosParaCm(g.altura, tecido))} cm em Etamine ${tecido}`,
    ` · ${g.paleta.length} ${g.paleta.length === 1 ? 'cor' : 'cores'} DMC`,
  );

  // ----- barra de ferramentas -----
  const modos = el('fieldset', { className: 'grupo-modos' }, el('legend', {}, 'Como mostrar'));
  for (const m of MODOS) {
    const entrada = el('input', { type: 'radio', name: 'modo-grafico', value: m.valor, checked: vista.modo === m.valor });
    entrada.addEventListener('change', () => {
      vista.modo = m.valor;
      desenhar();
      atualizarAvisoZoom();
    });
    modos.append(el('label', { className: 'botao-modo' }, entrada, el('span', {}, m.texto)));
  }

  const menos = el('button', { type: 'button', className: 'botao botao-secundario botao-zoom' }, '−');
  const mais = el('button', { type: 'button', className: 'botao botao-secundario botao-zoom' }, '+');
  menos.setAttribute('aria-label', 'Diminuir o gráfico');
  mais.setAttribute('aria-label', 'Ampliar o gráfico');
  const textoZoom = el('span', { className: 'texto-zoom' });
  textoZoom.setAttribute('aria-live', 'polite');
  const zoom = el('div', { className: 'grupo-zoom' }, el('span', { className: 'rotulo-zoom' }, 'Tamanho:'), menos, textoZoom, mais);

  // ----- área do gráfico -----
  const canvas = el('canvas', { className: 'canvas-grafico' });
  const espaco = el('div', { className: 'espaco-grafico' }, canvas);
  const janela = el('div', { className: 'janela-grafico', tabIndex: 0 }, espaco);
  janela.setAttribute('role', 'region');
  janela.setAttribute(
    'aria-label',
    `Gráfico do bordado, ${g.largura} por ${g.altura} pontos. Use as setas do teclado para rolar. A legenda abaixo lista todas as cores.`,
  );
  const avisoZoom = el('p', { className: 'dica aviso-zoom' });
  const infoPonto = el('p', { className: 'info-ponto' }, 'Toque num ponto do gráfico para ver qual linha usar.');
  infoPonto.setAttribute('aria-live', 'polite');

  // ----- legenda -----
  const legenda = montarLegenda(g, () => {
    desenhar();
  });

  container.replaceChildren(
    resumo,
    el('div', { className: 'barra-grafico' }, modos, zoom),
    janela,
    avisoZoom,
    infoPonto,
    el(
      'p',
      { className: 'dica' },
      'As linhas grossas marcam a cada 10 pontos. As linhas tracejadas vinho e as setas nas réguas marcam o centro do bordado.',
    ),
    legenda,
  );

  // ----- comportamento -----

  const celula = () => NIVEIS_ZOOM[vista.zoom];

  function ajustarTamanho(): void {
    const total = (n: number) => MARGEM_REGUA + n * celula() + 2;
    espaco.style.width = `${total(g!.largura)}px`;
    espaco.style.height = `${total(g!.altura)}px`;
  }

  let pedido = 0;
  function desenhar(): void {
    cancelAnimationFrame(pedido);
    pedido = requestAnimationFrame(() => {
      const largura = Math.min(janela.clientWidth, MARGEM_REGUA + g!.largura * celula() + 2);
      const altura = Math.min(janela.clientHeight, MARGEM_REGUA + g!.altura * celula() + 2);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(largura * dpr);
      canvas.height = Math.round(altura * dpr);
      canvas.style.width = `${largura}px`;
      canvas.style.height = `${altura}px`;
      const c = canvas.getContext('2d');
      if (!c) return;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      desenharGrafico(c, g!, {
        celula: celula(),
        rolagemX: janela.scrollLeft,
        rolagemY: janela.scrollTop,
        larguraTela: largura,
        alturaTela: altura,
        modo: vista.modo,
        destaque: vista.destaque,
      });
    });
  }

  function atualizarAvisoZoom(): void {
    textoZoom.textContent = `${vista.zoom + 1} de ${NIVEIS_ZOOM.length}`;
    menos.disabled = vista.zoom === 0;
    mais.disabled = vista.zoom === NIVEIS_ZOOM.length - 1;
    avisoZoom.textContent =
      vista.modo !== 'previa' && celula() < CELULA_MIN_SIMBOLO ? 'Os símbolos aparecem quando você amplia o gráfico (botão +).' : '';
  }

  function mudarZoom(passo: number): void {
    const novo = Math.min(NIVEIS_ZOOM.length - 1, Math.max(0, vista.zoom + passo));
    if (novo === vista.zoom) return;
    // mantém no centro da janela o mesmo ponto que estava lá
    const antes = celula();
    const centroX = (janela.scrollLeft + (janela.clientWidth - MARGEM_REGUA) / 2) / antes;
    const centroY = (janela.scrollTop + (janela.clientHeight - MARGEM_REGUA) / 2) / antes;
    vista.zoom = novo;
    ajustarTamanho();
    janela.scrollLeft = centroX * celula() - (janela.clientWidth - MARGEM_REGUA) / 2;
    janela.scrollTop = centroY * celula() - (janela.clientHeight - MARGEM_REGUA) / 2;
    atualizarAvisoZoom();
    desenhar();
  }

  menos.addEventListener('click', () => mudarZoom(-1));
  mais.addEventListener('click', () => mudarZoom(1));
  janela.addEventListener('scroll', desenhar, { passive: true });

  canvas.addEventListener('click', (e) => {
    const caixa = canvas.getBoundingClientRect();
    const p = pontoNaPosicao(e.clientX - caixa.left, e.clientY - caixa.top, janela.scrollLeft, janela.scrollTop, celula(), g.largura, g.altura);
    if (!p) return;
    const i = g.celulas[p.linha * g.largura + p.coluna];
    infoPonto.textContent = `Coluna ${p.coluna + 1}, linha ${p.linha + 1}: ${descreverLinha(g, i)} — símbolo ${simboloDa(i).nome}.`;
  });

  observador?.disconnect(); // o da visita anterior a esta tela
  observador = new ResizeObserver(() => desenhar());
  observador.observe(janela);

  if (vista.zoom < 0) vista.zoom = zoomInicial(g.largura, janela.clientWidth || 600);
  ajustarTamanho();
  atualizarAvisoZoom();
  desenhar();
  // redesenha quando a fonte dos símbolos de letra terminar de carregar
  void document.fonts?.ready.then(desenhar);
}

// ---------- Legenda ----------

function montarLegenda(g: Grafico, aoMudarDestaque: () => void): HTMLElement {
  const corpo = el('tbody');
  const botoes: HTMLButtonElement[] = [];
  const total = g.contagem.reduce((s, n) => s + n, 0);

  g.paleta.forEach((linha, i) => {
    const simbolo = simboloDa(i);
    const amostra = el('canvas', { className: 'amostra-simbolo', width: 40, height: 40 });
    amostra.setAttribute('role', 'img');
    amostra.setAttribute('aria-label', `símbolo ${simbolo.nome}`);
    const c = amostra.getContext('2d');
    if (c) {
      c.fillStyle = linha.hex;
      c.fillRect(0, 0, 40, 40);
      const pincel = new PincelCanvas(c);
      pincel.cor(corDoSimbolo(linha.lab.L));
      simbolo.desenhar(pincel, 0, 0, 40);
    }
    const amostraPb = el('canvas', { className: 'amostra-simbolo amostra-pb', width: 40, height: 40 });
    amostraPb.setAttribute('aria-hidden', 'true');
    const cPb = amostraPb.getContext('2d');
    if (cPb) {
      cPb.fillStyle = '#FFFFFF';
      cPb.fillRect(0, 0, 40, 40);
      const pincel = new PincelCanvas(cPb);
      pincel.cor('#000000');
      simbolo.desenhar(pincel, 0, 0, 40);
    }

    const nome = linha.nome ? el('span', { className: 'nome-linha' }, linha.nome) : el('span', { className: 'nome-linha sem-nome' }, 'sem nome oficial');
    const celulaLinha = el('td', {}, el('strong', { className: 'codigo-linha' }, `DMC ${linha.codigo}`), nome);
    if (linha.conferir) celulaLinha.append(el('span', { className: 'conferir-linha' }, '⚠ Confira a cor com a meada'));

    const botao = el('button', { type: 'button', className: 'botao-destacar' }, 'Destacar');
    botao.setAttribute('aria-label', `Destacar no gráfico a linha DMC ${linha.codigo}`);
    botao.setAttribute('aria-pressed', String(vista.destaque === i));
    botao.addEventListener('click', () => {
      vista.destaque = vista.destaque === i ? null : i;
      botoes.forEach((b, j) => b.setAttribute('aria-pressed', String(vista.destaque === j)));
      aoMudarDestaque();
    });
    botoes.push(botao);

    const pontos = g.contagem[i];
    corpo.append(
      el(
        'tr',
        {},
        el('td', { className: 'celula-simbolos' }, amostra, amostraPb),
        celulaLinha,
        el('td', { className: 'numero' }, pontos.toLocaleString('pt-BR'), el('span', { className: 'percentual' }, ` (${((pontos / total) * 100).toFixed(1).replace('.', ',')}%)`)),
        el('td', {}, botao),
      ),
    );
  });

  const cabecalho = el(
    'thead',
    {},
    el(
      'tr',
      {},
      ...['Símbolo', 'Linha', 'Pontos', 'Ver no gráfico'].map((t) => {
        const th = el('th', {}, t);
        th.scope = 'col';
        return th;
      }),
    ),
  );

  return el(
    'section',
    { className: 'legenda' },
    el('h2', { className: 'subtitulo' }, 'Legenda'),
    el(
      'p',
      { className: 'dica' },
      'Cada símbolo corresponde a uma linha. Use "Destacar" para ver no gráfico só os pontos de uma cor. As cores na tela são aproximadas: confira sempre com a linha.',
    ),
    el('table', { className: 'tabela-legenda' }, el('caption', { className: 'so-leitor' }, `Legenda: ${g.paleta.length} linhas DMC`), cabecalho, corpo),
  );
}
