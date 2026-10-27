// Tela 2 — Personalize seu bordado.
// Nível, tamanho, tecido e (em "Mais opções") cores e limpeza,
// com uma prévia que se atualiza sozinha.

import { estado, type Nivel, type Tecido } from '../estado';
import { ConversaoCancelada, converterEmSegundoPlano } from '../processamento/cliente';
import { LIMITES_GRADE, type Grafico, type Limpeza } from '../processamento/converter';
import { alturaProporcional, faixaLargura, formatarCm, MARGEM_CM, pontosParaCm } from '../processamento/medidas';
import { caixaDeErro, el, mostrarErro } from './dom';
import type { ContextoTela } from './etapas';

export const NIVEIS: Record<Nivel, { titulo: string; texto: string; maxCores: number; largura: number; limpeza: Limpeza }> = {
  iniciante: {
    titulo: 'Iniciante',
    texto: 'Até 10 cores e desenho mais simples. Ótimo para o primeiro bordado.',
    maxCores: 10,
    largura: 60,
    limpeza: 'forte',
  },
  intermediario: {
    titulo: 'Intermediário',
    texto: 'Até 20 cores, com mais detalhes.',
    maxCores: 20,
    largura: 100,
    limpeza: 'media',
  },
  detalhado: {
    titulo: 'Detalhado',
    texto: 'Até 40 cores e muitos detalhes. Para quem já tem prática.',
    maxCores: 40,
    largura: 150,
    limpeza: 'media',
  },
};

const TECIDOS: { valor: Tecido; texto: string }[] = [
  { valor: 11, texto: 'Etamine 11 — pontos maiores, ótimo para quem enxerga pouco' },
  { valor: 14, texto: 'Etamine 14 — o mais usado' },
  { valor: 16, texto: 'Etamine 16 — pontos menores' },
  { valor: 18, texto: 'Etamine 18 — pontos bem pequenos' },
];

const LIMPEZAS: { valor: Limpeza; texto: string }[] = [
  { valor: 'forte', texto: 'Forte — tira pontinhos soltos e cores com poucos pontos' },
  { valor: 'media', texto: 'Média — tira só pontos totalmente soltos' },
  { valor: 'nenhuma', texto: 'Nenhuma — mantém todos os detalhes' },
];

const ESPERA_MS = 300;

let calculando = false;

export function podeContinuarTela2(): boolean {
  return estado.imagemFinal !== null;
}

export function aoContinuarTela2(): string | null {
  if (calculando || !estado.grafico) return 'Aguarde um instante: a prévia do bordado ainda está sendo preparada.';
  return null;
}

// ---------- Controles reutilizáveis ----------

function grupoDeOpcoes<T extends string | number>(
  nome: string,
  legenda: string,
  opcoes: { valor: T; titulo?: string; texto: string }[],
  atual: T,
  aoMudar: (v: T) => void,
  classe: string,
): { bloco: HTMLFieldSetElement; marcar: (v: T) => void } {
  const entradas: HTMLInputElement[] = [];
  const bloco = el('fieldset', { className: `grupo-opcoes ${classe}` }, el('legend', {}, legenda));
  for (const o of opcoes) {
    const entrada = el('input', { type: 'radio', name: nome, value: String(o.valor), checked: o.valor === atual });
    entrada.addEventListener('change', () => entrada.checked && aoMudar(o.valor));
    entradas.push(entrada);
    const textos = o.titulo
      ? [el('span', { className: 'opcao-titulo' }, o.titulo), el('span', { className: 'opcao-texto' }, o.texto)]
      : [el('span', { className: 'opcao-texto' }, o.texto)];
    bloco.append(el('label', { className: 'cartao-opcao' }, entrada, el('span', { className: 'opcao-textos' }, ...textos)));
  }
  return {
    bloco,
    marcar: (v) => entradas.forEach((e) => (e.checked = e.value === String(v))),
  };
}

function campoNumerico(
  id: string,
  rotulo: string,
  unidade: string,
  passo: number,
  /** Ex.: "10 pontos" ou "1 cor": lido pelo leitor de tela nos botões − e +. */
  textoPasso: string,
  aoMudar: (v: number) => void,
): { bloco: HTMLDivElement; definir: (v: number, min: number, max: number) => void } {
  const entrada = el('input', { type: 'number', id, step: '1', inputMode: 'numeric', className: 'entrada-numero' });
  const menos = el('button', { type: 'button', className: 'botao-passo' }, '−');
  const mais = el('button', { type: 'button', className: 'botao-passo' }, '+');
  menos.setAttribute('aria-label', `Diminuir ${textoPasso}`);
  mais.setAttribute('aria-label', `Aumentar ${textoPasso}`);

  let min = 0;
  let max = 0;
  const limitar = (v: number) => Math.min(max, Math.max(min, Math.round(v)));
  const aplicar = (v: number) => {
    const final = limitar(v);
    entrada.value = String(final);
    aoMudar(final);
  };

  menos.addEventListener('click', () => aplicar(Number(entrada.value) - passo));
  mais.addEventListener('click', () => aplicar(Number(entrada.value) + passo));
  entrada.addEventListener('input', () => {
    const v = Number(entrada.value);
    if (entrada.value !== '' && Number.isFinite(v) && v >= min && v <= max) aoMudar(Math.round(v));
  });
  entrada.addEventListener('change', () => aplicar(Number(entrada.value) || min));

  const bloco = el(
    'div',
    { className: 'campo-numerico' },
    el('label', { htmlFor: id }, rotulo),
    el('div', { className: 'linha-numero' }, menos, entrada, mais, el('span', { className: 'unidade' }, unidade)),
  );
  return {
    bloco,
    definir: (v, novoMin, novoMax) => {
      min = novoMin;
      max = novoMax;
      entrada.min = String(min);
      entrada.max = String(max);
      entrada.value = String(limitar(v));
    },
  };
}

// ---------- Tela ----------

export function montarTela2(container: HTMLElement, ctx: ContextoTela): void {
  ctx.atualizarNavegacao();
  const imagem = estado.imagemFinal;
  if (!imagem) {
    container.replaceChildren(caixaDeErro('Volte à etapa 1 e escolha uma imagem.'));
    return;
  }

  const config = estado.config;
  const faixa = faixaLargura(imagem.width, imagem.height);
  config.largura = Math.min(faixa.max, Math.max(faixa.min, config.largura));
  const altura = () => alturaProporcional(config.largura, imagem.width, imagem.height);

  // ----- prévia -----
  const original = el('img', { className: 'miniatura-original', alt: 'Sua imagem, como foi escolhida na etapa 1' });
  original.src = miniatura(imagem);
  const previa = el('canvas', { className: 'previa-pontos' });
  previa.setAttribute('role', 'img');
  const statusPrevia = el('p', { className: 'status-previa' });
  statusPrevia.setAttribute('role', 'status');
  const erro = caixaDeErro();

  const colunaPrevia = el(
    'div',
    { className: 'coluna-previa' },
    el(
      'div',
      { className: 'par-imagens' },
      el('figure', {}, original, el('figcaption', {}, 'Sua imagem')),
      el('figure', {}, previa, el('figcaption', {}, 'Como vai ficar')),
    ),
    statusPrevia,
    erro,
  );

  // ----- opções -----
  const nivel = grupoDeOpcoes(
    'nivel',
    'Nível do bordado',
    (Object.keys(NIVEIS) as Nivel[]).map((n) => ({ valor: n, titulo: NIVEIS[n].titulo, texto: NIVEIS[n].texto })),
    config.nivel,
    (n) => {
      const padrao = NIVEIS[n];
      config.nivel = n;
      config.maxCores = padrao.maxCores;
      config.limpeza = padrao.limpeza;
      config.largura = Math.min(faixa.max, Math.max(faixa.min, padrao.largura));
      largura.definir(config.largura, faixa.min, faixa.max);
      cores.definir(config.maxCores, LIMITES_GRADE.coresMin, LIMITES_GRADE.coresMax);
      limpeza.marcar(config.limpeza);
      mudou();
    },
    'grupo-nivel',
  );

  const largura = campoNumerico('largura', 'Largura do bordado', 'pontos', 10, '10 pontos', (v) => {
    config.largura = v;
    mudou();
  });
  largura.definir(config.largura, faixa.min, faixa.max);
  const textoAltura = el('p', { className: 'texto-altura' });
  const limitesLargura = el('p', { className: 'dica' }, `De ${faixa.min} a ${faixa.max} pontos.`);

  const tecido = grupoDeOpcoes(
    'tecido',
    'Tecido',
    TECIDOS.map((t) => ({ valor: t.valor, texto: t.texto })),
    config.tecido,
    (t) => {
      config.tecido = t;
      atualizarMedidas(); // o tecido não muda o gráfico, só o tamanho em cm
    },
    'grupo-compacto',
  );

  const medidas = el('div', { className: 'quadro-medidas' });
  medidas.setAttribute('aria-live', 'polite');

  const cores = campoNumerico('max-cores', 'Número máximo de cores', 'cores', 1, '1 cor', (v) => {
    config.maxCores = v;
    mudou();
  });
  cores.definir(config.maxCores, LIMITES_GRADE.coresMin, LIMITES_GRADE.coresMax);

  const limpeza = grupoDeOpcoes(
    'limpeza',
    'Limpeza de pontos soltos',
    LIMPEZAS,
    config.limpeza,
    (l) => {
      config.limpeza = l;
      mudou();
    },
    'grupo-compacto',
  );

  const maisOpcoes = el(
    'details',
    { className: 'mais-opcoes' },
    el('summary', {}, 'Mais opções'),
    cores.bloco,
    el('p', { className: 'dica' }, 'O aplicativo pode usar menos cores do que o máximo, se a imagem não precisar.'),
    limpeza.bloco,
  );

  const colunaOpcoes = el(
    'div',
    { className: 'coluna-opcoes' },
    nivel.bloco,
    el('fieldset', { className: 'grupo-opcoes' }, el('legend', {}, 'Tamanho'), largura.bloco, limitesLargura, textoAltura),
    tecido.bloco,
    medidas,
    maisOpcoes,
  );

  container.replaceChildren(el('div', { className: 'layout-bordado' }, colunaPrevia, colunaOpcoes));

  // ----- comportamento -----

  function atualizarMedidas(): void {
    const h = altura();
    textoAltura.textContent = `Altura: ${h} pontos (acompanha o formato da imagem).`;
    const lCm = pontosParaCm(config.largura, config.tecido);
    const aCm = pontosParaCm(h, config.tecido);
    medidas.replaceChildren(
      el('p', {}, el('strong', {}, 'Tamanho do bordado: '), `${formatarCm(lCm)} × ${formatarCm(aCm)} cm`),
      el(
        'p',
        {},
        el('strong', {}, 'Tecido para cortar: '),
        `pelo menos ${Math.ceil(lCm + 2 * MARGEM_CM)} × ${Math.ceil(aCm + 2 * MARGEM_CM)} cm`,
        el('span', { className: 'dica' }, ` (${MARGEM_CM} cm de sobra em cada lado)`),
      ),
    );
  }

  let espera = 0;
  function mudou(): void {
    atualizarMedidas();
    estado.grafico = null;
    statusPrevia.textContent = 'Preparando a prévia…';
    statusPrevia.classList.add('ocupado');
    clearTimeout(espera);
    espera = window.setTimeout(calcular, ESPERA_MS);
  }

  async function calcular(): Promise<void> {
    if (!estado.imagemFinal) return;
    calculando = true;
    mostrarErro(erro, null);
    const pedido = { ...config, altura: altura() };
    try {
      const g = await converterEmSegundoPlano(estado.imagemFinal, {
        largura: pedido.largura,
        altura: pedido.altura,
        maxCores: pedido.maxCores,
        limpeza: pedido.limpeza,
      });
      calculando = false;
      estado.grafico = g;
      desenharPrevia(previa, g);
      const resumo = `${g.largura} × ${g.altura} pontos, ${g.paleta.length} ${g.paleta.length === 1 ? 'cor' : 'cores'} DMC`;
      statusPrevia.textContent = `Prévia pronta: ${resumo}.`;
      statusPrevia.classList.remove('ocupado');
      previa.setAttribute('aria-label', `Prévia do bordado: ${resumo}.`);
    } catch (e) {
      if (e instanceof ConversaoCancelada) return; // uma escolha mais nova já está sendo calculada
      calculando = false;
      statusPrevia.textContent = '';
      statusPrevia.classList.remove('ocupado');
      mostrarErro(erro, 'Não foi possível preparar a prévia neste aparelho. Tente um tamanho menor ou menos cores.');
    }
  }

  atualizarMedidas();
  if (estado.grafico) {
    desenharPrevia(previa, estado.grafico);
    statusPrevia.textContent = `Prévia pronta: ${estado.grafico.largura} × ${estado.grafico.altura} pontos, ${estado.grafico.paleta.length} cores DMC.`;
  } else {
    mudou();
  }
}

// ---------- Desenho ----------

function miniatura(origem: HTMLCanvasElement): string {
  const escala = Math.min(1, 400 / Math.max(origem.width, origem.height));
  const c = el('canvas', {
    width: Math.max(1, Math.round(origem.width * escala)),
    height: Math.max(1, Math.round(origem.height * escala)),
  });
  c.getContext('2d')?.drawImage(origem, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

/** Desenha cada ponto como um quadradinho da cor da linha. */
export function desenharPrevia(canvas: HTMLCanvasElement, g: Grafico): void {
  canvas.width = g.largura;
  canvas.height = g.altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dados = ctx.createImageData(g.largura, g.altura);
  for (let i = 0; i < g.celulas.length; i++) {
    const [r, gr, b] = g.paleta[g.celulas[i]].rgb;
    dados.data.set([r, gr, b, 255], i * 4);
  }
  ctx.putImageData(dados, 0, 0);
}
