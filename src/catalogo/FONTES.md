# Fontes do catálogo DMC

Última montagem: 27/10/2026, com `node scripts/montar-catalogo.ts`.
O relatório completo da conferência está em [`dados/relatorio-catalogo.md`](../../dados/relatorio-catalogo.md).

## Resumo

| Informação | Situação | De onde vem |
|---|---|---|
| **Código da linha** | ✅ Verificado | Site oficial da DMC |
| **Nome da cor** | ✅ Verificado (482 cores; 7 sem nome oficial mostram só o código) | Site oficial da DMC (Portugal) |
| **Cor na tela (hex/RGB)** | ⚠️ Aproximação | Tabela da comunidade, conferida com outra tabela e com as fotos oficiais |

**A DMC não publica valores digitais (RGB/hex) das linhas.** Toda cor na tela é uma
aproximação, e a mesma cor também muda de uma tela para outra. O aplicativo avisa isso
para quem usa.

## 1. Códigos e nomes: site oficial da DMC

- EUA: https://www.dmc.com/US/en/products/mouline-special — 505 opções, dados obtidos de
  `https://www.dmc.com/US/en/api/quilt/products/mouline-special/product_data` em 27/10/2026.
  Cópia: `dados/fontes/dmc-oficial-product_data.json`.
- Portugal: https://www.dmc.com/PT/pt/products/mouline-special — nomes em português, de
  `https://www.dmc.com/PT/pt/api/quilt/products/mouline-special/product_data` em 27/10/2026.
  Cópia: `dados/fontes/dmc-oficial-pt-product_data.json`.

Regras usadas:

- Entram as **489 cores sólidas**, todas encontradas no site oficial.
- Ficam de fora as **17 linhas mescladas "Ombre"** (48, 51, 52, 53, 69, 90, 92, 93, 94, 99, 105,
  106, 107, 111, 115, 121, 125), porque não têm uma cor única para comparar com a imagem.
- O código **776** aparece no site de Portugal (sem nome) e não no dos EUA; foi mantido.
- **Ajuste 1:** em 16 cores de algodão comum, o site acrescenta "Light Effect" ao nome
  (ex.: 310 "Preto Light Effect"). Light Effects é outra linha da DMC, metalizada; o sufixo
  foi retirado para não confundir. A lista está no relatório.
- **Sem nome oficial:** 7 cores não têm nome nem no site de Portugal nem no dos EUA
  (504, 731, 776, 781, 806, 971, 3773). Para elas, o aplicativo mostra só o código — não
  usamos nomes da comunidade, porque não estão confirmados.
- Os nomes foram mantidos exatamente como a DMC escreve, mesmo quando parecem ter erro de
  idioma (ex.: Blanc = "Blanco", 309 = "Rosa Frambuesa").

## 2. Cores na tela: tabela da comunidade

- **makebead/craft-color-codes**, arquivo `data/json/dmc-floss.json`
  https://github.com/makebead/craft-color-codes
  Licença dos dados: **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/) — exige
  crédito, que aparece no rodapé do aplicativo e neste arquivo.
  Cópia: `dados/fontes/makebead-dmc-floss.json`.
  Essa tabela já combina floss.maxxmint.com, adrianj/CrossStitchCreator e xstitchify.com.

## 3. Conferências feitas

1. **Contra outra tabela** — `sharlagelfand/dmc` (licença MIT), arquivo
   `data-raw/floss_adrianj.csv`: https://github.com/sharlagelfand/dmc
   453 cores em comum; só 1 diferente (309). As duas tabelas têm um ancestral comum,
   então concordar não prova que estão certas.
2. **Contra as fotos oficiais das meadas** no site da DMC — cor média de cada foto,
   ignorando as sombras mais escuras e os reflexos mais claros. As fotos **não são
   redistribuídas** (pertencem à DMC); só servem para conferência local
   (`node scripts/baixar-amostras-dmc.mjs`).
   - No caso do 309, a foto confirmou o vermelho (ΔE2000 3,8) e não o cinza da outra tabela (26,3).
   - 3 cores ficaram muito longe da foto (3705, 995, 840). O valor não foi trocado, porque a
     foto tem iluminação própria, mas essas cores levam um aviso `conferir` no catálogo.

## 4. Equivalências Anchor e Maxi (`equivalencias.json`)

Gerado por `scripts/montar-equivalencias.ts`. **Só entram códigos impressos nas tabelas dos
fabricantes**; quando a tabela não traz a cor, o aplicativo mostra "sem cor correlata".
As transcrições ficam em `dados/equivalencias/` (as fotos das tabelas não são publicadas).

| Marca | Fonte | Cobertura |
|---|---|---|
| Anchor | "Tabela de Conversão DMC-Anchor", impressa pela Anchor (2 páginas) | 293 das 489 cores DMC |
| Maxi Mouliné | "Tabela de conversão DMC / Maxi Mouliné – cores aproximadas", Círculo S.A., duas edições com a numeração nova | 441 das 489 cores DMC |

**Anchor.** Uma cor DMC pode ter várias opções Anchor na tabela. Mostramos no máximo duas,
da mais parecida para a menos parecida, comparando a cor da DMC (catálogo acima) com a cor
de tela de cada Anchor listada na ferramenta de conversão do Stitchmate
(stitchmate.app/pt/ferramentas/tabela-de-conversao-de-linhas, consultada em 28/10/2026).
Essas cores servem só para ordenar: o código mostrado é sempre o da tabela. A transcrição
foi conferida com `scripts/conferir-anchor.ts` (diferença mediana ΔE00 7,8 entre a DMC e a
Anchor indicada); os casos de diferença grande foram conferidos de novo na imagem e estão
iguais ao impresso.

**Maxi.** As duas edições da tabela da Círculo discordam em 165 cores. Para cada cor DMC:

1. os candidatos são os códigos das duas edições ("x" = sem cor);
2. só vale um código que existe na cartela atual da Círculo (300 cores, site oficial);
3. entre os válidos, fica o de foto mais parecida com a foto da DMC (ΔE00, mesmo método de
   média das fotos usado acima; fotos não redistribuídas);
4. se mesmo o melhor ficar com ΔE00 acima de 25, a cor fica "sem cor correlata".

Comparações feitas com `scripts/analisar-maxi.ts`.

## 5. O que não foi possível verificar

- A cor **física** de cada linha: isso exigiria medir as meadas com um espectrofotômetro.
- As equivalências entre marcas são **aproximadas** (os próprios fabricantes dizem isso).
- Códigos Anchor que aparecem na tabela, mas não na lista do Stitchmate (por exemplo 406,
  3324), foram mantidos como estão impressos; eles vão por último quando há outra opção.
- A tabela de conversão em PDF enviada como referência não foi usada como fonte de dados.

## Comparação das cores

Diferenças medidas com **CIEDE2000** (ΔE00) em CIELAB (D65), implementação própria em
`src/cores/cielab.ts`, testada com os dados publicados por Sharma, Wu e Dalal (2005),
*Color Research & Application* 30(1).
