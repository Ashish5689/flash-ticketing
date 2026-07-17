const dayMs = 86_400_000;

export function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  return new Date(value.getTime() + days * dayMs).toISOString().slice(0, 10);
}

export function formatDateChip(date: string) {
  const value = new Date(`${date}T00:00:00`);
  return {
    weekday: value.toLocaleDateString(undefined, { weekday: 'short' }),
    day: value.toLocaleDateString(undefined, { day: 'numeric' }),
    month: value.toLocaleDateString(undefined, { month: 'short' }),
  };
}
