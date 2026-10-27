// Pequenos ajudantes para criar elementos da página.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...filhos: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const elemento = Object.assign(document.createElement(tag), props);
  elemento.append(...filhos);
  return elemento;
}

/** Caixa de erro que o leitor de tela anuncia assim que recebe um texto. */
export function caixaDeErro(mensagem?: string): HTMLParagraphElement {
  const p = el('p', { className: 'aviso-erro' });
  p.setAttribute('role', 'alert');
  if (mensagem) p.textContent = mensagem;
  else p.hidden = true;
  return p;
}

export function mostrarErro(caixa: HTMLElement, mensagem: string | null): void {
  caixa.hidden = !mensagem;
  caixa.textContent = mensagem ?? '';
}

/** Grupo de opções (botões de rádio) em cartões grandes, fáceis de tocar. */
export function grupoDeOpcoes<T extends string | number>(
  nome: string,
  legenda: string,
  opcoes: { valor: T; titulo?: string; texto: string }[],
  atual: T,
  aoMudar: (v: T) => void,
  classe = '',
): { bloco: HTMLFieldSetElement; marcar: (v: T) => void } {
  const entradas: HTMLInputElement[] = [];
  const bloco = el('fieldset', { className: `grupo-opcoes ${classe}` }, el('legend', {}, legenda));
  for (const o of opcoes) {
    const entrada = el('input', { type: 'radio', name: nome, value: String(o.valor), checked: o.valor === atual });
    entrada.addEventListener('change', () => entrada.checked && aoMudar(o.valor));
    entradas.push(entrada);
    const textos = o.titulo
      ? [el('span', { className: 'opcao-titulo' }, o.titulo), el('span', { className: 'opcao-texto' }, o.texto)]
      : [el('span', { className: 'opcao-texto' }, o.texto)];
    bloco.append(el('label', { className: 'cartao-opcao' }, entrada, el('span', { className: 'opcao-textos' }, ...textos)));
  }
  return {
    bloco,
    marcar: (v) => entradas.forEach((e) => (e.checked = e.value === String(v))),
  };
}
