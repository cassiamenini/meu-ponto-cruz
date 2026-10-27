import * as pdfjs from 'pdfjs-dist';
import enderecoWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = enderecoWorker;

const params = new URLSearchParams(location.search);
const arquivo = (params.get('arquivo') ?? 'exemplo-pequeno.pdf').replace(/[^\w.-]/g, '');
const [ini, fim] = (params.get('paginas') ?? '1-3').split('-').map(Number);
const escala = Number(params.get('escala') ?? '1');

const dados = new Uint8Array(await (await fetch(`/dados/testes/${arquivo}?t=${Date.now()}`)).arrayBuffer());
const pdf = await pdfjs.getDocument({ data: dados }).promise;
document.getElementById('info')!.textContent = `${arquivo}: ${pdf.numPages} páginas`;
for (let n = ini; n <= Math.min(fim || ini, pdf.numPages); n++) {
  const pagina = await pdf.getPage(n);
  const vista = pagina.getViewport({ scale: escala });
  const canvas = document.createElement('canvas');
  canvas.width = vista.width;
  canvas.height = vista.height;
  document.body.append(canvas);
  await pagina.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport: vista }).promise;
}
document.body.dataset.pronto = 'sim';
