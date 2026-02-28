#!/usr/bin/env python3
"""
Read-only iCloud/Calendar pull for MindOS (via EventKit, not JXA).

Usage (defaults to next 7 days, Markdown, all calendars):
- `./scripts/calendar/pull_calendar.py`
- Change window: `./scripts/calendar/pull_calendar.py --days 3`
- JSON output: `./scripts/calendar/pull_calendar.py --format json`
- Restrict calendars: `./scripts/calendar/pull_calendar.py --calendars "Family/Home" "Family"`
- Anchor start date: `./scripts/calendar/pull_calendar.py --from-date 2025-11-17`

Fields captured: title, calendar name, start/end time, all-day flag, location, notes (if present).

Design: read-only. Uses Swift/EventKit to avoid the AppleScript timeouts we were seeing.
"""

import argparse
import datetime as dt
import json
import subprocess
import sys
from typing import List, Dict


SWIFT_SNIPPET = r'''
import Foundation
import EventKit

let fmt = ISO8601DateFormatter()
fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

guard let startISO = ProcessInfo.processInfo.environment["START_ISO"],
      let daysStr = ProcessInfo.processInfo.environment["DAYS"],
      let days = Int(daysStr) else {
  print("[]")
  exit(0)
}
let calFilter = ProcessInfo.processInfo.environment["CAL_FILTER"] ?? ""
let includeAll = (ProcessInfo.processInfo.environment["INCLUDE_ALL"] ?? "false") == "true"

guard let startDate = fmt.date(from: startISO) ?? ISO8601DateFormatter().date(from: startISO) else {
  print("[]")
  exit(0)
}
let endDate = Calendar.current.date(byAdding: .day, value: days, to: startDate)!

let store = EKEventStore()
let sem = DispatchSemaphore(value: 0)
var granted = false
store.requestAccess(to: .event) { ok, _ in
  granted = ok
  sem.signal()
}
sem.wait()
guard granted else {
  fputs("Error: Calendar access not granted\n", stderr)
  exit(1)
}

let filters = calFilter.split(separator: "|").map { String($0) }.filter { !$0.isEmpty }
let calendars = store.calendars(for: .event).filter { cal in
  if filters.isEmpty { return true }
  return filters.contains(cal.title)
}

let predicate = store.predicateForEvents(withStart: startDate, end: endDate, calendars: calendars)
let events = store.events(matching: predicate).sorted { $0.startDate < $1.startDate }

let df = ISO8601DateFormatter()
df.formatOptions = [.withInternetDateTime]

let payload: [[String: Any]] = events.map { ev in
  return [
    "calendar": ev.calendar.title,
    "title": ev.title ?? "",
    "location": ev.location ?? "",
    "notes": ev.notes ?? "",
    "start": df.string(from: ev.startDate),
    "end": df.string(from: ev.endDate),
    "all_day": ev.isAllDay
  ]
}

if let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
   let out = String(data: data, encoding: .utf8) {
  print(out)
} else {
  print("[]")
}
'''


def fetch_events(days: int, include_all: bool, calendars: List[str], start_iso: str) -> List[Dict]:
    env = {
        "START_ISO": start_iso,
        "DAYS": str(days),
        "CAL_FILTER": "|".join(calendars),
        "INCLUDE_ALL": "true" if include_all else "false",
        **{k: v for k, v in dict(**dict()).items()},
    }
    result = subprocess.run(
        ["swift", "-"], input=SWIFT_SNIPPET, text=True, capture_output=True, env=env
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "Failed to fetch events")
    return json.loads(result.stdout or "[]")


def parse_iso(s: str) -> dt.datetime:
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def format_markdown(events: List[Dict]) -> str:
    if not events:
        return "# Calendar Agenda\n\n_No events in range._\n"
    events = sorted(events, key=lambda e: e["start"])
    lines = ["# Calendar Agenda", ""]
    current_date = None
    for ev in events:
        start = parse_iso(ev["start"]).astimezone()
        end = parse_iso(ev["end"]).astimezone()
        date_str = start.strftime("%Y-%m-%d (%a)")
        if date_str != current_date:
            lines.extend(["", f"## {date_str}"])
            current_date = date_str
        time_str = "All day" if ev.get("all_day") else f"{start:%H:%M}–{end:%H:%M}"
        loc = f" @ {ev['location']}" if ev.get("location") else ""
        cal = f" [{ev['calendar']}]" if ev.get("calendar") else ""
        lines.append(f"- {time_str}{cal}: {ev['title']}{loc}")
    lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Pull Calendar agenda (read-only).")
    parser.add_argument("--days", type=int, default=7, help="Days after start to include (default 7)")
    parser.add_argument(
        "--format", choices=["markdown", "json"], default="markdown", help="Output format"
    )
    parser.add_argument(
        "--calendars",
        nargs="*",
        default=[],
        help="Restrict to calendar names (default: all).",
    )
    parser.add_argument(
        "--from-date",
        dest="from_date",
        help="ISO date (YYYY-MM-DD) to start the window; default is now.",
    )
    parser.add_argument(
        "--include-all",
        action="store_true",
        help="Include all calendars (default true; kept for compatibility)",
    )
    args = parser.parse_args()

    if args.from_date:
        try:
            start_dt = dt.datetime.fromisoformat(args.from_date)
            if start_dt.tzinfo is None:
                start_dt = start_dt.astimezone()
        except Exception:
            sys.stderr.write("Error: --from-date must be ISO like 2025-11-17\n")
            sys.exit(1)
    else:
        start_dt = dt.datetime.now().astimezone()
    start_iso = start_dt.isoformat()

    try:
        events = fetch_events(args.days, args.include_all, args.calendars, start_iso)
    except Exception as exc:
        sys.stderr.write(f"Error: {exc}\n")
        sys.exit(1)

    if args.format == "json":
        json.dump(events, sys.stdout, indent=2)
        sys.stdout.write("\n")
    else:
        sys.stdout.write(format_markdown(events))


if __name__ == "__main__":
    main()
