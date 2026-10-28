// Tela 3 — Confira seu gráfico.
// O gráfico com símbolos, três modos de ver, ampliação, a legenda
// e a correção manual (trocar a linha de uma cor e pintar pontos).

import { estado } from '../estado';
import { SEM_PONTO, type Grafico } from '../processamento/converter';
import { formatarCm, pontosParaCm } from '../processamento/medidas';
import {
  CELULA_MIN_SIMBOLO,
  COR_TECIDO,
  desenharGrafico,
  MARGEM_REGUA,
  NIVEIS_ZOOM,
  PincelCanvas,
  pontoNaPosicao,
  zoomInicial,
  type ModoGrafico,
} from '../grafico/desenhar';
import { corDoSimbolo, simboloDa } from '../grafico/simbolos';
import {
  Historico,
  linhasParecidas,
  pintar,
  pontosNoCaminho,
  procurarLinhas,
  recontar,
  removerCoresSemPontos,
  trocarCor,
} from '../grafico/edicao';
import { LINHAS_DMC, type Linha } from '../catalogo/dmc';
import { textoAnchor, textoMaxi } from '../catalogo/equivalencias';
import { caixaDeErro, el } from './dom';
import type { ContextoTela } from './etapas';

const MODOS: { valor: ModoGrafico; texto: string }[] = [
  { valor: 'cores-simbolos', texto: 'Cores e símbolos' },
  { valor: 'simbolos', texto: 'Só símbolos (preto e branco)' },
  { valor: 'previa', texto: 'Como vai ficar' },
];

// Escolhas desta tela, lembradas ao voltar para ela.
const vista = {
  modo: 'cores-simbolos' as ModoGrafico,
  zoom: -1,
  destaque: null as number | null,
  editando: false,
  /** Cor do pincel: posição na legenda ou SEM_PONTO. */
  pincel: 0,
  cursor: { coluna: 0, linha: 0 },
};
let graficoDaVista: Grafico | null = null;
const historico = new Historico();
let observador: ResizeObserver | null = null;
let raiz: HTMLElement;
let contexto: ContextoTela;

export function podeContinuarTela3(): boolean {
  return estado.grafico !== null;
}

/** Ao sair da tela, termina a correção: cores que ficaram sem pontos saem da legenda. */
export function aoContinuarTela3(): string | null {
  if (estado.grafico && estado.graficoEditado) {
    estado.grafico = graficoDaVista = removerCoresSemPontos(estado.grafico);
  }
  vista.editando = false;
  return null;
}

/** Ex.: "DMC 321 Vermelho Carmim" (ou só o código, quando não há nome oficial). */
export function descreverLinha(g: Grafico, indice: number): string {
  if (indice === SEM_PONTO) return 'sem bordado (tecido)';
  const l = g.paleta[indice];
  return l.nome ? `DMC ${l.codigo} ${l.nome}` : `DMC ${l.codigo}`;
}

/** Quadradinho com o símbolo sobre a cor (ou em preto e branco). */
function amostra(linha: Linha | null, indice: number, lado: number, pb = false): HTMLCanvasElement {
  const c = el('canvas', { className: 'amostra-simbolo', width: lado, height: lado });
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  if (!linha) {
    ctx.fillStyle = COR_TECIDO; // "sem bordado": só o tecido
    ctx.fillRect(0, 0, lado, lado);
    return c;
  }
  ctx.fillStyle = pb ? '#FFFFFF' : linha.hex;
  ctx.fillRect(0, 0, lado, lado);
  if (indice >= 0) {
    const pincel = new PincelCanvas(ctx);
    pincel.cor(pb ? '#000000' : corDoSimbolo(linha.lab.L));
    simboloDa(indice).desenhar(pincel, 0, 0, lado);
  }
  return c;
}

export function montarTela3(container: HTMLElement, ctx: ContextoTela): void {
  raiz = container;
  contexto = ctx;
  ctx.atualizarNavegacao();
  if (estado.grafico && graficoDaVista !== estado.grafico) {
    // gráfico novo (veio da etapa 2): começa do zero
    graficoDaVista = estado.grafico;
    vista.zoom = -1;
    vista.destaque = null;
    vista.editando = false;
    vista.pincel = 0;
    vista.cursor = { coluna: 0, linha: 0 };
    historico.limpar();
  }
  desenharTela();
}

/** Troca o gráfico por uma versão corrigida e redesenha a tela, mantendo a posição. */
function aplicar(novo: Grafico, mensagem: string, focar?: () => HTMLElement | null): void {
  estado.grafico = graficoDaVista = novo;
  estado.graficoEditado = true;
  if (vista.destaque !== null && vista.destaque >= novo.paleta.length) vista.destaque = null;
  if (vista.pincel !== SEM_PONTO && vista.pincel >= novo.paleta.length) vista.pincel = 0;
  desenharTela(focar);
  contexto.anunciar(mensagem);
}

function desenharTela(focar?: () => HTMLElement | null): void {
  const g = estado.grafico;
  if (!g) {
    raiz.replaceChildren(caixaDeErro('Volte à etapa 2 para preparar o gráfico.'));
    return;
  }
  const janelaAntiga = raiz.querySelector<HTMLElement>('.janela-grafico');
  const rolagem = janelaAntiga ? [janelaAntiga.scrollLeft, janelaAntiga.scrollTop] : null;
  const rolagemPagina = window.scrollY;

  // ----- resumo -----
  const { tecido } = estado.config;
  const total = g.contagem.reduce((s, n) => s + n, 0);
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

  const botaoCorrigir = el(
    'button',
    { type: 'button', className: `botao ${vista.editando ? 'botao-principal' : 'botao-secundario'} botao-corrigir` },
    vista.editando ? 'Concluir correções' : 'Corrigir pontos',
  );

  // ----- área do gráfico -----
  const canvas = el('canvas', { className: 'canvas-grafico' });
  const espaco = el('div', { className: 'espaco-grafico' }, canvas);
  const janela = el('div', { className: `janela-grafico${vista.editando ? ' editando' : ''}`, tabIndex: 0 }, espaco);
  janela.setAttribute('role', 'region');
  janela.setAttribute(
    'aria-label',
    vista.editando
      ? `Gráfico em correção, ${g.largura} por ${g.altura} pontos. Setas movem o cursor; Espaço pinta o ponto com a cor escolhida.`
      : `Gráfico do bordado, ${g.largura} por ${g.altura} pontos. Use as setas do teclado para rolar. A legenda abaixo lista todas as cores.`,
  );
  const avisoZoom = el('p', { className: 'dica aviso-zoom' });
  const infoPonto = el(
    'p',
    { className: 'info-ponto' },
    vista.editando ? 'Toque ou arraste sobre os quadradinhos para pintar.' : 'Toque num ponto do gráfico para ver qual linha usar.',
  );
  infoPonto.setAttribute('aria-live', 'polite');

  const partes: Node[] = [resumo, el('div', { className: 'barra-grafico' }, modos, zoom)];
  if (estado.graficoEditado && !vista.editando) {
    partes.push(el('p', { className: 'aviso-fundo' }, 'Este gráfico tem correções feitas à mão.'));
  }
  const desfazer = el('button', { type: 'button', className: 'botao botao-secundario botao-desfazer' }, '↶ Desfazer');
  desfazer.hidden = historico.vazio;
  desfazer.addEventListener('click', () => {
    const anterior = historico.desfazer(estado.grafico!);
    if (!anterior) return;
    // se não sobrou nada para desfazer, o foco vai para o botão vizinho
    aplicar(anterior, 'Última correção desfeita.', () =>
      raiz.querySelector<HTMLElement>(historico.vazio ? '.botao-corrigir' : '.botao-desfazer'),
    );
  });
  partes.push(el('div', { className: 'grupo-botoes' }, botaoCorrigir, desfazer));
  if (vista.editando) partes.push(painelDeCorrecao(g));
  partes.push(
    janela,
    avisoZoom,
    infoPonto,
    el('p', { className: 'dica' }, 'As linhas grossas marcam a cada 10 pontos. As linhas tracejadas vinho e as setas nas réguas marcam o centro do bordado.'),
    montarLegenda(g, total, () => desenhar()),
  );
  raiz.replaceChildren(...partes);

  // ----- comportamento -----

  const celula = () => NIVEIS_ZOOM[vista.zoom];

  function ajustarTamanho(): void {
    const t = (n: number) => MARGEM_REGUA + n * celula() + 2;
    espaco.style.width = `${t(g!.largura)}px`;
    espaco.style.height = `${t(g!.altura)}px`;
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
        cursor: vista.editando && document.activeElement === janela ? vista.cursor : null,
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
  janela.addEventListener('focus', desenhar);
  janela.addEventListener('blur', desenhar);

  botaoCorrigir.addEventListener('click', () => {
    if (vista.editando) {
      vista.editando = false;
      const voltar = () => raiz.querySelector<HTMLElement>('.botao-corrigir');
      if (estado.graficoEditado) aplicar(removerCoresSemPontos(g!), 'Correções concluídas.', voltar);
      else {
        desenharTela(voltar);
        contexto.anunciar('Modo de correção desligado.');
      }
    } else {
      vista.editando = true;
      if (vista.modo === 'previa') vista.modo = 'cores-simbolos';
      desenharTela(() => raiz.querySelector('.painel-edicao h2'));
      contexto.anunciar('Modo de correção ligado. Escolha a cor e pinte os quadradinhos.');
    }
  });

  // ----- consultar ou pintar com o dedo / mouse -----

  const pontoDoEvento = (e: PointerEvent | MouseEvent) => {
    const caixa = canvas.getBoundingClientRect();
    return pontoNaPosicao(e.clientX - caixa.left, e.clientY - caixa.top, janela.scrollLeft, janela.scrollTop, celula(), g!.largura, g!.altura);
  };

  const descreverPonto = (coluna: number, linha: number) => {
    const i = g!.celulas[linha * g!.largura + coluna];
    return i === SEM_PONTO
      ? `Coluna ${coluna + 1}, linha ${linha + 1}: sem bordado (aqui aparece o tecido).`
      : `Coluna ${coluna + 1}, linha ${linha + 1}: ${descreverLinha(g!, i)} — símbolo ${simboloDa(i).nome}.`;
  };

  let pinceladas = 0; // pontos mudados no traço atual
  let pintando = false;
  let ultimo: { coluna: number; linha: number } | null = null;

  /** Pinta um ponto; antes do primeiro ponto mudado do traço, guarda o estado para "Desfazer". */
  function pintarPonto(coluna: number, linha: number): void {
    const posicao = linha * g!.largura + coluna;
    if (g!.celulas[posicao] === vista.pincel) return;
    if (pinceladas === 0) historico.guardar(g!);
    if (pintar(g!, posicao, vista.pincel)) pinceladas++;
  }

  function terminarTraco(): void {
    pintando = false;
    ultimo = null;
    if (pinceladas === 0) return;
    const n = pinceladas;
    pinceladas = 0;
    const foco = document.activeElement === janela ? () => raiz.querySelector<HTMLElement>('.janela-grafico') : undefined;
    const mensagem =
      vista.pincel === SEM_PONTO
        ? `${n} ${n === 1 ? 'ponto ficou' : 'pontos ficaram'} sem bordado.`
        : `${n} ${n === 1 ? 'ponto pintado' : 'pontos pintados'} com ${descreverLinha(g!, vista.pincel)}.`;
    aplicar(recontar(g!), mensagem, foco);
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!vista.editando) return;
    const p = pontoDoEvento(e);
    if (!p) return;
    e.preventDefault();
    try {
      canvas.setPointerCapture(e.pointerId); // continua pintando mesmo se o dedo sair do gráfico
    } catch {
      // alguns navegadores recusam; sem problema
    }
    pintando = true;
    pintarPonto(p.coluna, p.linha);
    ultimo = p;
    desenhar();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pintando) return;
    const p = pontoDoEvento(e);
    if (!p) return;
    // pinta também os quadradinhos entre o movimento anterior e este
    const caminho = ultimo ? pontosNoCaminho(ultimo.coluna, ultimo.linha, p.coluna, p.linha) : [p];
    for (const q of caminho) pintarPonto(q.coluna, q.linha);
    ultimo = p;
    desenhar();
  });
  canvas.addEventListener('pointerup', terminarTraco);
  canvas.addEventListener('pointercancel', terminarTraco);

  canvas.addEventListener('click', (e) => {
    if (vista.editando) return;
    const p = pontoDoEvento(e);
    if (p) infoPonto.textContent = descreverPonto(p.coluna, p.linha);
  });

  // ----- teclado no modo de correção: setas movem o cursor, Espaço pinta -----

  function mostrarCursor(): void {
    const { coluna, linha } = vista.cursor;
    const c = celula();
    const visivelL = janela.clientWidth - MARGEM_REGUA;
    const visivelA = janela.clientHeight - MARGEM_REGUA;
    if (coluna * c < janela.scrollLeft) janela.scrollLeft = coluna * c;
    else if ((coluna + 1) * c > janela.scrollLeft + visivelL) janela.scrollLeft = (coluna + 1) * c - visivelL;
    if (linha * c < janela.scrollTop) janela.scrollTop = linha * c;
    else if ((linha + 1) * c > janela.scrollTop + visivelA) janela.scrollTop = (linha + 1) * c - visivelA;
    desenhar();
  }

  janela.addEventListener('keydown', (e) => {
    if (!vista.editando) return;
    const passos: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const passo = passos[e.key];
    if (passo) {
      e.preventDefault();
      vista.cursor = {
        coluna: Math.min(g!.largura - 1, Math.max(0, vista.cursor.coluna + passo[0])),
        linha: Math.min(g!.altura - 1, Math.max(0, vista.cursor.linha + passo[1])),
      };
      mostrarCursor();
      infoPonto.textContent = descreverPonto(vista.cursor.coluna, vista.cursor.linha);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      pintarPonto(vista.cursor.coluna, vista.cursor.linha);
      if (pinceladas === 0) infoPonto.textContent = 'Este ponto já tem essa cor.';
      terminarTraco();
    }
  });

  observador?.disconnect(); // o da visita anterior a esta tela
  observador = new ResizeObserver(() => desenhar());
  observador.observe(janela);

  if (vista.zoom < 0) vista.zoom = zoomInicial(g.largura, janela.clientWidth || 600);
  ajustarTamanho();
  if (rolagem) [janela.scrollLeft, janela.scrollTop] = rolagem;
  window.scrollTo({ top: rolagemPagina });
  atualizarAvisoZoom();
  desenhar();
  focar?.()?.focus({ preventScroll: true });
  // redesenha quando a fonte dos símbolos de letra terminar de carregar
  void document.fonts?.ready.then(desenhar);
}

// ---------- Painel de correção ----------

function painelDeCorrecao(g: Grafico): HTMLElement {
  const titulo = el('h2', { className: 'subtitulo', tabIndex: -1 }, 'Corrigir pontos');
  const cores = el('fieldset', { className: 'grupo-pincel' }, el('legend', {}, 'Pintar com'));
  const opcoes: { valor: number; linha: Linha | null; texto: string }[] = [
    ...g.paleta.map((l, i) => ({ valor: i, linha: l, texto: `DMC ${l.codigo}` })),
    { valor: SEM_PONTO, linha: null, texto: 'Sem bordado' },
  ];
  for (const o of opcoes) {
    const entrada = el('input', { type: 'radio', name: 'pincel', value: String(o.valor), checked: vista.pincel === o.valor });
    entrada.addEventListener('change', () => {
      if (entrada.checked) vista.pincel = o.valor;
    });
    const rotulo = el('label', { className: 'botao-pincel' }, entrada, amostra(o.linha, o.valor === SEM_PONTO ? -1 : o.valor, 28), el('span', {}, o.texto));
    if (o.linha?.nome) rotulo.title = o.linha.nome;
    cores.append(rotulo);
  }

  const painel = el(
    'section',
    { className: 'painel-edicao' },
    titulo,
    el(
      'p',
      { className: 'dica' },
      'Escolha a cor e toque nos quadradinhos do gráfico (ou arraste) para pintar. "Sem bordado" deixa o tecido aparecer. ' +
        'Pelo teclado: entre no gráfico com Tab, mova o cursor com as setas e pinte com Espaço.',
    ),
    cores,
  );
  painel.setAttribute('aria-labelledby', 'titulo-correcao');
  titulo.id = 'titulo-correcao';
  return painel;
}

// ---------- Trocar a linha de uma cor ----------

function abrirTrocaDeCor(g: Grafico, indice: number, voltarPara: HTMLElement): void {
  const atual = g.paleta[indice];
  const dialogo = el('dialog', { className: 'dialogo' });
  dialogo.setAttribute('aria-labelledby', 'titulo-troca');

  const busca = el('input', { type: 'search', id: 'busca-linha', className: 'entrada-texto', autocomplete: 'off', placeholder: 'ex.: 310 ou vermelho' });
  const lista = el('ul', { className: 'lista-linhas' });
  const tituloLista = el('p', { className: 'rotulo-lista' });
  tituloLista.setAttribute('aria-live', 'polite');

  function mostrar(linhas: Linha[], titulo: string): void {
    tituloLista.textContent = titulo;
    lista.replaceChildren(
      ...linhas.map((l) => {
        const naLegenda = g.paleta.some((p) => p.codigo === l.codigo);
        const botao = el(
          'button',
          { type: 'button', className: 'opcao-linha' },
          amostra(l, -1, 32),
          el('span', { className: 'opcao-linha-texto' }, el('strong', {}, `DMC ${l.codigo}`), ` ${l.nome}`),
          ...(naLegenda ? [el('span', { className: 'ja-usada' }, 'já está no gráfico: as duas cores se juntam')] : []),
        );
        botao.addEventListener('click', () => escolher(l));
        return el('li', {}, botao);
      }),
    );
  }

  /** Fecha a janela e a tira da página. Devolve o foco a quem a abriu, se pedido. */
  function fechar(voltar: boolean): void {
    if (dialogo.open) dialogo.close();
    dialogo.remove();
    if (voltar && voltarPara.isConnected) voltarPara.focus();
  }

  function escolher(nova: Linha): void {
    fechar(false);
    historico.guardar(g);
    const juntou = g.paleta.some((p) => p.codigo === nova.codigo);
    const novo = trocarCor(g, indice, nova);
    aplicar(
      novo,
      juntou ? `A linha DMC ${atual.codigo} foi juntada com a DMC ${nova.codigo}.` : `A linha DMC ${atual.codigo} foi trocada pela DMC ${nova.codigo}.`,
      () => raiz.querySelector<HTMLElement>(`[data-trocar="${nova.codigo}"]`),
    );
  }

  const parecidas = linhasParecidas(atual, LINHAS_DMC, 12);
  busca.addEventListener('input', () => {
    const texto = busca.value.trim();
    if (!texto) mostrar(parecidas, 'Cores parecidas:');
    else {
      const achadas = procurarLinhas(texto, LINHAS_DMC);
      mostrar(achadas, achadas.length ? `${achadas.length} ${achadas.length === 1 ? 'linha encontrada' : 'linhas encontradas'}:` : 'Nenhuma linha encontrada.');
    }
  });

  const cancelar = el('button', { type: 'button', className: 'botao botao-secundario' }, 'Cancelar');
  cancelar.addEventListener('click', () => fechar(true));
  // tecla Esc
  dialogo.addEventListener('cancel', (e) => {
    e.preventDefault();
    fechar(true);
  });

  dialogo.append(
    el('h2', { className: 'subtitulo', id: 'titulo-troca' }, `Trocar a linha DMC ${atual.codigo}`),
    el(
      'p',
      {},
      `Os ${g.contagem[indice].toLocaleString('pt-BR')} pontos desta cor (${atual.nome || 'sem nome oficial'}) vão passar para a linha que você escolher. ` +
        'O símbolo continua o mesmo.',
    ),
    el('div', { className: 'campo-texto' }, el('label', { htmlFor: 'busca-linha' }, 'Procurar pelo código ou pelo nome'), busca),
    tituloLista,
    lista,
    el('div', { className: 'grupo-botoes' }, cancelar),
  );
  mostrar(parecidas, 'Cores parecidas:');
  document.body.append(dialogo);
  dialogo.showModal();
  busca.focus();
}

// ---------- Legenda ----------

function montarLegenda(g: Grafico, total: number, aoMudarDestaque: () => void): HTMLElement {
  const corpo = el('tbody');
  const botoes: HTMLButtonElement[] = [];

  g.paleta.forEach((linha, i) => {
    const simbolo = simboloDa(i);
    const cor = amostra(linha, i, 40);
    cor.setAttribute('role', 'img');
    cor.setAttribute('aria-label', `símbolo ${simbolo.nome}`);
    const pb = amostra(linha, i, 40, true);
    pb.classList.add('amostra-pb');
    pb.setAttribute('aria-hidden', 'true');

    const nome = linha.nome ? el('span', { className: 'nome-linha' }, linha.nome) : el('span', { className: 'nome-linha sem-nome' }, 'sem nome oficial');
    const celulaLinha = el(
      'td',
      {},
      el('strong', { className: 'codigo-linha' }, `DMC ${linha.codigo}`),
      nome,
      el('span', { className: 'outras-marcas' }, `Anchor: ${textoAnchor(linha.codigo)}`),
      el('span', { className: 'outras-marcas' }, `Maxi: ${textoMaxi(linha.codigo)}`),
    );
    if (linha.conferir) celulaLinha.append(el('span', { className: 'conferir-linha' }, '⚠ Confira a cor com a meada'));

    const destacar = el('button', { type: 'button', className: 'botao-destacar' }, 'Destacar');
    destacar.setAttribute('aria-label', `Destacar no gráfico a linha DMC ${linha.codigo}`);
    destacar.setAttribute('aria-pressed', String(vista.destaque === i));
    destacar.addEventListener('click', () => {
      vista.destaque = vista.destaque === i ? null : i;
      botoes.forEach((b, j) => b.setAttribute('aria-pressed', String(vista.destaque === j)));
      aoMudarDestaque();
    });
    botoes.push(destacar);

    const trocar = el('button', { type: 'button', className: 'botao-destacar' }, 'Trocar cor');
    // o nome lido começa com o texto visível ("Trocar cor"), para quem usa comando de voz
    trocar.setAttribute('aria-label', `Trocar cor da linha DMC ${linha.codigo}`);
    trocar.dataset.trocar = linha.codigo;
    trocar.addEventListener('click', () => abrirTrocaDeCor(estado.grafico!, i, trocar));

    const pontos = g.contagem[i];
    const percentual = total ? ((pontos / total) * 100).toFixed(1).replace('.', ',') : '0';
    corpo.append(
      el(
        'tr',
        {},
        el('td', { className: 'celula-simbolos' }, cor, pb),
        celulaLinha,
        el('td', { className: 'numero' }, pontos.toLocaleString('pt-BR'), el('span', { className: 'percentual' }, ` (${percentual}%)`)),
        el('td', { className: 'acoes-legenda' }, destacar, trocar),
      ),
    );
  });

  const cabecalho = el(
    'thead',
    {},
    el(
      'tr',
      {},
      ...['Símbolo', 'Linha', 'Pontos', 'Ações'].map((t) => {
        const th = el('th', {}, t);
        th.scope = 'col';
        return th;
      }),
    ),
  );

  const tabela = el('table', { className: 'tabela-legenda' }, el('caption', { className: 'so-leitor' }, `Legenda: ${g.paleta.length} linhas DMC`), cabecalho, corpo);
  // No celular a tabela vira blocos (CSS); os papéis explícitos mantêm a leitura
  // de tabela nos leitores de tela, que às vezes a perdem quando o visual muda.
  tabela.setAttribute('role', 'table');
  tabela.querySelectorAll('thead, tbody').forEach((e) => e.setAttribute('role', 'rowgroup'));
  tabela.querySelectorAll('tr').forEach((e) => e.setAttribute('role', 'row'));
  tabela.querySelectorAll('th').forEach((e) => e.setAttribute('role', 'columnheader'));
  tabela.querySelectorAll('td').forEach((e) => e.setAttribute('role', 'cell'));

  const vazios = g.celulas.reduce((s, c) => s + (c === SEM_PONTO ? 1 : 0), 0);
  return el(
    'section',
    { className: 'legenda' },
    el('h2', { className: 'subtitulo' }, 'Legenda'),
    el(
      'p',
      { className: 'dica' },
      'Cada símbolo corresponde a uma linha. Use "Destacar" para ver no gráfico só os pontos de uma cor, e "Trocar cor" para escolher outra linha DMC. ' +
        'As cores na tela são aproximadas: confira sempre com a linha. ' +
        'Os códigos Anchor e Maxi vêm das tabelas de conversão dos fabricantes e também são cores aproximadas; ' +
        '"sem cor correlata" quer dizer que a tabela não indica uma cor parecida nessa marca.',
    ),
    ...(vazios
      ? [el('p', { className: 'aviso-fundo' }, `Quadradinhos em branco (sem símbolo) ficam sem bordar: ali aparece o tecido. São ${vazios.toLocaleString('pt-BR')} quadradinhos.`)]
      : []),
    tabela,
  );
}
