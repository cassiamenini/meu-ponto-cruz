// Monta o catálogo DMC usado pelo aplicativo (src/catalogo/dmc.json)
// e um relatório de conferência (dados/relatorio-catalogo.md).
//
// Uso:  node scripts/montar-catalogo.ts
//
// Fontes (todas guardadas em dados/fontes/):
//  - dmc-oficial-product_data.json     site oficial DMC (EUA): códigos e nomes
//  - dmc-oficial-pt-product_data.json  site oficial DMC (Portugal): nomes em português
//  - makebead-dmc-floss.json           cores RGB (CC BY 4.0, makebead/craft-color-codes)
//  - sharlagelfand-floss_adrianj.csv   cores RGB de comparação (MIT, sharlagelfand/dmc)
// E, se existir, dados/amostras-dmc-medias.json: cor média das fotos oficiais
// das meadas (gerado localmente; as fotos não são redistribuídas).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deltaE2000, rgbParaHex, rgbParaLab, type Rgb } from '../src/cores/cielab.ts';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
// .replace tira a marca invisível (BOM) que o Windows às vezes põe no início
const ler = (caminho: string) => readFileSync(join(raiz, caminho), 'utf8').replace(/^﻿/, '');
const lerJson = (caminho: string) => JSON.parse(ler(caminho));

interface CorOficial {
  code: string;
  presentation: string | null;
}

const norm = (codigo: string) => codigo.trim().toUpperCase();

const oficialUs = new Map<string, CorOficial>(
  lerJson('dados/fontes/dmc-oficial-product_data.json').variants.map((v: { colour: CorOficial }) => [norm(v.colour.code), v.colour]),
);
const oficialPt = new Map<string, CorOficial>(
  lerJson('dados/fontes/dmc-oficial-pt-product_data.json').variants.map((v: { colour: CorOficial }) => [norm(v.colour.code), v.colour]),
);

const comunidade = lerJson('dados/fontes/makebead-dmc-floss.json').colors as { code: string; name: string; rgb: Rgb }[];

const adrianj = new Map<string, Rgb>();
for (const linha of ler('dados/fontes/sharlagelfand-floss_adrianj.csv').split(/\r?\n/).slice(1)) {
  const [codigo, , r, g, b] = linha.split(',');
  if (codigo && r !== undefined) adrianj.set(norm(codigo), [Number(r), Number(g), Number(b)]);
}

const arquivoFotos = join(raiz, 'dados/amostras-dmc-medias.json');
const fotos: Record<string, Rgb> = existsSync(arquivoFotos) ? lerJson('dados/amostras-dmc-medias.json') : {};

/**
 * No site oficial, algumas cores de algodão comum aparecem com o sufixo
 * "Light Effect" (nome de outra linha da DMC, metalizada). Retiramos só esse
 * sufixo, para não confundir quem borda.
 */
function limparNome(nome: string): string {
  return nome.replace(/\s+Light Effect$/i, '').trim();
}

export interface CorCatalogo {
  codigo: string;
  /** Nome oficial; vazio quando a DMC não publica nenhum. */
  nome: string;
  /** De onde veio o nome: site DMC Portugal (pt), EUA (en) ou nenhum. */
  idiomaNome: 'pt' | 'en' | null;
  hex: string;
  rgb: Rgb;
  /** Presente quando a cor na tela merece desconfiança extra. */
  conferir?: string;
}

/** ΔE2000 acima disto, em relação à foto oficial, marca a cor para conferência. */
function limiteFoto(diferencas: number[]): number {
  const v = [...diferencas].sort((a, b) => a - b);
  const p90 = v[Math.floor(0.9 * v.length)] ?? 0;
  return Math.max(15, p90 * 1.5);
}

const catalogo: CorCatalogo[] = [];
const foraDoOficial: string[] = [];
const nomesAjustados: string[] = [];
const nomesEmIngles: string[] = [];
const comparacaoAdrianj: { codigo: string; de: number }[] = [];
const comparacaoFoto: { codigo: string; de: number; dL: number }[] = [];

for (const cor of comunidade) {
  const codigo = norm(cor.code);
  const pt = oficialPt.get(codigo);
  const us = oficialUs.get(codigo);
  if (!pt && !us) {
    foraDoOficial.push(codigo);
    continue;
  }

  let nome = pt?.presentation?.trim() ?? '';
  let idiomaNome: CorCatalogo['idiomaNome'] = 'pt';
  if (!nome) {
    nome = us?.presentation?.trim() ?? '';
    idiomaNome = nome ? 'en' : null;
    nomesEmIngles.push(`${codigo} (${nome || 'sem nome em nenhum dos dois sites'})`);
  }
  const limpo = limparNome(nome);
  if (limpo !== nome) nomesAjustados.push(`${codigo}: "${nome}" → "${limpo}"`);

  const codigoExibido = codigo === 'BLANC' ? 'Blanc' : codigo === 'ECRU' ? 'Ecru' : codigo;
  catalogo.push({ codigo: codigoExibido, nome: limpo, idiomaNome, hex: rgbParaHex(cor.rgb), rgb: cor.rgb });

  const lab = rgbParaLab(cor.rgb);
  const outra = adrianj.get(codigo);
  if (outra) comparacaoAdrianj.push({ codigo, de: deltaE2000(lab, rgbParaLab(outra)) });
  const foto = fotos[codigo];
  if (foto) {
    const labFoto = rgbParaLab(foto);
    comparacaoFoto.push({ codigo, de: deltaE2000(lab, labFoto), dL: labFoto.L - lab.L });
  }
}

// Ordem: números primeiro (em ordem numérica), depois Blanc, Ecru, B5200.
const chave = (c: string) => (/^\d+$/.test(c) ? Number(c) : 1e6 + c.charCodeAt(0));
catalogo.sort((a, b) => chave(a.codigo) - chave(b.codigo));

const limite = limiteFoto(comparacaoFoto.map((c) => c.de));
for (const c of comparacaoFoto) {
  if (c.de <= limite) continue;
  const cor = catalogo.find((x) => norm(x.codigo) === c.codigo);
  if (cor) cor.conferir = 'A cor na tela pode estar bem diferente da linha: confira com a meada antes de comprar.';
}

writeFileSync(
  join(raiz, 'src/catalogo/dmc.json'),
  JSON.stringify(
    {
      produto: 'DMC Mouliné Spécial (art. 117), algodão, 6 fios',
      geradoEm: new Date().toISOString().slice(0, 10),
      aviso:
        'Os códigos e nomes foram conferidos no site oficial da DMC. As cores na tela (hex/RGB) são aproximações publicadas pela comunidade: a DMC não publica valores digitais. Confira sempre com a linha física.',
      fontes: {
        codigosENomes: ['https://www.dmc.com/PT/pt/products/mouline-special', 'https://www.dmc.com/US/en/products/mouline-special'],
        coresRgb: 'makebead/craft-color-codes, data/json/dmc-floss.json — CC BY 4.0 — https://github.com/makebead/craft-color-codes',
      },
      cores: catalogo,
    },
    null,
    1,
  ) + '\n',
);

// ---------- Relatório ----------

const estat = (valores: number[]) => {
  const v = [...valores].sort((a, b) => a - b);
  const p = (q: number) => v[Math.min(v.length - 1, Math.floor(q * v.length))];
  return { n: v.length, mediana: p(0.5), p90: p(0.9), max: v[v.length - 1] };
};
const fmt = (n: number) => n.toFixed(1).replace('.', ',');
const nomeDe = (c: string) => catalogo.find((x) => norm(x.codigo) === c)?.nome ?? '';

const linhas: string[] = [];
linhas.push('# Relatório de conferência do catálogo DMC', '');
linhas.push(`Gerado por \`scripts/montar-catalogo.ts\` em ${new Date().toISOString().slice(0, 10)}.`, '');
linhas.push('## Códigos e nomes', '');
linhas.push(`- Cores na tabela da comunidade: **${comunidade.length}**`);
linhas.push(`- Confirmadas no site oficial da DMC (EUA ou Portugal) e incluídas no catálogo: **${catalogo.length}**`);
linhas.push(`- Fora do site oficial (não incluídas): ${foraDoOficial.length ? foraDoOficial.join(', ') : 'nenhuma'}`);
linhas.push(`- Cores oficiais que não entram (linhas mescladas "Ombre", sem uma cor única): ${[...oficialUs.values()].filter((c) => /ombre/i.test(c.presentation ?? '')).length}`);
linhas.push(`- Sem nome no site de Portugal (usado o nome dos EUA, se houver; senão, só o código): ${nomesEmIngles.length ? nomesEmIngles.join(', ') : 'nenhum'}`);
linhas.push('', '### Nomes ajustados (sufixo "Light Effect" retirado)', '');
linhas.push(...(nomesAjustados.length ? nomesAjustados.map((n) => `- ${n}`) : ['- nenhum']));

const ea = estat(comparacaoAdrianj.map((c) => c.de));
linhas.push('', '## Cores (RGB): comparação entre tabelas da comunidade', '');
linhas.push(
  `Comparadas ${ea.n} cores com a tabela adrianj (pacote sharlagelfand/dmc). ` +
    `Diferença ΔE2000: mediana ${fmt(ea.mediana)}, 90% abaixo de ${fmt(ea.p90)}, máxima ${fmt(ea.max)}.`,
  '',
  '> Atenção: as duas tabelas têm um ancestral comum, então concordarem não prova que estão certas. ' +
    'Servem para encontrar erros de digitação ou de planilha.',
  '',
);
const divergentesA = comparacaoAdrianj.filter((c) => c.de > 3).sort((a, b) => b.de - a.de);
linhas.push(`Cores com ΔE2000 > 3 entre as tabelas (${divergentesA.length}):`, '');
linhas.push(
  ...divergentesA.map((c) => {
    const foto = comparacaoFoto.find((f) => f.codigo === c.codigo);
    const outra = adrianj.get(c.codigo);
    const fotoOutra = outra && fotos[c.codigo] ? deltaE2000(rgbParaLab(outra), rgbParaLab(fotos[c.codigo])) : null;
    const desempate =
      foto && fotoOutra !== null
        ? ` — foto oficial: ΔE ${fmt(foto.de)} para o valor do catálogo, ${fmt(fotoOutra)} para o outro`
        : '';
    return `- ${c.codigo} ${nomeDe(c.codigo)}: ΔE ${fmt(c.de)}${desempate}`;
  }),
);

if (comparacaoFoto.length) {
  const ef = estat(comparacaoFoto.map((c) => c.de));
  const medianaDL = estat(comparacaoFoto.map((c) => c.dL)).mediana;
  linhas.push('', '## Cores (RGB): comparação com as fotos oficiais das meadas', '');
  linhas.push(
    `Cor média de ${ef.n} fotos do site da DMC, comparada com a tabela do catálogo. ` +
      `ΔE2000: mediana ${fmt(ef.mediana)}, 90% abaixo de ${fmt(ef.p90)}, máxima ${fmt(ef.max)}. ` +
      `As fotos têm sombra e brilho do fio, então a diferença nunca é zero ` +
      `(em média a foto é ${fmt(Math.abs(medianaDL))} pontos de luminosidade ${medianaDL < 0 ? 'mais escura' : 'mais clara'}).`,
    '',
  );
  const divergentesF = comparacaoFoto.filter((c) => c.de > limite).sort((a, b) => b.de - a.de);
  linhas.push(
    `Cores muito diferentes da foto oficial (ΔE2000 > ${fmt(limite)}). ` +
      `Não trocamos o valor (a foto tem iluminação própria), mas o catálogo marca essas cores ` +
      `com o campo "conferir" (${divergentesF.length}):`,
    '',
  );
  linhas.push(...divergentesF.map((c) => `- ${c.codigo} ${nomeDe(c.codigo)}: ΔE ${fmt(c.de)}`));
}

writeFileSync(join(raiz, 'dados/relatorio-catalogo.md'), linhas.join('\n') + '\n');
console.log(`Catálogo: ${catalogo.length} cores. Relatório em dados/relatorio-catalogo.md`);
