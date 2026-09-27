/** Time-of-day greeting key. */
export function greetingKey() {
  const h = new Date().getHours();
  return h < 12 ? 'time.morning' : h < 18 ? 'time.afternoon' : 'time.evening';
}
