type ZonedParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
};

type StartWindow = {from: number; until: number};

// Earliest clock time ("HH:mm", 24h) a shift may be started on its start day.
export function normalizeStartWorkAllowedFrom(value: unknown): string | null {
    if (value == null) return null;
    const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value).trim());
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
    return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function zonedParts(ms: number, timeZone: string): ZonedParts | null {
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(new Date(ms));
        const value = (type: string) => parts.find((part) => part.type === type)?.value;
        const hour = Number(value('hour'));
        return {
            year: Number(value('year')),
            month: Number(value('month')),
            day: Number(value('day')),
            hour: hour === 24 ? 0 : hour,
            minute: Number(value('minute')),
        };
    } catch {
        return null;
    }
}

function parseClock(time: string): {hour: number; minute: number} | null {
    const match = String(time).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return null;
    return {hour, minute};
}

function formatHm(ms: number): string {
    const date = new Date(ms);
    const hours = date.getUTCHours();
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${String(hour12).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

function sameUtcDay(left: number, right: number): boolean {
    const a = new Date(left);
    const b = new Date(right);
    return a.getUTCFullYear() === b.getUTCFullYear()
        && a.getUTCMonth() === b.getUTCMonth()
        && a.getUTCDate() === b.getUTCDate();
}

function windowOn(dayMs: number, startTime: string, endTime: string, allowedFrom: string): StartWindow | null {
    const start = parseClock(startTime);
    const end = parseClock(endTime);
    const allowed = parseClock(allowedFrom);
    if (!start || !end || !allowed) return null;

    const day = new Date(dayMs);
    const year = day.getUTCFullYear();
    const month = day.getUTCMonth();
    const date = day.getUTCDate();
    const startMs = Date.UTC(year, month, date, start.hour, start.minute);
    let until = Date.UTC(year, month, date, end.hour, end.minute);
    if (until <= startMs) {
        until = Date.UTC(year, month, date + 1, end.hour, end.minute);
    }

    const from = Date.UTC(year, month, date, allowed.hour, allowed.minute);
    if (from >= until) return null;
    return {from, until};
}

export function startWorkRestrictionMessage(input: {
    startTime?: string | null;
    endTime?: string | null;
    allowedFrom?: string | null;
    nowMs: number;
    timeZone: string;
}): string | null {
    const allowedFrom = normalizeStartWorkAllowedFrom(input.allowedFrom);
    if (allowedFrom == null) return null;
    if (!input.startTime || !input.endTime) return null;

    const nowParts = zonedParts(input.nowMs, input.timeZone);
    if (!nowParts) return null;

    const nowWall = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day, nowParts.hour, nowParts.minute);
    const windows = [-1, 0, 1]
        .map((offset) => windowOn(
            Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + offset),
            input.startTime as string,
            input.endTime as string,
            allowedFrom,
        ))
        .filter((item): item is StartWindow => item != null);

    if (windows.length === 0) return null;
    if (windows.some((item) => nowWall >= item.from && nowWall < item.until)) return null;

    const upcoming = windows
        .map((item) => item.from)
        .filter((from) => from > nowWall)
        .sort((a, b) => a - b)[0];
    const passedUntil = windows
        .map((item) => item.until)
        .filter((until) => until <= nowWall)
        .sort((a, b) => a - b)
        .at(-1);

    if (upcoming != null && (passedUntil == null || sameUtcDay(upcoming, nowWall))) {
        return `You can start work from ${formatHm(upcoming)}.`;
    }
    if (passedUntil != null) {
        return `You can start work until ${formatHm(passedUntil)}.`;
    }
    if (upcoming != null) {
        return `You can start work from ${formatHm(upcoming)}.`;
    }
    return null;
}
