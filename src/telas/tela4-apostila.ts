// Tela 4 — Prepare sua apostila.
// Nome do projeto, versões do gráfico e tamanho dos quadradinhos.

import { estado, nomeSugerido } from '../estado';
import { contarPaginas, MM_POR_PONTO, type TamanhoQuadradinho, type Versoes } from '../pdf/paginacao';
import { formatarCm } from '../processamento/medidas';
import { caixaDeErro, el, grupoDeOpcoes } from './dom';
import type { ContextoTela } from './etapas';

const TAMANHO_MAX_NOME = 60;

export function podeContinuarTela4(): boolean {
  return estado.grafico !== null;
}

export function aoContinuarTela4(): string | null {
  estado.apostila.nome = estado.apostila.nome.trim() || 'Meu bordado';
  return null;
}

export function montarTela4(container: HTMLElement, ctx: ContextoTela): void {
  ctx.atualizarNavegacao();
  const g = estado.grafico;
  if (!g) {
    container.replaceChildren(caixaDeErro('Volte à etapa 2 para preparar o gráfico.'));
    return;
  }
  const op = estado.apostila;
  if (!op.nome) op.nome = nomeSugerido(estado.nomeArquivo);

  const nome = el('input', { type: 'text', id: 'nome-projeto', value: op.nome, maxLength: TAMANHO_MAX_NOME, className: 'entrada-texto', autocomplete: 'off' });
  nome.setAttribute('aria-describedby', 'dica-nome');
  nome.addEventListener('input', () => (op.nome = nome.value));
  const campoNome = el(
    'div',
    { className: 'campo-texto' },
    el('label', { htmlFor: 'nome-projeto' }, 'Nome do projeto'),
    nome,
    el('p', { className: 'dica', id: 'dica-nome' }, 'Aparece na capa e no rodapé de todas as páginas.'),
  );

  const versoes = grupoDeOpcoes<Versoes>(
    'versoes',
    'Gráfico',
    [
      { valor: 'ambos', titulo: 'Colorido e preto e branco', texto: 'O mais completo. Imprima o que preferir.' },
      { valor: 'colorido', titulo: 'Só colorido', texto: 'Cores com símbolos por cima.' },
      { valor: 'pb', titulo: 'Só preto e branco', texto: 'Economiza tinta. Os símbolos bastam para bordar.' },
    ],
    op.versoes,
    (v) => {
      op.versoes = v;
      atualizarResumo();
    },
  );

  const tamanhos = grupoDeOpcoes<TamanhoQuadradinho>(
    'tamanho-quadradinho',
    'Tamanho dos quadradinhos no papel',
    [
      { valor: 'normal', titulo: `Normal (${formatarCm(MM_POR_PONTO.normal)} mm)`, texto: 'Mais pontos em cada folha, menos páginas.' },
      { valor: 'ampliado', titulo: `Ampliado (${formatarCm(MM_POR_PONTO.ampliado)} mm)`, texto: 'Mais fácil de enxergar. Usa mais folhas.' },
    ],
    op.tamanho,
    (t) => {
      op.tamanho = t;
      atualizarResumo();
    },
  );

  const resumo = el('div', { className: 'quadro-medidas' });
  resumo.setAttribute('aria-live', 'polite');

  function atualizarResumo(): void {
    const p = contarPaginas(g!, op);
    const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
    resumo.replaceChildren(
      el('p', {}, el('strong', {}, `Seu PDF terá ${p.total} páginas:`)),
      el(
        'ul',
        { className: 'lista-paginas' },
        el('li', {}, `${p.apostila} do guia para quem está começando`),
        el('li', {}, `${p.resumo + p.mapa + p.legenda} de resumo${p.mapa ? ', mapa do gráfico inteiro' : ''} e legenda (com DMC, Anchor e Maxi)`),
        el('li', {}, `${plural(p.acompanhamento, 'folha de acompanhamento', 'de folha de acompanhamento')} (comprei / terminei)`),
        el('li', {}, `${plural(p.grafico, 'página de gráfico', 'páginas de gráfico')}`),
        el('li', {}, `${plural(p.instrucoes, 'de instruções de impressão', 'de instruções de impressão')}`),
      ),
    );
  }

  container.replaceChildren(campoNome, versoes.bloco, tamanhos.bloco, resumo);
  atualizarResumo();
}
