import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './estilos/tema.css';
import { ETAPAS, type ContextoTela } from './telas/etapas';

// Busca um elemento da página pelo id; se não existir, avisa claramente.
function pegar<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado na página.`);
  return el as T;
}

const listaEtapas = pegar<HTMLOListElement>('lista-etapas');
const painel = pegar<HTMLElement>('painel');
const botaoVoltar = pegar<HTMLButtonElement>('botao-voltar');
const botaoContinuar = pegar<HTMLButtonElement>('botao-continuar');
const avisoLeitor = pegar<HTMLParagraphElement>('aviso-leitor');
const erroNavegacao = pegar<HTMLParagraphElement>('erro-navegacao');

let etapaAtual = 0;

function anunciar(texto: string): void {
  // Limpa antes, para o leitor de tela repetir mesmo frases iguais.
  avisoLeitor.textContent = '';
  requestAnimationFrame(() => {
    avisoLeitor.textContent = texto;
  });
}

const contexto: ContextoTela = {
  anunciar,
  atualizarNavegacao: () => atualizarBotoes(),
};

// Evita que o navegador abra a imagem no lugar do site
// quando ela é solta fora da área certa.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

// ---------- Indicador de etapas (topo) ----------

function desenharIndicador(): void {
  listaEtapas.replaceChildren(
    ...ETAPAS.map((etapa, i) => {
      const item = document.createElement('li');
      item.className = 'etapa';
      if (i < etapaAtual) item.classList.add('etapa-feita');
      if (i === etapaAtual) {
        item.classList.add('etapa-atual');
        item.setAttribute('aria-current', 'step');
      }

      const numero = document.createElement('span');
      numero.className = 'etapa-numero';
      numero.setAttribute('aria-hidden', 'true');
      numero.textContent = i < etapaAtual ? '✓' : String(i + 1);

      const nome = document.createElement('span');
      nome.className = 'etapa-nome';
      nome.textContent = etapa.curto;

      // Texto completo para leitores de tela.
      const situacao = i < etapaAtual ? ', concluída' : i === etapaAtual ? ', etapa atual' : '';
      const leitor = document.createElement('span');
      leitor.className = 'so-leitor';
      leitor.textContent = `Passo ${i + 1}: ${etapa.titulo}${situacao}`;

      item.append(numero, nome, leitor);
      return item;
    }),
  );
}

// ---------- Conteúdo da etapa ----------

function desenharPainel(): void {
  const etapa = ETAPAS[etapaAtual];

  const passo = document.createElement('p');
  passo.className = 'passo';
  passo.textContent = `Passo ${etapaAtual + 1} de ${ETAPAS.length}`;

  const titulo = document.createElement('h1');
  titulo.id = 'titulo-etapa';
  titulo.tabIndex = -1; // permite levar o foco até o título ao trocar de etapa
  titulo.textContent = etapa.titulo;

  const orientacao = document.createElement('p');
  orientacao.className = 'orientacao';
  orientacao.textContent = etapa.orientacao;

  painel.replaceChildren(passo, titulo, orientacao);

  if (etapa.montar) {
    const area = document.createElement('div');
    area.className = 'area-tela';
    painel.append(area);
    etapa.montar(area, contexto);
  }

  if (etapa.emBreve) {
    const cartao = document.createElement('div');
    cartao.className = 'cartao-em-breve';

    const tituloCartao = document.createElement('h2');
    tituloCartao.textContent = 'Em construção: nesta tela você vai poder';

    const lista = document.createElement('ul');
    lista.append(
      ...etapa.emBreve.map((texto) => {
        const li = document.createElement('li');
        li.textContent = texto;
        return li;
      }),
    );

    cartao.append(tituloCartao, lista);
    painel.append(cartao);
  }
}

function atualizarBotoes(): void {
  const etapa = ETAPAS[etapaAtual];
  botaoVoltar.hidden = etapaAtual === 0;
  botaoContinuar.hidden = etapa.podeContinuar ? !etapa.podeContinuar() : false;
  const ultima = etapaAtual === ETAPAS.length - 1;
  botaoContinuar.textContent = ultima ? 'Fazer outro bordado' : 'Continuar →';
}

function mostrarErroNavegacao(mensagem: string): void {
  erroNavegacao.textContent = mensagem;
  erroNavegacao.hidden = false;
}

function irPara(indice: number, moverFoco = true): void {
  etapaAtual = Math.max(0, Math.min(ETAPAS.length - 1, indice));
  erroNavegacao.hidden = true;
  erroNavegacao.textContent = '';
  desenharIndicador();
  desenharPainel();
  atualizarBotoes();

  if (moverFoco) {
    // Leva a pessoa (e o leitor de tela) para o começo da nova etapa.
    pegar<HTMLHeadingElement>('titulo-etapa').focus();
    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: semMovimento ? 'auto' : 'smooth' });
    anunciar(`Passo ${etapaAtual + 1} de ${ETAPAS.length}: ${ETAPAS[etapaAtual].titulo}`);
  }
}

botaoVoltar.addEventListener('click', () => irPara(etapaAtual - 1));
botaoContinuar.addEventListener('click', () => {
  const problema = ETAPAS[etapaAtual].aoContinuar?.() ?? null;
  if (problema) {
    mostrarErroNavegacao(problema);
    return;
  }
  const ultima = etapaAtual === ETAPAS.length - 1;
  irPara(ultima ? 0 : etapaAtual + 1);
});

// ---------- Tamanho da letra ----------
// A escolha fica guardada só neste aparelho. Se o navegador não permitir
// guardar, o aplicativo continua funcionando normalmente.

const TAMANHOS = [100, 112.5, 125, 140];
const CHAVE_LETRA = 'meu-ponto-cruz:tamanho-letra';

function lerTamanhoSalvo(): number {
  try {
    const salvo = Number(localStorage.getItem(CHAVE_LETRA));
    return TAMANHOS.includes(salvo) ? salvo : 100;
  } catch {
    return 100;
  }
}

let tamanhoLetra = lerTamanhoSalvo();
const botaoMenor = pegar<HTMLButtonElement>('letra-menor');
const botaoMaior = pegar<HTMLButtonElement>('letra-maior');

function aplicarTamanho(): void {
  document.documentElement.style.fontSize = `${tamanhoLetra}%`;
  const i = TAMANHOS.indexOf(tamanhoLetra);
  botaoMenor.disabled = i === 0;
  botaoMaior.disabled = i === TAMANHOS.length - 1;
  try {
    localStorage.setItem(CHAVE_LETRA, String(tamanhoLetra));
  } catch {
    // sem problema: só não lembra na próxima visita
  }
}

function mudarTamanho(passo: number): void {
  const i = TAMANHOS.indexOf(tamanhoLetra) + passo;
  if (i < 0 || i >= TAMANHOS.length) return;
  tamanhoLetra = TAMANHOS[i];
  aplicarTamanho();
  anunciar(passo > 0 ? 'Letra aumentada' : 'Letra diminuída');
}

botaoMenor.addEventListener('click', () => mudarTamanho(-1));
botaoMaior.addEventListener('click', () => mudarTamanho(1));

// ---------- Início ----------

aplicarTamanho();
irPara(0, false);
