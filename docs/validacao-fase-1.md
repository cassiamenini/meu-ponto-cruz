# Validação final — Fase 1 (aplicativo mínimo funcional)

Data: 27/10/2026 · Site: https://cassiamenini.github.io/meu-ponto-cruz/

## Critérios de sucesso

| # | Critério | Situação | Como foi verificado |
|---|---|---|---|
| 1 | Qualquer pessoa abre o site sem cadastro | ✅ Atendido | Site publicado aberto sem login; nenhuma tela pede dados pessoais; nenhum cookie gravado. |
| 2 | Imagem válida vira gráfico com as dimensões certas | ✅ Atendido | Testes automáticos de largura × altura; no site publicado, 83 pontos pedidos → gráfico 83 × 62 (proporção da imagem) e 15,1 cm em Etamine 14, conferido à mão. |
| 3 | Símbolos consistentes com a legenda | ✅ Atendido | Tela, legenda e PDF usam a mesma função de símbolo por posição na legenda; testes conferem 40 símbolos diferentes, contagem da legenda = pontos do gráfico, e todos os códigos aparecem no PDF. |
| 4 | Códigos DMC verificados | ✅ Atendido (com ressalva nas cores) | Teste confere os 489 códigos e os nomes contra as listas oficiais da DMC (EUA e Portugal). As cores na tela são aproximações da comunidade, conferidas com outra tabela e com fotos oficiais; o app e o PDF avisam isso. |
| 5 | PDF inclui o guia para iniciantes e o gráfico | ✅ Atendido | Teste lê o texto do PDF gerado: os 10 tópicos do guia em ordem, resumo, legenda, gráfico colorido, gráfico P&B e instruções. O guia aparece mesmo com uma só versão do gráfico. |
| 6 | O arquivo pode ser baixado e impresso | ✅ Atendido (impressão física não testada) | Botão de download com arquivo nomeado; PDF válido (lido pelo pdf.js), todas as páginas em A4, texto selecionável, gráficos vetoriais e régua de 10 cm. Ninguém imprimiu ainda. |
| 7 | Interface usável no celular e no computador | ✅ Atendido (celular real não testado) | 5 telas em 375 px, ~640 px e 1280 px; com letra a 140% no celular, sem rolagem lateral (corrigido nesta validação); alvos de toque ≥ 24 px. Testado em emulação, não num aparelho. |
| 8 | Não depende de infraestrutura cara | ✅ Atendido | Site estático no GitHub Pages (gratuito); todo o processamento no navegador; no site publicado, o único endereço acessado é o próprio site. Custo: R$ 0. |
| 9 | Principais testes funcionais e de acessibilidade concluídos | ⚠️ Parcial | 102 testes automáticos; axe-core (WCAG 2.2 A/AA + boas práticas) sem violações nas 5 telas em 3 tamanhos; navegação só por teclado percorrida. Faltam testes com leitor de tela real e com pessoas idosas (previstos na Fase 2). |

## Validação pedida no prompt

| Item | Situação |
|---|---|
| Acessibilidade | Letra de 20 px (até 140%), contraste ≥ 4,5:1, botões ≥ 48 px, foco visível, teclado, leitor de tela (títulos, rótulos, anúncios, tabela de legenda), símbolos que não dependem de cor, PDF com texto selecionável. **Limite:** o PDF não é "marcado" para leitores de tela (o jsPDF não faz isso). |
| Simplicidade | 5 etapas com "Voltar" e "Continuar"; opções avançadas escondidas em "Mais opções"; 3 níveis prontos. |
| Segurança | Tipo real do arquivo pelos primeiros bytes; limites de 15 MB, 12.000 px e 50 Mpx antes de abrir; cópia de trabalho de 2.000 px sem dados de GPS; CSP restrita ao próprio site (na publicação, sem a exceção de desenvolvimento — corrigido nesta validação); 0 vulnerabilidades nas dependências do site (`npm audit --omit=dev`). |
| Precisão das cores | Comparação em CIELAB com CIEDE2000 (implementação validada com os 15 pares de Sharma et al., 2005). Valores RGB são aproximações; 3 cores levam aviso "confira com a meada". |
| Fontes verificáveis | `src/catalogo/FONTES.md` e `dados/relatorio-catalogo.md`, com links e cópias das fontes em `dados/fontes/`. |
| Baixo custo | R$ 0 por mês. Domínio próprio é opcional. |
| Sem cadastro | Nenhuma conta, formulário de dados pessoais ou cookie. |

## Corrigido durante esta validação

1. Rolagem lateral nas telas 2 e 3 com letra a 140% no celular (coluna que não encolhia, botões de zoom largos, legenda larga — no celular a legenda virou blocos, mantendo os papéis de tabela).
2. CSP do site publicado ainda permitia `ws://localhost` (útil só no desenvolvimento).
3. Novos testes: códigos e nomes conferidos contra as listas oficiais; conteúdo e tamanho A4 do PDF lidos do arquivo gerado.

## Pendências conhecidas (próximas fases)

- **Testes com pessoas idosas, num celular real e com leitor de tela** (NVDA, TalkBack ou VoiceOver).
- **Imprimir** um PDF e medir a régua de 10 cm.
- **Fundo sem bordar:** hoje, fundo branco vira pontos de B5200.
- **Edição manual** de pontos e troca de cor (Fase 2).
- **Anchor e Maxi** só com tabelas verificadas (Fase 3).
- Fotos HEIC/AVIF não são abertas (há mensagem explicando).
- Desempenho em celulares antigos não medido (no computador: gráfico máximo em ~1 s, PDF máximo em ~2 s).
