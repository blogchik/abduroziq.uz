# Security policy

abduroziq.uz is a static website. Astro builds HTML, CSS and JavaScript, GitHub Actions deploys
them, and Cloudflare Workers serves them as static assets. There is no server code, no database,
no accounts and no forms, so a problem is most likely in what the build ships or in how the site
is built and deployed.

One page is a tool instead of content: the content panel at `/admin/` (`docs/ADMIN.md`). It is
static too. It runs Sveltia CMS in the maintainer's browser and writes to this repository
through the GitHub API with the maintainer's own access token, which stays in that browser.
Without a token with write access to the repository it can do nothing.

## Supported versions

Only the current `main` branch is supported: it is what runs at https://abduroziq.uz. There are
no releases and no older versions to patch. A problem found on `dev` is still worth reporting, so
that it is fixed before it reaches `main`.

## Reporting a vulnerability

Please do not open a public issue, pull request or discussion for a security problem.

1. Preferred:
   [report it privately on GitHub](https://github.com/blogchik/abduroziq.uz/security/advisories/new)
   (the "Report a vulnerability" button on the repository's Security tab). Only you and the
   maintainer can see the report.
2. Without a GitHub account: write to hello@abduroziq.uz with "Security" in the subject.

English or Uzbek, whichever is easier. A useful report says:

- what is affected: a URL, a file and line, a workflow or a dependency;
- how to reproduce it, step by step, or a proof of concept;
- what an attacker gains from it;
- whether and how you would like to be credited once it is fixed.

## Scope

In scope:

- the site at https://abduroziq.uz: script or content injection in the built pages, the feeds or
  the generated images, and anything else that harms a visitor;
- secrets, credentials or private data committed to this repository or shipped in the built
  site, including metadata left in images and video;
- the build and deploy pipeline: the workflows in `.github/workflows`, their permissions and
  their use of secrets, and anything that would let an outsider publish to the site;
- the content panel at `/admin/`: anything that would let someone write to the repository
  through it without a token of their own, or that would expose the token of a signed-in
  maintainer;
- a vulnerable or malicious dependency that really affects the built site or the pipeline.

Out of scope:

- other projects the site describes (Payzone, TAVRYN and the rest). They are separate systems;
  this policy does not cover them and gives no permission to test them;
- vulnerabilities in GitHub, Cloudflare or a dependency that have no effect here: report those
  to the project in question;
- denial of service, load tests and high-volume automated scanning;
- social engineering, phishing and physical attacks;
- best-practice findings with no demonstrated impact, such as the missing
  Content-Security-Policy header, e-mail DNS records or version banners. They are welcome as an
  ordinary issue.

## Testing

The site is static, so a local build behaves like production. Please test there, not on the
live site:

```bash
corepack enable
pnpm install
pnpm build && pnpm preview
```

Stop as soon as the problem is confirmed, and do not disrupt the live site or publish anything
to it.

## What to expect

- This is a personal project with one maintainer,
  [Abduroziq Jabborov](https://github.com/blogchik). Every report is read and answered as soon
  as possible; there is no guaranteed response time.
- A confirmed problem is fixed on `dev`, merged into `main` and deployed, and you are told when
  the fix is live. Please keep the details private until then.
- There is no bug bounty or other paid reward.

## Safeguards already in place

- Dependabot alerts and security updates, plus weekly version updates for npm packages and
  GitHub Actions (`.github/dependabot.yml`).
- Secret scanning with push protection. The repository holds no secrets: environment files
  contain public values only.
- Workflows run with read-only `contents` permission, and every action is pinned to a commit
  SHA (the repository settings require it). The Cloudflare token is a secret of the `production`
  environment, which only `main` can use. It is read by one job that runs after all checks pass
  and builds nothing: it publishes the build the checks tested.
- CodeQL code scanning covers the JavaScript and TypeScript code and the workflows.
- Force pushes to `main` and `dev` and their deletion are blocked by a ruleset.
- New package versions are not installed until they are a day old (`minimumReleaseAge` in
  `pnpm-workspace.yaml`), and Dependabot waits three days before proposing one.
- `pnpm check:media`, part of `pnpm check`, fails the build when an image or video carries
  metadata (location, device, editor data, local paths).
- Response headers in `apps/web/public/_headers`: HSTS, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`.
- The content panel loads one script, pinned to an exact version and checked against its hash
  (Subresource Integrity), sees `packages/content` only, and re-encodes every uploaded picture
  in the browser, which drops its metadata before the file is committed.
