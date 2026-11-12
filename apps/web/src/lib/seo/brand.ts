/**
 * Brand colours that cannot come from CSS custom properties: `<meta name="theme-color">`,
 * the web manifest, generated icons and the Open Graph images (satori has no access to the
 * stylesheet). Values mirror docs/DESIGN.md section 2.1; keep them in sync.
 */
export const palette = {
  paper: '#ECEAE5',
  paperDark: '#121110',
  paperRaised: '#F6F4F0',
  ink: '#141310',
  inkSoft: '#5C574E',
  rule: '#D2CEC6',
  accent: '#E28413',
  onAccent: '#141310',
} as const;
