const indiaTimeZone = 'Asia/Kolkata';
const dayMs = 24 * 60 * 60 * 1000;

export function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: indiaTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function indiaDayRange(date = todayInIndia()) {
  const start = new Date(`${date}T00:00:00+05:30`);
  return { start, end: new Date(start.getTime() + dayMs), date };
}

export function addIndiaDays(date: string, days: number) {
  const start = new Date(`${date}T00:00:00Z`);
  return new Date(start.getTime() + days * dayMs).toISOString().slice(0, 10);
}

export function inclusiveIndiaDateRange(dateFrom: string, dateTo: string) {
  return {
    start: indiaDayRange(dateFrom).start,
    end: indiaDayRange(addIndiaDays(dateTo, 1)).start,
  };
}

export function indiaDateValue(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: indiaTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

export function buildIndiaDateCounts(values: Date[], from: string, days: number) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const date = indiaDateValue(value);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, index) => {
    const date = addIndiaDays(from, index);
    return { date, showCount: counts.get(date) ?? 0 };
  });
}
