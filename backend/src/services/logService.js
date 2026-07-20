/**
 * In-memory circular log buffer (max 500 entries).
 * Captures HTTP requests and application-level errors/warnings/info.
 *
 * Exported API:
 *   pushLog(entry)                          – add to circular buffer
 *   getLogs({ level, limit, offset, search }) – paginate + filter
 *   getLogStats()                           – aggregate counters
 */

const MAX_ENTRIES = 500;

/** @type {Array<Object>} */
const buffer = [];
let nextId = 1;

// ── Circular buffer helpers ───────────────────────────────────────────────────

/**
 * Add an entry to the circular buffer.
 * When the buffer reaches MAX_ENTRIES the oldest entry is evicted.
 *
 * @param {Object} entry
 * @param {'request'|'error'|'warn'|'info'} entry.level
 * @param {string}  [entry.method]
 * @param {string}  [entry.url]
 * @param {number}  [entry.status]
 * @param {number}  [entry.duration]   – milliseconds
 * @param {string}  [entry.ip]
 * @param {string}  [entry.userAgent]
 * @param {string}  [entry.message]
 * @param {string}  [entry.stack]
 * @param {string}  [entry.timestamp]  – ISO-8601; defaults to now
 */
export function pushLog(entry) {
  const record = {
    id:        nextId++,
    level:     entry.level     ?? "info",
    timestamp: entry.timestamp ?? new Date().toISOString(),
    method:    entry.method    ?? null,
    url:       entry.url       ?? null,
    status:    entry.status    ?? null,
    duration:  entry.duration  ?? null,
    ip:        entry.ip        ?? null,
    userAgent: entry.userAgent ?? null,
    message:   entry.message   ?? null,
    stack:     entry.stack     ?? null,
  };

  if (buffer.length >= MAX_ENTRIES) {
    buffer.shift(); // evict oldest
  }
  buffer.push(record);
}

// ── Query helpers ─────────────────────────────────────────────────────────────

/**
 * Return a paginated, optionally-filtered slice of the buffer.
 * Results are newest-first.
 *
 * @param {Object}  opts
 * @param {string}  [opts.level]   – filter by log level
 * @param {number}  [opts.limit=100]
 * @param {number}  [opts.offset=0]
 * @param {string}  [opts.search]  – case-insensitive substring match on url + message
 * @returns {{ logs: Object[], total: number }}
 */
export function getLogs({ level, limit = 100, offset = 0, search } = {}) {
  const safeLimit  = Math.max(1, Math.min(Number(limit)  || 100, 500));
  const safeOffset = Math.max(0, Number(offset) || 0);

  // Work newest-first
  let items = [...buffer].reverse();

  if (level) {
    items = items.filter(e => e.level === level);
  }

  if (search) {
    const lc = search.toLowerCase();
    items = items.filter(e =>
      (e.url     && e.url.toLowerCase().includes(lc)) ||
      (e.message && e.message.toLowerCase().includes(lc)) ||
      (e.ip      && e.ip.toLowerCase().includes(lc))
    );
  }

  const total = items.length;
  const logs  = items.slice(safeOffset, safeOffset + safeLimit);

  return { logs, total };
}

/**
 * Compute aggregate counters over the entire buffer.
 *
 * @returns {{ total: number, errors: number, warnings: number, requests: number, errorRate: number }}
 */
export function getLogStats() {
  const total    = buffer.length;
  const errors   = buffer.filter(e => e.level === "error").length;
  const warnings = buffer.filter(e => e.level === "warn").length;
  const requests = buffer.filter(e => e.level === "request").length;
  const errorRate = requests > 0 ? parseFloat(((errors / requests) * 100).toFixed(2)) : 0;

  return { total, errors, warnings, requests, errorRate };
}

// ── Clear buffer (admin use) ──────────────────────────────────────────────────

/**
 * Drain the circular buffer.
 * @returns {number} number of entries removed
 */
export function clearLogs() {
  const count = buffer.length;
  buffer.length = 0;
  return count;
}
