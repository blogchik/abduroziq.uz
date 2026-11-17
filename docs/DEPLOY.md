# Deploying abduroziq.uz

The site is static. GitHub Actions builds it and Cloudflare Workers (static assets) serves it.

## Branches and environments

| Branch | Environment | On push |
|---|---|---|
| `dev` | local development | CI only (lint, typecheck, build, Lighthouse, end-to-end suite) |
| `main` | production | CI, then `Deploy` workflow |

Releasing = merging `dev` into `main` and pushing. A save in the content panel
([ADMIN.md](ADMIN.md)) is a commit to `main` too and goes through the same workflow. The `Deploy` workflow rebuilds,
runs `pnpm check` (format, lint, typecheck, tests, build) and the Lighthouse assertions of
`lighthouserc.json`, and only then runs `wrangler deploy`, so a commit that fails any check
is never published. The job only runs on `main`: starting it by hand from the Actions tab
(`Deploy` -> `Run workflow`) on another branch does nothing.

Until the two secrets below exist, the workflow still succeeds: it builds, then writes
"Deploy skipped: secrets not configured" to the job summary and publishes nothing.

## One-time Cloudflare setup

1. Create a free account at https://dash.cloudflare.com/sign-up.
2. Find the account id: dashboard home, open the account menu next to the account name,
   "Copy account ID" (it is also in the URL after `dash.cloudflare.com/`).
3. Create an API token: Manage Account -> Account API Tokens -> Create Token -> start from
   the "Edit Cloudflare Workers" template. Keep these permissions:
   - Account: Workers Scripts: Edit
   - Account: Workers Routes / Zone: Workers Routes: Edit (only needed for the custom domain)
   - Zone: Zone: Read, DNS: Edit (only needed for the custom domain)
   Scope it to your account (and the `abduroziq.uz` zone once it exists). Copy the token once.
4. Add the secrets in GitHub: repository -> Settings -> Secrets and variables -> Actions ->
   New repository secret, or from a terminal:
   `gh secret set CLOUDFLARE_API_TOKEN` and `gh secret set CLOUDFLARE_ACCOUNT_ID`.
   The workflow uses a `production` environment; GitHub creates it on first run. Secrets at
   repository level are visible to it. If you prefer, put them in that environment instead.
5. Run `Deploy` (push to `main` or run it manually). The deploy publishes to
   `https://abduroziq.uz` only: `wrangler.jsonc` turns the `*.workers.dev` URL and preview
   URLs off. (If they are ever turned back on, `apps/web/public/_headers` already sends
   `X-Robots-Tag: noindex` there.)

## Connecting abduroziq.uz

A Worker custom domain needs the domain's zone to be active on Cloudflare, which means the
domain's nameservers point to Cloudflare (Cloudflare docs, "Custom Domains": "An active
Cloudflare zone"; a hostname with an existing CNAME cannot be used).

1. Check the registrar. Add `abduroziq.uz` in the dashboard (Add a domain). Cloudflare
   shows two nameservers. At your `.uz` registrar, look for "Nameservers / NS / DNS
   servers" in the domain settings and replace the current ones.
   **Not verified:** whether `.uz` registrars (UZINFOCOM and its resellers) accept
   third-party nameservers and whether Cloudflare accepts a `.uz` zone. Test it with the
   steps above; the zone becomes "Active" within minutes to hours if it works.
   Done on 2026-11-13: the registrar accepted the Cloudflare nameservers and the zone is
   active on the Free plan.
2. The route. `wrangler.jsonc` lists `abduroziq.uz` as a custom domain; the deploy creates
   the DNS record and certificate for it. The API token needs Zone > Workers Routes > Edit
   on the `abduroziq.uz` zone for that (the "Edit Cloudflare Workers" template has it).
3. `www` -> apex redirect. `_redirects` cannot match on host (the docs list
   domain-level redirects as unsupported), so use a dashboard rule:
   - DNS: add a proxied (orange cloud) `A` record `www` -> `192.0.2.0`.
   - Rules -> Redirect Rules -> Create: hostname equals `www.abduroziq.uz`, dynamic
     redirect to `concat("https://abduroziq.uz", http.request.uri.path)` with status 301,
     preserve query string.
   Cloudflare's docs confirm the proxied dummy record plus redirect rule pattern. The exact
   dashboard labels may differ slightly.
   Done on 2026-11-13: proxied `A www -> 192.0.2.1`, Single Redirect "www to abduroziq.uz"
   (`https://www.abduroziq.uz/*` -> `https://abduroziq.uz/${1}`, 301, query string kept).
4. HTTPS only. SSL/TLS -> Edge Certificates -> Always Use HTTPS: on (2026-11-13), so
   `http://` answers with a 301 to `https://`.

## E-mail: hello@abduroziq.uz

Cloudflare Email Routing (free) forwards `hello@abduroziq.uz` to the owner's own inbox;
nothing is stored on Cloudflare. Set up on 2026-11-13: Email -> Email Routing ->
Destination addresses (verified), Routing rules (`hello@` -> that address; catch-all
stays off), Settings -> DNS records (three `route*.mx.cloudflare.net` MX records, the
`cf2024-1._domainkey` DKIM record, SPF `v=spf1 include:_spf.mx.cloudflare.net ~all`).
The zone's earlier records were replaced then: `MX 0 abduroziq.uz` and
`TXT "v=spf1 +a +mx +ip4:185.196.212.52 ~all"` (left over from the old hosting; the apex
had no mail server any more). Email Routing only receives: sending as `hello@` needs a
separate service.

### If the registrar does not allow Cloudflare nameservers

Not verified, ordered by simplicity:

- Keep DNS at the registrar and put the site on Cloudflare Pages instead: Pages custom
  domains can use a CNAME for subdomains (for example `www`), but an apex CNAME needs
  CNAME flattening, which most `.uz` DNS hosts lack. Redirect the apex to `www` at the
  registrar if it offers URL forwarding. This changes the canonical host, so
  `PUBLIC_SITE_URL` in `apps/web/.env.production` would have to change too.
- Move DNS hosting only (not the registration) to a DNS provider that supports apex
  flattening/ALIAS and point it at the workers.dev or Pages target.
- Cloudflare "partial (CNAME) setup" lets you keep external DNS but is, to my knowledge,
  a paid-plan feature. Not verified.

Until this is solved the site works on the workers.dev URL, but the canonical URL and
sitemap say `https://abduroziq.uz`.

## Rollback

- Fast: Cloudflare dashboard -> Workers & Pages -> `abduroziq-uz` -> Deployments ->
  pick a previous version -> Rollback. CLI: `pnpm exec wrangler rollback` (needs the same
  token in `CLOUDFLARE_API_TOKEN`).
- Permanent: `git revert` the bad commit on `main` (or on `dev`, then merge) and push.
  Or Actions -> `Deploy` -> run on an older commit by re-running its earlier successful run.

## Analytics

Cloudflare dashboard -> Analytics & Logs -> Web Analytics. Create a site there, copy the
token, and set `PUBLIC_ANALYTICS_TOKEN` in `apps/web/.env.production` (public value, safe
to commit). Workers metrics (requests, errors) are under Workers & Pages -> `abduroziq-uz`
-> Metrics. No Content-Security-Policy is set, so the analytics script is not blocked.

## Things to know

- CI builds in production mode (indexing allowed) so Lighthouse SEO can pass. Lighthouse
  asserts accessibility 1.0, best practices 0.95 and SEO 1.0 as errors, performance 0.95
  as a warning, on `/`, `/uz/`, `/blog/`, the project list and three project pages in English
  and Uzbek (see `lighthouserc.json`). The 404 pages are not audited: their status and
  `noindex` fail SEO by design.
- The `CI` workflow has three jobs: `check` (`pnpm check`, then uploads `dist`), `lighthouse` and
  `e2e`, the last two on the uploaded `dist`. `e2e` is the Playwright suite in `e2e/`
  (`pnpm test:e2e`): every page, reduced motion, no JavaScript, the page transition and the
  wheel over code blocks, Chromium only. It does not gate the deploy; `Deploy` runs its own checks.
- Third-party actions are pinned to commit SHAs (the tag is in a trailing comment), above all
  `cloudflare/wrangler-action`, which receives the API token. Dependabot's `github-actions`
  updates keep the SHAs and the comments current.
- Dependabot opens weekly grouped PRs against `dev`; TypeScript stays below 7 and pnpm on 10.
- Security features that are switched on in the repository settings on GitHub, not in a file
  here: private vulnerability reporting, Dependabot alerts and security updates, secret
  scanning with push protection. [SECURITY.md](../SECURITY.md) tells reporters how to use the
  first one, so it has to stay on. Dependabot security updates ignore `target-branch` and
  open their pull requests against `main`, where a merge deploys.
- `_headers` limits: 100 rules, 2000 characters per line. Headers apply to static assets
  only, and are not applied to Worker-generated responses (there is no Worker code here).
