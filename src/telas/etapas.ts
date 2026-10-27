// As cinco etapas do aplicativo.
// As telas ainda em construção só mostram o que vai acontecer nelas.

import { aoContinuarTela1, montarTela1, podeContinuarTela1 } from './tela1-imagem';
import { aoContinuarTela2, montarTela2, podeContinuarTela2 } from './tela2-bordado';

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
  montar?(container: HTMLElement, contexto: ContextoTela): void;
  /** Se falso, o botão "Continuar" fica escondido. */
  podeContinuar?(): boolean;
  /** Chamado ao clicar em "Continuar"; devolve uma mensagem se algo impedir. */
  aoContinuar?(): string | null;
  /** O que esta tela ainda vai permitir fazer (aparece como lista). */
  emBreve?: string[];
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
    orientacao: 'Veja como o bordado vai ficar, com as cores e os símbolos.',
    emBreve: [
      'Ver o gráfico com cores e símbolos.',
      'Ampliar para enxergar os detalhes.',
      'Trocar uma cor de linha por outra.',
      'Ver a lista de cores DMC usadas.',
    ],
  },
  {
    titulo: 'Prepare sua apostila',
    curto: 'Apostila',
    orientacao: 'Dê um nome ao seu projeto e escolha como quer imprimir.',
    emBreve: [
      'Dar um nome ao projeto.',
      'Escolher gráfico colorido, em preto e branco ou os dois.',
      'Escolher quadradinhos normais ou ampliados.',
      'Saber quantas páginas o PDF vai ter.',
    ],
  },
  {
    titulo: 'Baixe seu PDF',
    curto: 'PDF',
    orientacao: 'Pronto! Agora é só baixar a apostila e começar a bordar.',
    emBreve: [
      'Baixar o PDF no celular ou no computador.',
      'Compartilhar o PDF, quando o aparelho permitir.',
      'Ver dicas para imprimir.',
    ],
  },
];
