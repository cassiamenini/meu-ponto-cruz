// Conversa com o trabalhador em segundo plano.
//
// Se a pessoa mudar uma opção enquanto um cálculo ainda está rodando,
// o cálculo antigo é descartado na hora (o trabalhador é reiniciado),
// para a prévia sempre mostrar a escolha mais recente.

import { buscarLinha, type Linha } from '../catalogo/dmc';
import { converter, type Grafico, type OpcoesConversao } from './converter';
import type { MensagemParaWorker, RespostaDoWorker } from './worker';

export class ConversaoCancelada extends Error {}

let worker: Worker | null = null;
let imagemEnviada: HTMLCanvasElement | null = null;
let pendente: { id: number; resolver: (g: Grafico) => void; rejeitar: (e: Error) => void } | null = null;
let proximoId = 1;
let semWorker = typeof Worker === 'undefined';

function pixelsDe(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

function montarGrafico(r: Extract<RespostaDoWorker, { ok: true }>): Grafico {
  const paleta = r.codigos.map((c) => {
    const linha = buscarLinha(c);
    if (!linha) throw new Error(`Linha ${c} não encontrada.`);
    return linha;
  }) as Linha[];
  return { largura: r.largura, altura: r.altura, celulas: r.celulas, paleta, contagem: r.contagem };
}

function criarWorker(): Worker {
  const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent<RespostaDoWorker>) => {
    const r = e.data;
    if (!pendente || r.id !== pendente.id) return;
    const { resolver, rejeitar } = pendente;
    pendente = null;
    if (r.ok) resolver(montarGrafico(r));
    else rejeitar(new Error(r.mensagem));
  };
  w.onerror = () => {
    // Se o trabalhador não funcionar neste navegador, calculamos aqui mesmo.
    semWorker = true;
    w.terminate();
    worker = null;
    if (pendente) {
      const p = pendente;
      pendente = null;
      p.rejeitar(new Error('trabalhador indisponível'));
    }
  };
  return w;
}

export function converterEmSegundoPlano(imagem: HTMLCanvasElement, opcoes: OpcoesConversao): Promise<Grafico> {
  // Cancela o pedido anterior, se ainda estiver rodando.
  if (pendente) {
    pendente.rejeitar(new ConversaoCancelada());
    pendente = null;
    worker?.terminate();
    worker = null;
    imagemEnviada = null;
  }

  if (semWorker) {
    return new Promise((ok, erro) => {
      setTimeout(() => {
        try {
          ok(converter(pixelsDe(imagem), imagem.width, imagem.height, opcoes));
        } catch (e) {
          erro(e as Error);
        }
      }, 0);
    });
  }

  if (!worker) worker = criarWorker();
  if (imagemEnviada !== imagem) {
    const pixels = pixelsDe(imagem);
    const msg: MensagemParaWorker = { tipo: 'imagem', pixels, largura: imagem.width, altura: imagem.height };
    worker.postMessage(msg, [pixels.buffer]);
    imagemEnviada = imagem;
  }

  const id = proximoId++;
  return new Promise<Grafico>((resolver, rejeitar) => {
    pendente = { id, resolver, rejeitar };
    const msg: MensagemParaWorker = { tipo: 'converter', id, opcoes };
    worker!.postMessage(msg);
  }).catch((e: Error) => {
    if (e.message === 'trabalhador indisponível') return converterEmSegundoPlano(imagem, opcoes);
    throw e;
  });
}
