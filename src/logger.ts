function stamp(): string {
  return new Date().toISOString();
}

export function info(message: string, extra?: unknown): void {
  if (extra === undefined) {
    console.log(`[${stamp()}] INFO  ${message}`);
    return;
  }
  console.log(`[${stamp()}] INFO  ${message}`, extra);
}

export function warn(message: string, extra?: unknown): void {
  if (extra === undefined) {
    console.warn(`[${stamp()}] WARN  ${message}`);
    return;
  }
  console.warn(`[${stamp()}] WARN  ${message}`, extra);
}

export function error(message: string, extra?: unknown): void {
  if (extra === undefined) {
    console.error(`[${stamp()}] ERROR ${message}`);
    return;
  }
  console.error(`[${stamp()}] ERROR ${message}`, extra);
}
