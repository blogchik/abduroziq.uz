/**
 * Brand colours that cannot come from CSS custom properties: `<meta name="theme-color">`,
 * the web manifest, generated icons and the Open Graph images (satori has no access to the
 * stylesheet). Values mirror docs/DESIGN.md section 2.1 and `styles/tokens.css`; keep them in
 * sync.
 */

/** The three brand colours. Every colour of the site is one of them or a mix of them. */
export const brand = {
  primary: '#E28413',
  secondary: '#000022',
  white: '#FBF5F3',
} as const;

export const palette = {
  paper: brand.white,
  paperDark: brand.secondary,
  paperRaised: '#FFFFFF',
  ink: brand.secondary,
  inkSoft: '#5F5D71',
  rule: '#DDD8DA',
  accent: brand.primary,
  onAccent: brand.secondary,
} as const;
