// Only accept event names and an explicit allowlist of nonsensitive fields.
export function logEvent(event, fields = {}) {
  const allowed = ['requestId', 'status', 'method'];
  const safe = Object.fromEntries(allowed.filter(key => fields[key] !== undefined).map(key => [key, fields[key]]));
  console.log(JSON.stringify({ time: new Date().toISOString(), event, ...safe }));
}

