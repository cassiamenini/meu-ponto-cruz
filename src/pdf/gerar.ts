// Monta o PDF completo: Parte 1 (apostila) + Parte 2 (gráfico).
// Este módulo só é carregado quando a pessoa chega à etapa do PDF,
// para o site abrir rápido.

import { jsPDF } from 'jspdf';
import type { Grafico } from '../processamento/converter';
import { escreverApostila } from './apostila';
import { Documento, FONTE } from './documento';
import { escreverParte2, type ImagensPdf, type OpcoesPdf } from './grafico-pdf';

export interface Fontes {
  regular: ArrayBuffer;
  negrito: ArrayBuffer;
}

function paraBase64(dados: ArrayBuffer): string {
  const bytes = new Uint8Array(dados);
  let texto = '';
  for (let i = 0; i < bytes.length; i += 0x8000) texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(texto);
}

export async function gerarPdf(
  grafico: Grafico,
  opcoes: OpcoesPdf,
  imagens: ImagensPdf,
  fontes: Fontes,
  aoProgredir?: (fracao: number) => void,
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  doc.addFileToVFS('AtkinsonHyperlegible-Regular.ttf', paraBase64(fontes.regular));
  doc.addFileToVFS('AtkinsonHyperlegible-Bold.ttf', paraBase64(fontes.negrito));
  doc.addFont('AtkinsonHyperlegible-Regular.ttf', FONTE, 'normal');
  doc.addFont('AtkinsonHyperlegible-Bold.ttf', FONTE, 'bold');
  doc.setFont(FONTE, 'normal');
  doc.setLanguage('pt-BR');
  doc.setDocumentProperties({
    title: `${opcoes.nomeProjeto} — apostila de ponto cruz`,
    subject: 'Guia para iniciantes e gráfico de ponto cruz com linhas DMC',
    author: 'Meu Ponto Cruz',
    keywords: 'ponto cruz, bordado, gráfico, DMC',
    creator: 'Meu Ponto Cruz (cassiamenini.github.io/meu-ponto-cruz)',
  });

  const documento = new Documento(doc, opcoes.nomeProjeto);
  escreverApostila(documento, imagens.previa);
  aoProgredir?.(0.05);
  await escreverParte2(documento, grafico, opcoes, imagens, (f) => aoProgredir?.(0.05 + f * 0.9));
  documento.escreverRodapes();
  const blob = doc.output('blob');
  aoProgredir?.(1);
  return blob;
}

/** Nome do arquivo: "meu-ponto-cruz-casinha-de-campo.pdf". */
export function nomeDoArquivo(nomeProjeto: string): string {
  const limpo = nomeProjeto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `meu-ponto-cruz${limpo ? `-${limpo}` : ''}.pdf`;
}
