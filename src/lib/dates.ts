// Today's date in Nepal as a UTC-midnight Date (matches Prisma @db.Date values)
export function todayNepal(): Date {
  const ymd = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kathmandu" });
  return new Date(`${ymd}T00:00:00Z`);
}

export function daysUntil(endDate: Date, from: Date = todayNepal()): number {
  return Math.round((endDate.getTime() - from.getTime()) / 86400000);
}