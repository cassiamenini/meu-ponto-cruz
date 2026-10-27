// Baixa as fotos oficiais das meadas DMC (só para conferência local das cores).
// As imagens pertencem à DMC: ficam fora do Git (ver .gitignore).
// Uso:  node scripts/baixar-amostras-dmc.mjs

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const oficial = JSON.parse(readFileSync(join(raiz, 'dados/fontes/dmc-oficial-product_data.json'), 'utf8'));
const destino = join(raiz, 'dados/amostras-dmc');
mkdirSync(destino, { recursive: true });

const ORIGEM_PERMITIDA = 'https://quilt-public-production.s3.eu-west-1.amazonaws.com/public_images/';
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

let baixadas = 0;
const falhas = [];
for (const v of oficial.variants) {
  const codigo = v.colour.code;
  const url = v.colour.swatch;
  const arquivo = join(destino, `${codigo}.jpg`);
  if (existsSync(arquivo)) continue;
  if (!url) {
    falhas.push(`${codigo} (sem foto no site)`);
    continue;
  }
  if (!/^[A-Z0-9]+$/i.test(codigo) || !url.startsWith(ORIGEM_PERMITIDA)) {
    falhas.push(`${codigo} (endereço inesperado)`);
    continue;
  }
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(String(resposta.status));
    writeFileSync(arquivo, Buffer.from(await resposta.arrayBuffer()));
    baixadas++;
    await espera(100); // sem pressa, para não sobrecarregar o servidor
  } catch (e) {
    falhas.push(`${codigo} (${e.message})`);
  }
}

console.log(`Baixadas agora: ${baixadas}`);
if (falhas.length) console.log(`Falharam: ${falhas.join(', ')}`);
