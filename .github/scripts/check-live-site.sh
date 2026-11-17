#!/usr/bin/env bash
# Checks the live site, https://abduroziq.uz:
#
# - with a commit SHA as the argument, that /version.txt names it, so the site serves that build
#   (the CI workflow stamps every build with its commit and runs this right after the deploy);
# - that the main pages, the feeds, the sitemap and robots.txt answer 200;
# - that a missing page answers with a real 404;
# - that www and plain http redirect (301) to the canonical https://abduroziq.uz address.
#
#   bash .github/scripts/check-live-site.sh [commit-sha]
#
# Every problem is reported as an error annotation; the script fails at the end if there was any.
set -euo pipefail

origin="https://abduroziq.uz"
expected="${1:-}"
problems=0

problem() {
  echo "::error title=Live site::$1"
  problems=$((problems + 1))
}

# Prints the HTTP status and the redirect target of one request (000 when there is no answer).
probe() {
  curl --silent --output /dev/null --max-time 20 --write-out '%{http_code} %{redirect_url}' "$1" ||
    true
}

if [ -n "$expected" ]; then
  # A new version reaches every Cloudflare location within seconds: try for about a minute.
  live=""
  for attempt in $(seq 1 12); do
    live="$(curl --silent --fail --max-time 10 "$origin/version.txt" || true)"
    live="${live%%[[:space:]]*}"
    if [ "$live" = "$expected" ]; then
      break
    fi
    sleep 5
  done
  if [ "$live" = "$expected" ]; then
    echo "The live site serves $expected."
  else
    problem "/version.txt names '${live:-nothing}', not this build ($expected)."
  fi
fi

for path in / /uz/ /blog/ /uz/blog/ /projects/ /uz/projects/ /rss.xml /uz/rss.xml \
  /sitemap-index.xml /robots.txt; do
  read -r status _ <<<"$(probe "$origin$path")"
  if [ "$status" = "200" ]; then
    echo "200 $path"
  else
    problem "$path answered $status, not 200."
  fi
done

read -r status _ <<<"$(probe "$origin/this-page-does-not-exist/")"
if [ "$status" = "404" ]; then
  echo "404 for a missing page"
else
  problem "A missing page answered $status, not 404."
fi

check_redirect() {
  local from="$1" to="$2" status target
  read -r status target <<<"$(probe "$from")"
  if [ "$status" = "301" ] && [ "$target" = "$to" ]; then
    echo "301 $from -> $to"
  else
    problem "$from answered $status ${target:-without a redirect}, not 301 to $to."
  fi
}
check_redirect "https://www.abduroziq.uz/blog/" "$origin/blog/"
check_redirect "http://abduroziq.uz/" "$origin/"

if [ "$problems" -gt 0 ]; then
  echo "$problems problem(s) on the live site."
  exit 1
fi
echo "The live site answers as it should."
