export function getTracePath(batchId: string) {
  return `/trace/${encodeURIComponent(batchId)}`;
}

export function getAbsoluteTraceUrl(batchId: string, origin?: string) {
  const path = getTracePath(batchId);

  if (origin) {
    return `${origin}${path}`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }

  return path;
}
