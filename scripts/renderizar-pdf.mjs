// Salva páginas de um PDF como PNG, para conferência visual.
// Uso: node scripts/renderizar-pdf.mjs arquivo.pdf pasta-de-saida 1 8 9
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const [arquivo, saida, ...paginas] = process.argv.slice(2);
mkdirSync(saida, { recursive: true });
const pdf = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(arquivo)) }).promise;
const lista = paginas.length ? paginas.map(Number) : Array.from({ length: pdf.numPages }, (_, i) => i + 1);
for (const n of lista) {
  const pagina = await pdf.getPage(n);
  const vista = pagina.getViewport({ scale: 1.4 });
  const canvas = createCanvas(vista.width, vista.height);
  await pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vista }).promise;
  writeFileSync(`${saida}/p${String(n).padStart(2, '0')}.png`, canvas.toBuffer('image/png'));
}
console.log(`${pdf.numPages} páginas; salvas: ${lista.join(', ')}`);
