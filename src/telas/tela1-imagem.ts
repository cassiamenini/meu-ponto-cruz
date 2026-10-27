// Tela 1 — Escolha sua imagem.
// Escolher (ou arrastar) a foto, recortar, girar e ajustar a luz.

import { estado } from '../estado';
import { validarArquivo } from '../seguranca/validar';
import { carregarImagem, ErroAoAbrir } from '../imagem/carregar';
import {
  ajustesIniciais,
  aplicarBrilhoContraste,
  arrastarRecorte,
  gerarImagemFinal,
  girarImagem,
  girarRecorte,
  proximaRotacao,
  RECORTE_INTEIRO,
  type ModoArraste,
} from '../imagem/ajustes';
import type { ContextoTela } from './etapas';
import { caixaDeErro, el } from './dom';

const TIPOS_ACEITOS = 'image/jpeg,image/png,image/webp';
const LADO_MAX_PREVIA = 1000;
const PASSO_TECLADO = 0.02;
/** Abaixo disto (em pixels) avisamos que o recorte tem pouco detalhe. */
const LADO_PEQUENO = 40;

let raiz: HTMLElement;
let contexto: ContextoTela;
let entradaArquivo: HTMLInputElement;

// Imagem já girada e prévia sem ajustes de luz, guardadas para não refazer
// o trabalho a cada movimento do controle de brilho.
let girada: HTMLCanvasElement | null = null;
let previaBase: ImageData | null = null;

// ---------- Entrada ----------

export function montarTela1(container: HTMLElement, ctx: ContextoTela): void {
  raiz = container;
  contexto = ctx;

  entradaArquivo = el('input', { type: 'file', accept: TIPOS_ACEITOS, hidden: true });
  entradaArquivo.addEventListener('change', () => {
    const arquivo = entradaArquivo.files?.[0];
    entradaArquivo.value = ''; // permite escolher o mesmo arquivo de novo
    if (arquivo) void abrirArquivo(arquivo);
  });

  if (estado.imagem) mostrarEditor(false);
  else mostrarEscolha();
}

export function podeContinuarTela1(): boolean {
  return estado.imagem !== null;
}

export function aoContinuarTela1(): string | null {
  if (!estado.imagem) return 'Escolha uma imagem para continuar.';
  try {
    estado.imagemFinal = gerarImagemFinal(estado.imagem, estado.ajustes);
    estado.grafico = null; // a imagem pode ter mudado: o gráfico será refeito
    estado.graficoEditado = false;
    return null;
  } catch {
    return 'Não foi possível preparar a imagem neste aparelho. Tente usar uma parte menor da imagem.';
  }
}

// ---------- Escolha do arquivo ----------

function mostrarEscolha(erro?: string): void {
  const icone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icone.setAttribute('viewBox', '0 0 48 48');
  icone.setAttribute('aria-hidden', 'true');
  icone.classList.add('zona-icone');
  icone.innerHTML =
    '<rect x="5" y="9" width="38" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<circle cx="16" cy="19" r="4" fill="currentColor"/>' +
    '<path d="M8 36l11-11 8 8 5-5 9 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>';

  const botao = el('button', { type: 'button', className: 'botao botao-principal botao-escolher' }, 'Escolher foto');
  botao.addEventListener('click', () => entradaArquivo.click());

  const zona = el(
    'div',
    { className: 'zona-envio' },
    icone,
    botao,
    el('p', { className: 'so-com-mouse' }, 'ou arraste a imagem para cá'),
    el('p', { className: 'dica' }, 'Fotos JPG, PNG ou WebP, de até 15 MB.'),
  );

  zona.addEventListener('dragover', (e) => {
    e.preventDefault();
    zona.classList.add('zona-ativa');
  });
  zona.addEventListener('dragleave', () => zona.classList.remove('zona-ativa'));
  zona.addEventListener('drop', (e) => {
    e.preventDefault();
    zona.classList.remove('zona-ativa');
    const arquivo = e.dataTransfer?.files[0];
    if (arquivo) void abrirArquivo(arquivo);
  });

  raiz.replaceChildren(
    zona,
    caixaDeErro(erro),
    el('p', { className: 'nota' }, 'Use fotos suas ou imagens que você tenha permissão para usar.'),
    entradaArquivo,
  );
  contexto.atualizarNavegacao();
  if (erro) botao.focus();
}

function mostrarCarregando(): void {
  const aviso = el('div', { className: 'carregando' }, el('span', { className: 'carregando-ponto' }), 'Abrindo sua imagem…');
  aviso.setAttribute('role', 'status');
  raiz.replaceChildren(aviso, entradaArquivo);
}

async function abrirArquivo(arquivo: File): Promise<void> {
  const tinhaImagem = estado.imagem !== null;
  mostrarCarregando();

  const resultado = await validarArquivo(arquivo);
  if (!resultado.ok) return falhou(resultado.mensagem, tinhaImagem);

  let imagem: HTMLCanvasElement;
  try {
    imagem = await carregarImagem(arquivo);
  } catch (e) {
    const mensagem =
      e instanceof ErroAoAbrir ? e.message : 'Algo deu errado ao abrir a imagem. Tente de novo.';
    return falhou(mensagem, tinhaImagem);
  }

  estado.imagem = imagem;
  estado.nomeArquivo = arquivo.name;
  estado.ajustes = ajustesIniciais();
  estado.imagemFinal = null;
  girada = null;
  mostrarEditor(true);
  contexto.anunciar('Imagem aberta. Agora você pode recortar, girar e ajustar a luz.');
}

function falhou(mensagem: string, tinhaImagem: boolean): void {
  // Se já havia uma imagem, a pessoa não perde o que tinha feito.
  if (tinhaImagem) {
    mostrarEditor(false);
    const caixa = raiz.querySelector<HTMLElement>('.aviso-erro');
    if (caixa) {
      caixa.hidden = false;
      caixa.textContent = mensagem;
    }
  } else {
    mostrarEscolha(mensagem);
  }
}

// ---------- Editor: recorte, giro e luz ----------

function mostrarEditor(focar: boolean): void {
  const titulo = el('h2', { className: 'subtitulo', tabIndex: -1 }, 'Sua imagem');

  // Área da prévia com o quadro de recorte por cima.
  const previa = el('canvas', { className: 'previa' });
  previa.setAttribute('role', 'img');
  previa.setAttribute('aria-label', 'Prévia da imagem escolhida');

  const quadro = el('div', { className: 'quadro-recorte', tabIndex: 0 });
  quadro.setAttribute('role', 'group');
  quadro.setAttribute('aria-label', 'Quadro de recorte');
  quadro.setAttribute('aria-describedby', 'ajuda-recorte');
  for (const canto of ['nw', 'ne', 'sw', 'se']) {
    const alca = el('span', { className: `alca alca-${canto}` });
    alca.dataset.canto = canto;
    quadro.append(alca);
  }
  const area = el('div', { className: 'area-recorte' }, previa, quadro);

  const info = el('p', { className: 'info-recorte' });
  info.setAttribute('aria-live', 'polite');

  // Botões de giro e recorte.
  const botaoEsquerda = el('button', { type: 'button', className: 'botao botao-secundario botao-ferramenta' }, '↺ Girar para a esquerda');
  const botaoDireita = el('button', { type: 'button', className: 'botao botao-secundario botao-ferramenta' }, '↻ Girar para a direita');
  const botaoInteira = el('button', { type: 'button', className: 'botao botao-secundario botao-ferramenta' }, 'Usar a imagem inteira');

  // Controles de luz.
  const brilho = criarControle('brilho', 'Brilho', estado.ajustes.brilho, ['mais escura', 'mais clara']);
  const contraste = criarControle('contraste', 'Contraste', estado.ajustes.contraste, ['menos contraste', 'mais contraste']);
  const botaoDesfazer = el('button', { type: 'button', className: 'botao botao-secundario botao-ferramenta' }, 'Voltar a luz ao normal');
  const luz = el(
    'fieldset',
    { className: 'grupo-luz' },
    el('legend', {}, 'Luz da imagem'),
    brilho.bloco,
    contraste.bloco,
    botaoDesfazer,
  );

  const botaoTrocar = el('button', { type: 'button', className: 'botao botao-secundario' }, 'Trocar imagem');
  botaoTrocar.addEventListener('click', () => entradaArquivo.click());

  raiz.replaceChildren(
    titulo,
    el('p', { className: 'instrucao' }, 'Arraste o quadro para escolher a parte que vai virar bordado. Puxe as bolinhas dos cantos para mudar o tamanho.'),
    area,
    el('p', { className: 'ajuda-teclado', id: 'ajuda-recorte' }, 'Pelo teclado: as setas movem o quadro; Shift com as setas muda o tamanho.'),
    info,
    el('div', { className: 'grupo-botoes' }, botaoEsquerda, botaoDireita, botaoInteira),
    luz,
    caixaDeErro(),
    el('div', { className: 'grupo-botoes' }, botaoTrocar),
    entradaArquivo,
  );

  // ----- desenho -----

  function prepararPrevia(): void {
    if (!estado.imagem) return;
    if (!girada) girada = girarImagem(estado.imagem, estado.ajustes.rotacao);
    const escala = Math.min(1, LADO_MAX_PREVIA / Math.max(girada.width, girada.height));
    previa.width = Math.max(1, Math.round(girada.width * escala));
    previa.height = Math.max(1, Math.round(girada.height * escala));
    const ctx = previa.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(girada, 0, 0, previa.width, previa.height);
    previaBase = ctx.getImageData(0, 0, previa.width, previa.height);
    desenharLuz();
  }

  let pedidoDesenho = 0;
  function desenharLuz(): void {
    cancelAnimationFrame(pedidoDesenho);
    pedidoDesenho = requestAnimationFrame(() => {
      const ctx = previa.getContext('2d');
      if (!ctx || !previaBase) return;
      const copia = new ImageData(new Uint8ClampedArray(previaBase.data), previaBase.width, previaBase.height);
      aplicarBrilhoContraste(copia.data, estado.ajustes.brilho, estado.ajustes.contraste);
      ctx.putImageData(copia, 0, 0);
    });
  }

  function posicionarQuadro(): void {
    const r = estado.ajustes.recorte;
    quadro.style.left = `${r.x * 100}%`;
    quadro.style.top = `${r.y * 100}%`;
    quadro.style.width = `${r.largura * 100}%`;
    quadro.style.height = `${r.altura * 100}%`;
  }

  function atualizarInfo(): void {
    if (!girada) return;
    const r = estado.ajustes.recorte;
    const largura = Math.round(r.largura * girada.width);
    const altura = Math.round(r.altura * girada.height);
    info.textContent = `Parte escolhida: ${largura} × ${altura} pixels.`;
    if (Math.min(largura, altura) < LADO_PEQUENO) {
      info.textContent += ' É uma parte bem pequena: o bordado vai ter pouco detalhe.';
    }
  }

  // ----- arrastar com o dedo ou o mouse -----

  let arraste: { modo: ModoArraste; x: number; y: number; inicial: typeof estado.ajustes.recorte } | null = null;

  quadro.addEventListener('pointerdown', (e) => {
    const canto = (e.target as HTMLElement).dataset.canto as ModoArraste | undefined;
    arraste = { modo: canto ?? 'mover', x: e.clientX, y: e.clientY, inicial: { ...estado.ajustes.recorte } };
    quadro.setPointerCapture(e.pointerId);
    quadro.classList.add('arrastando');
    e.preventDefault();
  });

  quadro.addEventListener('pointermove', (e) => {
    if (!arraste) return;
    const caixa = area.getBoundingClientRect();
    const dx = (e.clientX - arraste.x) / caixa.width;
    const dy = (e.clientY - arraste.y) / caixa.height;
    estado.ajustes.recorte = arrastarRecorte(arraste.inicial, arraste.modo, dx, dy);
    posicionarQuadro();
  });

  const terminarArraste = (): void => {
    if (!arraste) return;
    arraste = null;
    quadro.classList.remove('arrastando');
    atualizarInfo();
  };
  quadro.addEventListener('pointerup', terminarArraste);
  quadro.addEventListener('pointercancel', terminarArraste);

  // ----- teclado -----

  quadro.addEventListener('keydown', (e) => {
    const direcoes: Record<string, [number, number]> = {
      ArrowLeft: [-PASSO_TECLADO, 0],
      ArrowRight: [PASSO_TECLADO, 0],
      ArrowUp: [0, -PASSO_TECLADO],
      ArrowDown: [0, PASSO_TECLADO],
    };
    const d = direcoes[e.key];
    if (!d) return;
    e.preventDefault();
    estado.ajustes.recorte = arrastarRecorte(estado.ajustes.recorte, e.shiftKey ? 'se' : 'mover', d[0], d[1]);
    posicionarQuadro();
    atualizarInfo();
  });

  // ----- botões -----

  function girar(sentido: 'direita' | 'esquerda'): void {
    estado.ajustes.rotacao = proximaRotacao(estado.ajustes.rotacao, sentido);
    estado.ajustes.recorte = girarRecorte(estado.ajustes.recorte, sentido);
    girada = null;
    prepararPrevia();
    posicionarQuadro();
    atualizarInfo();
    contexto.anunciar(`Imagem girada para a ${sentido}.`);
  }
  botaoEsquerda.addEventListener('click', () => girar('esquerda'));
  botaoDireita.addEventListener('click', () => girar('direita'));

  botaoInteira.addEventListener('click', () => {
    estado.ajustes.recorte = { ...RECORTE_INTEIRO };
    posicionarQuadro();
    atualizarInfo();
  });

  brilho.entrada.addEventListener('input', () => {
    estado.ajustes.brilho = brilho.ler();
    desenharLuz();
  });
  contraste.entrada.addEventListener('input', () => {
    estado.ajustes.contraste = contraste.ler();
    desenharLuz();
  });
  botaoDesfazer.addEventListener('click', () => {
    estado.ajustes.brilho = 0;
    estado.ajustes.contraste = 0;
    brilho.definir(0);
    contraste.definir(0);
    desenharLuz();
    contexto.anunciar('Luz da imagem de volta ao normal.');
  });

  prepararPrevia();
  posicionarQuadro();
  atualizarInfo();
  contexto.atualizarNavegacao();
  if (focar) titulo.focus();
}

// ---------- Controle deslizante com valor por extenso ----------

function criarControle(id: string, rotulo: string, valor: number, extremos: [string, string]) {
  const entrada = el('input', { type: 'range', id, min: '-50', max: '50', step: '5' });
  const saida = el('output', { className: 'valor-controle' });
  saida.htmlFor.add(id);

  function descrever(v: number): string {
    if (v === 0) return 'normal';
    return `${v > 0 ? '+' : '−'}${Math.abs(v)} (${v > 0 ? extremos[1] : extremos[0]})`;
  }
  function definir(v: number): void {
    entrada.value = String(v);
    saida.textContent = descrever(v);
    entrada.setAttribute('aria-valuetext', descrever(v));
  }
  function ler(): number {
    const v = Number(entrada.value);
    saida.textContent = descrever(v);
    entrada.setAttribute('aria-valuetext', descrever(v));
    return v;
  }
  definir(valor);

  const bloco = el(
    'div',
    { className: 'controle' },
    el('label', { htmlFor: id }, rotulo),
    entrada,
    saida,
  );
  return { bloco, entrada, definir, ler };
}
