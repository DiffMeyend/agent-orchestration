#!/usr/bin/env swift
import Foundation
import EventKit

struct Args {
    var list = "Groceries"
    var title: String = ""
    var notes: String?
    var due: Date?
    var priority: Int?
    var complete = false
    var delete = false
    var id: String?
}

func parseISODate(_ s: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = formatter.date(from: s) { return d }
    formatter.formatOptions = [.withInternetDateTime]
    return formatter.date(from: s)
}

func parseArgs() -> Args {
    var args = Args()
    var iter = CommandLine.arguments.dropFirst().makeIterator()
    while let arg = iter.next() {
        switch arg {
        case "--list": args.list = iter.next() ?? args.list
        case "--title": args.title = iter.next() ?? ""
        case "--notes": args.notes = iter.next()
        case "--due":
            if let v = iter.next(), let d = parseISODate(v) { args.due = d }
        case "--priority":
            if let v = iter.next(), let p = Int(v) { args.priority = p }
        case "--complete": args.complete = true
        case "--delete": args.delete = true
        case "--id": args.id = iter.next()
        default: break
        }
    }
    return args
}

func requestAccess(_ store: EKEventStore) {
    let sem = DispatchSemaphore(value: 0)
    if #available(macOS 12.0, *) {
        store.requestFullAccessToReminders { granted, err in
            if !granted {
                fputs("Access to Reminders not granted. Enable in System Settings > Privacy & Security > Reminders.\n", stderr)
                exit(1)
            }
            if let err = err {
                fputs("Access error: \(err.localizedDescription)\n", stderr)
                exit(1)
            }
            sem.signal()
        }
    } else {
        store.requestAccess(to: .reminder) { granted, err in
            if !granted {
                fputs("Access to Reminders not granted. Enable in System Settings > Privacy & Security > Reminders.\n", stderr)
                exit(1)
            }
            if let err = err {
                fputs("Access error: \(err.localizedDescription)\n", stderr)
                exit(1)
            }
            sem.signal()
        }
    }
    sem.wait()
}

func main() {
    var args = parseArgs()
    let store = EKEventStore()
    requestAccess(store)

    let calendars = store.calendars(for: .reminder)
    guard let targetCal = calendars.first(where: { $0.title == args.list }) else {
        let available = calendars.map { $0.title }.joined(separator: ", ")
        fputs("List '\(args.list)' not found. Available: \(available)\n", stderr)
        exit(1)
    }

    if let id = args.id, (args.complete || args.delete) {
        guard let reminder = store.calendarItem(withIdentifier: id) as? EKReminder else {
            fputs("Reminder with id \(id) not found.\n", stderr)
            exit(1)
        }
        if args.delete {
            do {
                try store.remove(reminder, commit: true)
                print("Deleted \(id)")
            } catch {
                fputs("Delete failed: \(error.localizedDescription)\n", stderr)
                exit(1)
            }
            return
        }
        if args.complete {
            reminder.isCompleted = true
            reminder.completionDate = Date()
            do {
                try store.save(reminder, commit: true)
                print("Completed \(id)")
            } catch {
                fputs("Complete failed: \(error.localizedDescription)\n", stderr)
                exit(1)
            }
            return
        }
    }

    guard !args.title.isEmpty else {
        fputs("Title is required for add.\n", stderr)
        exit(1)
    }

    let reminder = EKReminder(eventStore: store)
    reminder.calendar = targetCal
    reminder.title = args.title
    if let notes = args.notes { reminder.notes = notes }
    if let due = args.due {
        reminder.dueDateComponents = Calendar.current.dateComponents(in: TimeZone.current, from: due)
    }
    if let priority = args.priority { reminder.priority = priority }

    do {
        try store.save(reminder, commit: true)
        print(reminder.calendarItemIdentifier)
    } catch {
        fputs("Save failed: \(error.localizedDescription)\n", stderr)
        exit(1)
    }
}

main()
