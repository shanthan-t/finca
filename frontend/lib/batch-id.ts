export function createSuggestedBatchId(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  const serial = Math.floor(100 + Math.random() * 900);
  return `FINCA-${stamp}-${serial}`;
}
