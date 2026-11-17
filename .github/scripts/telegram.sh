#!/usr/bin/env bash
# Sends one plain-text message to the Telegram chat of docs/DEPLOY.md, "Telegram notification".
#
#   TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... bash .github/scripts/telegram.sh "<text>"
#
# Without the two variables it does nothing. It never fails: a message is a courtesy and must
# not change the result of a run. Nothing Telegram answers is printed, because run logs are
# public and the answer names the chat. The text goes out as form data, so whatever it holds
# (a commit subject, for example) is never read as shell or as markup.
set -u

text="${1:?usage: telegram.sh <text>}"

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "Telegram secrets are not configured: no notification. See docs/DEPLOY.md."
  exit 0
fi

# sendMessage, parameters as application/x-www-form-urlencoded. No parse_mode: the text is
# plain, so nothing in it needs escaping. Up to three tries, in a loop: curl's own --retry gives
# up with "failed to truncate" when the output is /dev/null (seen with curl 8.5, the one in
# Ubuntu 24.04).
status=""
for attempt in 1 2 3; do
  if [ "$attempt" -gt 1 ]; then
    sleep 5
  fi
  status="$(
    curl --silent --output /dev/null --write-out '%{http_code}' --max-time 20 \
      --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
      --data-urlencode "text=$text" \
      --data-urlencode 'link_preview_options={"is_disabled":true}' \
      "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage"
  )" || true
  # Another try only helps after no answer (000), a rate limit or a server error.
  case "$status" in
    000 | 429 | 5??) ;;
    *) break ;;
  esac
done

if [ "$status" = "200" ]; then
  echo "Notification sent."
else
  echo "::warning title=Telegram notification not sent::HTTP status ${status:-000} from Telegram (000 means no answer). See docs/DEPLOY.md."
fi
exit 0
