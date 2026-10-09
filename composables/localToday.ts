// Heutiges Datum in der Zeitzone des Browsers als 'YYYY-MM-DD'.
// (toISOString() rechnet in UTC – kurz nach Mitternacht wäre das noch „gestern".)
export function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
