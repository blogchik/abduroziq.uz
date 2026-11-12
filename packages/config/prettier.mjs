/**
 * Shared Prettier config. The root prettier.config.mjs spreads it and adds the
 * Tailwind stylesheet path. prettier-plugin-tailwindcss must stay last.
 * @type {import('prettier').Config}
 */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
  overrides: [{ files: '*.astro', options: { parser: 'astro' } }],
};
