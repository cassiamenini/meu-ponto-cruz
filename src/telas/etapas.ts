// As cinco etapas do aplicativo.

import { aoContinuarTela1, montarTela1, podeContinuarTela1 } from './tela1-imagem';
import { aoContinuarTela2, montarTela2, podeContinuarTela2 } from './tela2-bordado';
import { montarTela3, podeContinuarTela3 } from './tela3-grafico';
import { aoContinuarTela4, montarTela4, podeContinuarTela4 } from './tela4-apostila';
import { aoContinuarTela5, montarTela5 } from './tela5-pdf';

/** O que cada tela pode pedir ao aplicativo. */
export interface ContextoTela {
  /** Lê uma frase em voz alta para quem usa leitor de tela. */
  anunciar(texto: string): void;
  /** Mostra ou esconde o botão "Continuar" conforme a tela permite. */
  atualizarNavegacao(): void;
}

export interface Etapa {
  titulo: string;
  /** Nome curto, usado no indicador de etapas no topo. */
  curto: string;
  /** Frase de orientação logo abaixo do título. */
  orientacao: string;
  /** Monta o conteúdo da tela. */
  montar(container: HTMLElement, contexto: ContextoTela): void;
  /** Se falso, o botão "Continuar" fica escondido. */
  podeContinuar?(): boolean;
  /**
   * Chamado ao clicar em "Continuar". Devolve uma mensagem se algo impedir,
   * ou false para ficar na tela sem mensagem (por exemplo, se a pessoa cancelou).
   */
  aoContinuar?(): string | null | false;
}

export const ETAPAS: Etapa[] = [
  {
    titulo: 'Escolha sua imagem',
    curto: 'Imagem',
    orientacao: 'Comece escolhendo uma foto ou desenho que você gostaria de bordar.',
    montar: montarTela1,
    podeContinuar: podeContinuarTela1,
    aoContinuar: aoContinuarTela1,
  },
  {
    titulo: 'Personalize seu bordado',
    curto: 'Bordado',
    orientacao: 'Escolha o nível, o tamanho e o tecido. A prévia mostra como o bordado vai ficar.',
    montar: montarTela2,
    podeContinuar: podeContinuarTela2,
    aoContinuar: aoContinuarTela2,
  },
  {
    titulo: 'Confira seu gráfico',
    curto: 'Gráfico',
    orientacao: 'Confira o gráfico com os símbolos e a lista de linhas que você vai usar.',
    montar: montarTela3,
    podeContinuar: podeContinuarTela3,
  },
  {
    titulo: 'Prepare sua apostila',
    curto: 'Apostila',
    orientacao: 'Dê um nome ao seu projeto e escolha como quer o gráfico no papel.',
    montar: montarTela4,
    podeContinuar: podeContinuarTela4,
    aoContinuar: aoContinuarTela4,
  },
  {
    titulo: 'Baixe seu PDF',
    curto: 'PDF',
    orientacao: 'Sua apostila tem duas partes: o guia para quem está começando e o seu gráfico.',
    montar: montarTela5,
    aoContinuar: aoContinuarTela5,
  },
];
