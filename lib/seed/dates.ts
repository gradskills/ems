// Relative date helpers so the seeded data always looks "current"
const DAY = 86400000;
const HOUR = 3600000;

export function daysAgo(n: number) {
  return new Date(Date.now() - n * DAY).toISOString();
}
export function daysFromNow(n: number) {
  return new Date(Date.now() + n * DAY).toISOString();
}
export function hoursAgo(n: number) {
  return new Date(Date.now() - n * HOUR).toISOString();
}
export function hoursFromNow(n: number) {
  return new Date(Date.now() + n * HOUR).toISOString();
}
/** today at a given hour:minute, local */
export function todayAt(hour: number, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
