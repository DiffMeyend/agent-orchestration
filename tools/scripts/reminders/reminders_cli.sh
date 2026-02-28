#!/usr/bin/env bash
# Simple Reminders CLI using AppleScript (Reminders.app) – defaults to "Groceries".
# Supports: add, complete, delete (by first matching title).

set -euo pipefail

LIST="Groceries"
ACTION=""
TITLE=""
NOTES=""
DUE=""
ALLOW_CREATE=false
SHOW_LISTS=false
ACCOUNT=""

usage() {
  cat <<EOF
Usage:
  $0 add --title "Buy milk" [--notes "2%"] [--due "2025-11-18 12:00"] [--list LIST]
  $0 complete --title "Buy milk" [--list LIST]
  $0 delete --title "Buy milk" [--list LIST]
  $0 --show-lists   # list available reminder lists
Options: --account NAME to target a specific account (optional)
Optional: --allow-create (only for add) will create list if missing.
EOF
  exit 1
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      add|complete|delete) ACTION="$1"; shift ;;
      --title) TITLE="${2:-}"; shift 2 ;;
      --notes) NOTES="${2:-}"; shift 2 ;;
      --due) DUE="${2:-}"; shift 2 ;;
      --list) LIST="${2:-}"; shift 2 ;;
      --allow-create) ALLOW_CREATE=true; shift ;;
      --show-lists) SHOW_LISTS=true; shift ;;
      --account) ACCOUNT="${2:-}"; shift 2 ;;
      *) usage ;;
    esac
  done
  if "$SHOW_LISTS"; then
    ACTION="show"
    return
  fi
  [[ -n "$ACTION" && -n "$TITLE" ]] || usage
}

show_lists() {
  local script="tell application \"Reminders\"
    set outText to \"\"
    repeat with acc in accounts
      set acctName to name of acc
      repeat with l in lists of acc
        set outText to outText & (name of l) & \" (\" & acctName & \")\" & linefeed
      end repeat
    end repeat
    return outText
  end tell"
  osascript -e "$script"
}

add_reminder() {
  local formatted_due=""
  if [[ -n "$DUE" ]]; then
    if ! formatted_due=$(date -j -f "%Y-%m-%d %H:%M" "$DUE" "+%A, %B %d, %Y %I:%M %p" 2>/dev/null); then
      echo "Invalid --due format. Use YYYY-MM-DD HH:MM" >&2
      exit 1
    fi
  fi
  local script="set targetList to missing value
set theDate to missing value
if \"$formatted_due\" is not \"\" then
  try
    set theDate to date \"$formatted_due\"
  on error
    set theDate to missing value
  end try
end if
tell application \"Reminders\"
  repeat with acc in accounts
    if \"$ACCOUNT\" is not \"\" and name of acc is not \"$ACCOUNT\" then
      -- skip
    else
      repeat with l in lists of acc
        if name of l is \"$LIST\" then
          set targetList to l
          exit repeat
        end if
      end repeat
    end if
    if targetList is not missing value then exit repeat
  end repeat
  if targetList is missing value then
    if $ALLOW_CREATE then
      set targetList to make new list with properties {name:\"$LIST\"}
    else
      error \"List $LIST not found\"
    end if
  end if
  if theDate is missing value then
    make new reminder at end of reminders of targetList with properties {name:\"$TITLE\", body:\"$NOTES\"}
  else
    make new reminder at end of reminders of targetList with properties {name:\"$TITLE\", body:\"$NOTES\", |remind me date|:theDate}
  end if
end tell"
  osascript -e "$script"
}

complete_reminder() {
  local script="with timeout of 5 seconds
  tell application \"Reminders\"
    set targetList to missing value
    repeat with acc in accounts
      repeat with l in lists of acc
        if name of l is \"$LIST\" then
          set targetList to l
          exit repeat
        end if
      end repeat
      if targetList is not missing value then exit repeat
    end repeat
    if targetList is missing value then error \"List $LIST not found\"
    set theRem to first reminder of targetList whose name is \"$TITLE\"
    set completed of theRem to true
  end tell
end timeout"
  osascript -e "$script"
}

delete_reminder() {
  local script="with timeout of 5 seconds
  tell application \"Reminders\"
    set targetList to missing value
    repeat with acc in accounts
      repeat with l in lists of acc
        if name of l is \"$LIST\" then
          set targetList to l
          exit repeat
        end if
      end repeat
      if targetList is not missing value then exit repeat
    end repeat
    if targetList is missing value then error \"List $LIST not found\"
    delete (first reminder of targetList whose name is \"$TITLE\")
  end tell
end timeout"
  osascript -e "$script"
}

parse_args "$@"
if "$SHOW_LISTS"; then
  show_lists
  exit 0
fi
case "$ACTION" in
  add)
    add_reminder ;;
  complete) complete_reminder ;;
  delete) delete_reminder ;;
  *) usage ;;
esac
