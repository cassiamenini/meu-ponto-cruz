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
