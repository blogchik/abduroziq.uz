# Deploying abduroziq.uz

The site is static. GitHub Actions builds it and Cloudflare Workers (static assets) serves it.

## Branches and environments

| Branch | Environment | On push |
|---|---|---|
| `dev` | local development | `CI`: check, then Lighthouse and the end-to-end suite |
| `main` | production | the same `CI`, then the deploy |

Releasing = merging `dev` into `main` and pushing. A save in the content panel
([ADMIN.md](ADMIN.md)) is a commit to `main` too and goes through the same workflow. There is
one workflow, `CI` (`.github/workflows/ci.yml`), and on `main` it ends in the deploy:

```
check ──┬── lighthouse ──┬── deploy (main only) ── notify (main only)
        └── e2e ─────────┘
```

1. `check` runs `pnpm check` (format, media metadata, lint, typecheck, tests, production build)
   and uploads `apps/web/dist` as the `dist` artifact.
2. `lighthouse` (the assertions of `lighthouserc.json`) and `e2e` (the Playwright suite) test
   that `dist`, side by side.
3. `deploy` runs only when all three passed, and publishes that same `dist` with
   `wrangler deploy`: nothing is built again after the tests, and no build code runs in the job
   that holds the Cloudflare token. A commit that fails any check is never published.
4. `notify` sends the result to Telegram ([Telegram notification](#telegram-notification)).

On `dev` and in pull requests the run stops after step 2. A manual run (Actions -> `CI` ->
`Run workflow`) on `main` checks and deploys that commit again; on another branch it only
checks. A push that changes only files the site is not built from (`docs/`, the `*.md` files at
the repository root, `LICENSE`, `.github/assets/`, `.github/dependabot.yml`) starts no run at
all, so it publishes nothing either.

On `dev` and in pull requests a newer push cancels the older run. On `main` nothing is
cancelled: runs wait for each other, so a deploy never stops halfway.

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
4. Add the secrets to the `production` environment in GitHub: repository -> Settings ->
   Environments -> `production` -> Environment secrets -> Add secret, or from a terminal:
   `gh secret set CLOUDFLARE_API_TOKEN --env production` and
   `gh secret set CLOUDFLARE_ACCOUNT_ID --env production`. The environment's deployment branches
   are limited to `main`, so only a job on `main` can read them. Do not keep a repository-level
   copy: a repository secret is readable from every branch.
5. Push to `main` (or run `CI` by hand on `main`). The deploy publishes to
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

## Telegram notification

The last job of `CI`, `notify`, sends one Telegram message for every run on `main` (a save in
the content panel, a merge of `dev`, a manual run), so the result is known without opening
GitHub:

- `✅ Published`, the commit (subject and short SHA) and the site address;
- `❌ Not published`, the commit and what failed: `pnpm check`, the Lighthouse assertions, the
  end-to-end suite or the deploy to Cloudflare (a missing Cloudflare secret fails the deploy);
- `⚠️ Not published` when the run was cancelled.

Every message ends with a link to the run. The job reads two secrets, `TELEGRAM_BOT_TOKEN` and
`TELEGRAM_CHAT_ID`, from the `production` environment (with `deployment: false`, so it does not
record a deployment of its own); until both exist it does nothing and the workflow runs as
before.

1. Create the bot. In Telegram open [@BotFather](https://t.me/BotFather), send `/newbot` and
   give the bot a name and a username that ends in `bot`. BotFather answers with the token (it
   looks like `110201543:AAHdq...`).
2. Open the chat with the new bot and press **Start**: a bot cannot write to someone who has
   not written to it first.
3. Find your chat id. In a terminal (`read -rs` takes the pasted token without showing it or
   keeping it in the shell history):

   ```bash
   read -rs TOKEN
   curl -s "https://api.telegram.org/bot$TOKEN/getUpdates"
   ```

   The chat id is the number in `"chat":{"id":123456789,`. An empty `"result":[]` means the bot
   has received nothing in the last 24 hours: send it any message and ask again.
4. Add both values as secrets of the `production` environment, next to the Cloudflare ones:
   repository -> Settings -> Environments -> `production` -> Add secret, or from a terminal
   `gh secret set TELEGRAM_BOT_TOKEN --env production` and
   `gh secret set TELEGRAM_CHAT_ID --env production` (each asks for the value).
5. Try it: Actions -> `CI` -> Run workflow, on `main` (this checks and deploys the current
   `main` again). The message arrives when the run ends.

The token is the bot's password: whoever has it can write as the bot and read what is sent to
it. It belongs in the secret and nowhere else; if it leaks, replace it in @BotFather (`/revoke`)
and update the secret. The chat id is the number of your Telegram account, which is why it is a
secret too and not a line in this public repository.

The message is a courtesy: it never changes the result of a run. When it cannot be sent, the
"Notify on Telegram" job ends with a warning that gives the HTTP status of Telegram's answer
and nothing else, because the run log is public and the answer names the chat. 401 is a wrong
token (checked with a made-up one). **Not verified:** that 400 means a wrong chat id and 403 a
bot that was never started or has been blocked; and the message itself, until step 5 has been
done once with the real secrets.

## Rollback

- Fast: Cloudflare dashboard -> Workers & Pages -> `abduroziq-uz` -> Deployments ->
  pick a previous version -> Rollback. CLI: `pnpm exec wrangler rollback` (needs the same
  token in `CLOUDFLARE_API_TOKEN`).
- Permanent: `git revert` the bad commit on `main` (or on `dev`, then merge) and push.
  Or Actions -> `CI` -> open an earlier successful run on `main` -> Re-run all jobs: it checks
  and deploys that older commit again.

## Analytics

Cloudflare dashboard -> Analytics & Logs -> Web Analytics. Create a site there, copy the
token, and set `PUBLIC_ANALYTICS_TOKEN` in `apps/web/.env.production` (public value, safe
to commit). Workers metrics (requests, errors) are under Workers & Pages -> `abduroziq-uz`
-> Metrics. No Content-Security-Policy is set, so the analytics script is not blocked.

## Things to know

- CI builds in production mode (indexing allowed) so Lighthouse SEO can pass. Lighthouse
  asserts accessibility 1.0, best practices 0.95 and SEO 1.0 as errors, performance 0.95
  as a warning, on `/`, `/uz/`, `/blog/`, the project list and three project pages in English
  and Uzbek (see `lighthouserc.json`). One run per page: the three asserted categories give
  the same score every time on a static build, and performance only warns. The 404 pages are
  not audited: their status and `noindex` fail SEO by design.
- `e2e` is the Playwright suite in `e2e/` (`pnpm test:e2e`): every page, reduced motion, no
  JavaScript, the page transition and the wheel over code blocks, Chromium only (the headless
  shell, installed fresh on every run). It gates the deploy, like the other checks.
- The path filter means a commit that changes only documentation shows no CI result. If the
  `CI` checks are ever made required (a ruleset or branch protection), such a pull request
  would wait for them forever: drop the filter then.
- Third-party actions are pinned to commit SHAs (the tag is in a trailing comment), above all
  `cloudflare/wrangler-action`, which receives the API token. The repository requires it:
  Settings -> Actions -> General -> "Require actions to be pinned to a full-length commit SHA".
  Dependabot's `github-actions` updates keep the SHAs and the comments current. Every checkout
  sets `persist-credentials: false`, so the workflow token is not left in `.git/config`.
- Dependabot opens weekly grouped PRs against `dev`; TypeScript stays below 7 and pnpm on 10.
  It waits three days after a release before proposing it (seven for a major npm release), and
  `minimumReleaseAge` in `pnpm-workspace.yaml` stops pnpm from resolving any version younger
  than a day, locally too. Both guard against a hijacked release, which is usually pulled
  within hours.
- Security features that are switched on in the repository settings on GitHub, not in a file
  here: private vulnerability reporting, Dependabot alerts and security updates, secret
  scanning with push protection, CodeQL code scanning (default setup: JavaScript/TypeScript,
  Python and the workflows themselves), the SHA pinning rule above, and a ruleset that forbids
  force pushes to and deletion of `main` and `dev` (Settings -> Rules -> Rulesets; to rewrite
  history on purpose, switch it to "Disabled" for that push and back). [SECURITY.md](../SECURITY.md)
  tells reporters how to use the first one, so it has to stay on. Dependabot security updates
  ignore `target-branch` and open their pull requests against `main`, where a merge deploys.
- `_headers` limits: 100 rules, 2000 characters per line. Headers apply to static assets
  only, and are not applied to Worker-generated responses (there is no Worker code here).
