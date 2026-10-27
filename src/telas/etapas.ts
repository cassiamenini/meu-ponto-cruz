// As cinco etapas do aplicativo.
// As telas ainda em construção só mostram o que vai acontecer nelas.

import { estado } from '../estado';
import { aoContinuarTela1, montarTela1, podeContinuarTela1 } from './tela1-imagem';

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

/** Miniatura da imagem escolhida na etapa 1, para a pessoa se orientar. */
function mostrarImagemEscolhida(container: HTMLElement): void {
  if (!estado.imagemFinal) return;
  const origem = estado.imagemFinal;
  const escala = Math.min(1, 480 / Math.max(origem.width, origem.height));
  const pequena = document.createElement('canvas');
  pequena.width = Math.max(1, Math.round(origem.width * escala));
  pequena.height = Math.max(1, Math.round(origem.height * escala));
  pequena.getContext('2d')?.drawImage(origem, 0, 0, pequena.width, pequena.height);

  const img = document.createElement('img');
  img.className = 'miniatura';
  img.src = pequena.toDataURL('image/png');
  img.alt = 'A parte da imagem que você escolheu na etapa 1';
  const legenda = document.createElement('figcaption');
  legenda.textContent = `Imagem escolhida (${estado.imagemFinal.width} × ${estado.imagemFinal.height} pixels)`;
  const figura = document.createElement('figure');
  figura.className = 'figura-miniatura';
  figura.append(img, legenda);
  container.append(figura);
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
    orientacao: 'Escolha o tamanho do bordado e quantas cores de linha quer usar.',
    montar: mostrarImagemEscolhida,
    emBreve: [
      'Escolher o nível: iniciante, intermediário ou detalhado.',
      'Definir a largura em pontos.',
      'Escolher o tecido (Etamine 11, 14, 16 ou 18).',
      'Ver o tamanho final em centímetros.',
    ],
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
