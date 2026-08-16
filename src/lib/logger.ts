type LogContext = Record<string, string | number | boolean | null | undefined>;

export function logServerError(event: string, error: unknown, context: LogContext = {}) {
  console.error(JSON.stringify({ level: "error", event, context, error: error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) }, timestamp: new Date().toISOString() }));
}

export function logServerEvent(event: string, context: LogContext = {}) {
  console.info(JSON.stringify({ level: "info", event, context, timestamp: new Date().toISOString() }));
}
