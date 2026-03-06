/** Celsius to Fahrenheit */
export function c2f(c: number): number {
  return Math.round(c * 9 / 5 + 32)
}

/** Format temp as "18°C (64°F)" */
export function formatTemp(c: number): string {
  return `${c}°C (${c2f(c)}°F)`
}
