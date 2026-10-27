// Trabalhador em segundo plano: faz a conversão sem travar a tela.
// Recebe a imagem uma vez e depois quantos pedidos de conversão forem precisos.

import { converter, type OpcoesConversao } from './converter';

export type MensagemParaWorker =
  | { tipo: 'imagem'; pixels: Uint8ClampedArray; largura: number; altura: number }
  | { tipo: 'converter'; id: number; opcoes: OpcoesConversao };

export type RespostaDoWorker =
  | { id: number; ok: true; largura: number; altura: number; celulas: Uint16Array; codigos: string[]; contagem: number[] }
  | { id: number; ok: false; mensagem: string };

let imagem: { pixels: Uint8ClampedArray; largura: number; altura: number } | null = null;

self.onmessage = (e: MessageEvent<MensagemParaWorker>) => {
  const m = e.data;
  if (m.tipo === 'imagem') {
    imagem = { pixels: m.pixels, largura: m.largura, altura: m.altura };
    return;
  }
  let resposta: RespostaDoWorker;
  try {
    if (!imagem) throw new Error('Imagem não recebida.');
    const g = converter(imagem.pixels, imagem.largura, imagem.altura, m.opcoes);
    resposta = {
      id: m.id,
      ok: true,
      largura: g.largura,
      altura: g.altura,
      celulas: g.celulas,
      codigos: g.paleta.map((l) => l.codigo),
      contagem: g.contagem,
    };
    (self as unknown as Worker).postMessage(resposta, [g.celulas.buffer]);
  } catch (erro) {
    resposta = { id: m.id, ok: false, mensagem: erro instanceof Error ? erro.message : String(erro) };
    (self as unknown as Worker).postMessage(resposta);
  }
};
