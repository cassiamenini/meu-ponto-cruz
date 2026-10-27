// Contas de cor.
//
// A tela usa RGB (vermelho, verde, azul), mas RGB não corresponde bem ao que
// o olho percebe: duas cores com números "próximos" podem parecer bem
// diferentes. Por isso convertemos para CIELAB, um espaço feito para imitar
// a percepção humana, e medimos a diferença com a fórmula CIEDE2000 (ΔE00).
//
// Referência da fórmula e dos dados de teste:
// G. Sharma, W. Wu, E. N. Dalal, "The CIEDE2000 Color-Difference Formula:
// Implementation Notes, Supplementary Test Data, and Mathematical
// Observations", Color Research & Application 30(1), 2005.
//
// Este arquivo não importa nada, para poder ser usado também pelos scripts.

export type Rgb = readonly [number, number, number];

export interface Lab {
  L: number;
  a: number;
  b: number;
}

// Branco de referência D65 (o padrão das telas sRGB).
const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;

/** Converte um canal sRGB (0 a 255) para luz "linear" (0 a 1). */
export function linear(canal: number): number {
  const c = canal / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function f(t: number): number {
  const delta = 6 / 29;
  return t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
}

/** Converte uma cor sRGB (0 a 255) para CIELAB. */
export function rgbParaLab([r, g, b]: Rgb): Lab {
  return linearParaLab(linear(r), linear(g), linear(b));
}

/** Converte luz linear (0 a 1 em cada canal) para CIELAB. */
export function linearParaLab(R: number, G: number, B: number): Lab {
  const X = 0.4124564 * R + 0.3575761 * G + 0.1804375 * B;
  const Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const Z = 0.0193339 * R + 0.119192 * G + 0.9503041 * B;
  const fx = f(X / XN);
  const fy = f(Y / YN);
  const fz = f(Z / ZN);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const graus = (rad: number) => (rad * 180) / Math.PI;
const rad = (g: number) => (g * Math.PI) / 180;

function matiz(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  const h = graus(Math.atan2(b, a));
  return h < 0 ? h + 360 : h;
}

/**
 * Diferença de cor CIEDE2000.
 * Como referência: abaixo de 1 é praticamente imperceptível; entre 1 e 2,
 * só um olho treinado nota; acima de 5, são cores claramente diferentes.
 */
export function deltaE2000(c1: Lab, c2: Lab): number {
  const { L: L1, a: a1, b: b1 } = c1;
  const { L: L2, a: a2, b: b2 } = c2;

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cmedio7 = ((C1 + C2) / 2) ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cmedio7 / (Cmedio7 + 25 ** 7)));

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h1p = matiz(a1p, b1);
  const h2p = matiz(a2p, b2);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));

  const Lpm = (L1 + L2) / 2;
  const Cpm = (C1p + C2p) / 2;

  let hpm: number;
  if (C1p * C2p === 0) hpm = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hpm = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hpm = (h1p + h2p + 360) / 2;
  else hpm = (h1p + h2p - 360) / 2;

  const T =
    1 -
    0.17 * Math.cos(rad(hpm - 30)) +
    0.24 * Math.cos(rad(2 * hpm)) +
    0.32 * Math.cos(rad(3 * hpm + 6)) -
    0.2 * Math.cos(rad(4 * hpm - 63));

  const dTheta = 30 * Math.exp(-(((hpm - 275) / 25) ** 2));
  const Cpm7 = Cpm ** 7;
  const Rc = 2 * Math.sqrt(Cpm7 / (Cpm7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lpm - 50) ** 2) / Math.sqrt(20 + (Lpm - 50) ** 2);
  const Sc = 1 + 0.045 * Cpm;
  const Sh = 1 + 0.015 * Cpm * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;

  const termoL = dLp / Sl;
  const termoC = dCp / Sc;
  const termoH = dHp / Sh;
  return Math.sqrt(termoL ** 2 + termoC ** 2 + termoH ** 2 + Rt * termoC * termoH);
}

export function hexParaRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbParaHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('');
}
