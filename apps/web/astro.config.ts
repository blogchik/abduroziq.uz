import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';
import type { AstroIntegration } from 'astro';
import { loadEnv } from 'vite';
import { defaultLocale, locales } from '../../packages/content/src/locales';
import { codeThemes } from './src/lib/shiki-theme';
import { createSitemapSetup } from './src/lib/seo/sitemap';

// Paths come from this file's own location, never from the working directory: building with
// `astro build --root apps/web` from the repository root must behave like `pnpm build`.
const appRoot = path.dirname(fileURLToPath(import.meta.url));

// `.env*` files are not loaded inside this config, so load them with Vite's own rules.
// `astro dev` runs in mode "development"; build, preview and check use "production".
const argv = process.argv.slice(2);
const modeFlag = argv.findIndex((arg) => arg === '--mode');
const mode =
  (modeFlag !== -1 ? argv[modeFlag + 1] : undefined) ??
  argv.find((arg) => arg.startsWith('--mode='))?.slice('--mode='.length) ??
  (argv[0] === 'dev' ? 'development' : 'production');
const env = loadEnv(mode, appRoot, 'PUBLIC_');

const site = env['PUBLIC_SITE_URL'] ?? 'http://localhost:4321';

// A production build with a non-https (or missing) site URL would publish canonical links,
// hreflang, the sitemap and Open Graph tags that point at localhost. Fail instead.
if (mode === 'production' && !site.startsWith('https://')) {
  throw new Error(
    `PUBLIC_SITE_URL must be an https URL in production builds, got "${site}". ` +
      `Set it in apps/web/.env.production (looked in ${appRoot}).`,
  );
}

/** Routes that exist only in `astro dev`. Keep in sync with the sitemap filter below. */
const DEV_ONLY_PATH = /^\/(styleguide|lab)(\/|$)/;

// Sitemap: no 404, dev-only routes or generated images; drafts out; lastmod and hreflang for
// translated posts come from the posts' frontmatter (see src/lib/seo/sitemap.ts).
const sitemapSetup = createSitemapSetup({
  siteUrl: site,
  postsDir: path.resolve(appRoot, '../../packages/content/posts'),
  locales,
  defaultLocale,
  exclude: [/^\/404\/?$/, DEV_ONLY_PATH, /^\/(uz\/)?og\//],
});

/**
 * Injects every `.astro` file under `src/dev-pages/` as a route, in dev only:
 * `styleguide.astro` -> `/styleguide/`, `lab/motion.astro` -> `/lab/motion/`.
 * Production builds never see these files, so nothing leaks into `dist`.
 * New files need a dev server restart.
 */
function devOnlyPages(): AstroIntegration {
  return {
    name: 'dev-only-pages',
    hooks: {
      'astro:config:setup': ({ command, config, injectRoute }) => {
        if (command !== 'dev') return;
        const root = fileURLToPath(config.root);
        const dir = `${root}src/dev-pages`;
        let files: string[];
        try {
          files = readdirSync(dir, { recursive: true, encoding: 'utf8' });
        } catch {
          return;
        }
        for (const file of files) {
          if (!file.endsWith('.astro')) continue;
          const rel = file.replaceAll('\\', '/').replace(/\.astro$/, '');
          const pattern = `/${rel}`.replace(/\/index$/, '') || '/';
          injectRoute({ pattern, entrypoint: `${dir}/${file.replaceAll('\\', '/')}` });
        }
      },
    },
  };
}

export default defineConfig({
  site,
  trailingSlash: 'always',
  i18n: {
    locales: [...locales],
    defaultLocale,
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    devOnlyPages(),
    mdx(),
    sitemap({
      i18n: {
        defaultLocale,
        locales: Object.fromEntries(locales.map((locale) => [locale, locale])),
      },
      filter: sitemapSetup.filter,
      serialize: sitemapSetup.serialize,
    }),
  ],
  markdown: {
    // Straight quotes stay straight: Uzbek uses a plain ' (o'zbek), and titles, descriptions
    // and structured data do too, so one spelling reaches readers and search engines.
    processor: satteri({ features: { smartPunctuation: false } }),
    shikiConfig: {
      // Our own two-mode theme (src/lib/shiki-theme.ts); the dark colours reach the page as
      // --shiki-dark* variables, switched by the rule in styles/global.css.
      themes: { light: codeThemes.light, dark: codeThemes.dark },
      wrap: false,
    },
  },
  env: {
    schema: {
      PUBLIC_SITE_URL: envField.string({
        context: 'client',
        access: 'public',
        default: 'http://localhost:4321',
      }),
      // Anything but the string "true" keeps the site out of search engines.
      PUBLIC_ALLOW_INDEXING: envField.string({
        context: 'client',
        access: 'public',
        default: 'false',
      }),
      // Cloudflare Web Analytics token. Empty means no analytics script.
      PUBLIC_ANALYTICS_TOKEN: envField.string({
        context: 'client',
        access: 'public',
        default: '',
      }),
      // Search engine ownership codes, output as meta tags when set (docs/SEO.md).
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        context: 'client',
        access: 'public',
        default: '',
      }),
      PUBLIC_YANDEX_VERIFICATION: envField.string({
        context: 'client',
        access: 'public',
        default: '',
      }),
      PUBLIC_BING_SITE_VERIFICATION: envField.string({
        context: 'client',
        access: 'public',
        default: '',
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // The app's absolute path for code that reads files at build time (the OG image fonts).
    define: { __WEB_ROOT__: JSON.stringify(appRoot) },
  },
});
