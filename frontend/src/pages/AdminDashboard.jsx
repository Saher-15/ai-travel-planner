import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import {
  Users, Map, MessageSquare, TrendingUp,
  Hotel, Star, ExternalLink, BarChart3,
  Terminal, RefreshCw, Trash2, Search,
  Activity, Database, Clock, AlertCircle, CheckCircle,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────
function fmt(n) { return n?.toLocaleString() ?? "–"; }

function Badge({ children, color = "slate" }) {
  const cls = {
    slate:  "bg-slate-100  text-slate-700",
    sky:    "bg-sky-100    text-sky-700",
    green:  "bg-green-100  text-green-700",
    amber:  "bg-amber-100  text-amber-700",
    rose:   "bg-rose-100   text-rose-700",
    purple: "bg-purple-100 text-purple-700",
    indigo: "bg-indigo-100 text-indigo-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls[color] ?? cls.slate}`}>
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = "sky" }) {
  const cls = {
    sky:    "bg-sky-50    text-sky-600",
    green:  "bg-green-50  text-green-600",
    amber:  "bg-amber-50  text-amber-600",
    rose:   "bg-rose-50   text-rose-600",
    purple: "bg-purple-50 text-purple-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-slate-500 truncate">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">{fmt(value)}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={`shrink-0 rounded-xl p-3 ${cls[color] ?? cls.sky}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, color = "bg-sky-500", label = "count" }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-px h-20">
      {data.map((d, i) => (
        <div
          key={i}
          title={`${d.date}: ${d.count} ${label}`}
          className={`flex-1 rounded-sm ${color} opacity-75 hover:opacity-100 transition-opacity`}
          style={{ height: `${Math.max(d.count > 0 ? (d.count / max) * 100 : 0, d.count > 0 ? 3 : 0.5)}%` }}
        />
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

// ─── Log level badge ─────────────────────────────────────
const LOG_LEVEL_COLOR = { error: "rose", warn: "amber", request: "sky", info: "slate" };
function LevelBadge({ level }) {
  return <Badge color={LOG_LEVEL_COLOR[level] ?? "slate"}>{level}</Badge>;
}

// ─── Time formatter ──────────────────────────────────────
function fmtTime(ts) {
  if (!ts) return "–";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtUptime(seconds) {
  if (seconds == null) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const MONGO_LABEL = { 0: "Disconnected", 1: "Connected", 2: "Connecting", 3: "Disconnecting" };
const MONGO_COLOR = { 0: "text-rose-600", 1: "text-green-600", 2: "text-amber-600", 3: "text-amber-600" };

// ─── Page ───────────────────────────────────────────────
export default function AdminDashboard() {
  // ── Existing stats state ──
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // ── Health state ──
  const [health, setHealth]           = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // ── Logs state ──
  const [logs, setLogs]               = useState([]);
  const [logStats, setLogStats]       = useState(null);
  const [logTotal, setLogTotal]       = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logLevel, setLogLevel]       = useState("");        // "" = All
  const [logSearch, setLogSearch]     = useState("");
  const [logOffset, setLogOffset]     = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef                = useRef(null);

  // ── Trip search state ──
  const [tripSearch, setTripSearch]   = useState("");
  const [tripResults, setTripResults] = useState(null);    // null = never searched
  const [tripLoading, setTripLoading] = useState(false);
  const tripDebounceRef               = useRef(null);

  // ── Initial stats load ──
  useEffect(() => {
    document.title = "Admin Dashboard – Travel Planner";
    api.get("/admin/stats")
      .then(r => setStats(r.data))
      .catch(e => setError(e?.response?.data?.message || "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  // ── Health: fetch once, then every 30s ──
  useEffect(() => {
    let mounted = true;
    function fetchHealth() {
      setHealthLoading(true);
      api.get("/admin/health")
        .then(r => { if (mounted) setHealth(r.data); })
        .catch(() => {})
        .finally(() => { if (mounted) setHealthLoading(false); });
    }
    fetchHealth();
    const id = setInterval(fetchHealth, 30_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // ── Logs fetch (resets when level changes) ──
  function fetchLogs(offset = 0, append = false) {
    setLogsLoading(true);
    const params = { limit: 100, offset };
    if (logLevel) params.level = logLevel;
    api.get("/admin/logs", { params })
      .then(r => {
        const data = r.data;
        setLogs(prev => append ? [...prev, ...(data.logs ?? [])] : (data.logs ?? []));
        setLogStats(data.stats ?? null);
        setLogTotal(data.total ?? 0);
        setLogOffset(offset);
      })
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }

  // Reload logs when tab changes
  useEffect(() => {
    fetchLogs(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logLevel]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => fetchLogs(0, false), 5_000);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, logLevel]);

  function clearLogs() {
    if (!window.confirm("Clear all logs from the in-memory buffer? This cannot be undone.")) return;
    api.delete("/admin/logs")
      .then(() => { setLogs([]); setLogStats(null); setLogTotal(0); })
      .catch(() => {});
  }

  // ── Trip search: debounced 300ms ──
  useEffect(() => {
    clearTimeout(tripDebounceRef.current);
    if (!tripSearch.trim()) { setTripResults(null); return; }
    tripDebounceRef.current = setTimeout(() => {
      setTripLoading(true);
      api.get("/admin/trips/search", { params: { q: tripSearch.trim(), limit: 20 } })
        .then(r => setTripResults(r.data.trips ?? []))
        .catch(() => setTripResults([]))
        .finally(() => setTripLoading(false));
    }, 300);
    return () => clearTimeout(tripDebounceRef.current);
  }, [tripSearch]);

  // ── Client-side log filter ──
  const visibleLogs = logSearch.trim()
    ? logs.filter(l =>
        (l.message ?? "").toLowerCase().includes(logSearch.toLowerCase()) ||
        (l.url ?? "").toLowerCase().includes(logSearch.toLowerCase()) ||
        (l.method ?? "").toLowerCase().includes(logSearch.toLowerCase())
      )
    : logs;

  // ── Full-page states ──
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-rose-600 font-medium">{error}</p>
      </div>
    );
  }

  const { users, trips, messages } = stats;

  const BUDGET_COLOR = { low: "green", mid: "sky", high: "purple" };
  const PACE_COLOR   = { relaxed: "green", moderate: "sky", packed: "amber" };

  const LOG_TABS = [
    { key: "",        label: "All" },
    { key: "request", label: "Requests" },
    { key: "error",   label: "Errors" },
    { key: "warn",    label: "Warnings" },
    { key: "info",    label: "Info" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link
          to="/admin/contacts"
          className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
        >
          <MessageSquare size={15} />
          Messages
          {messages.unread > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-xs font-bold leading-none">
              {messages.unread}
            </span>
          )}
        </Link>
      </div>

      {/* ── A. Server Health Widget ── */}
      <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Activity size={14} />
            Server Health
          </div>
          {healthLoading && !health ? (
            <span className="text-xs text-slate-400 animate-pulse">Checking…</span>
          ) : health ? (
            <>
              {/* Uptime */}
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                <span className="text-xs text-slate-500">Uptime</span>
                <span className="text-sm font-semibold text-slate-700">{fmtUptime(health.uptime)}</span>
              </div>

              {/* Memory */}
              <div className="flex items-center gap-1.5">
                <Database size={14} className="text-slate-400" />
                <span className="text-xs text-slate-500">Memory</span>
                <span className="text-sm font-semibold text-slate-700">{health.memoryMB ?? "–"} MB</span>
              </div>

              {/* MongoDB */}
              <div className="flex items-center gap-1.5">
                {health.mongoState === 1
                  ? <CheckCircle size={14} className="text-green-500" />
                  : <AlertCircle size={14} className="text-rose-500" />
                }
                <span className="text-xs text-slate-500">MongoDB</span>
                <span className={`text-sm font-semibold ${MONGO_COLOR[health.mongoState] ?? "text-slate-700"}`}>
                  {MONGO_LABEL[health.mongoState] ?? "Unknown"}
                </span>
              </div>

              {/* Last checked */}
              <span className="ml-auto text-xs text-slate-400">
                Refreshes every 30s · last {fmtTime(health.timestamp)}
              </span>
            </>
          ) : (
            <span className="text-xs text-rose-500">Could not reach health endpoint</span>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users}         label="Total Users"       value={users.total}    sub={`+${users.today} today`}     color="sky"    />
        <StatCard icon={Map}           label="Total Trips"       value={trips.total}    sub={`+${trips.today} today`}     color="green"  />
        <StatCard icon={TrendingUp}    label="Trips This Week"   value={trips.week}     sub="last 7 days"                 color="indigo" />
        <StatCard icon={Users}         label="New Users / Month" value={users.month}    sub="last 30 days"                color="purple" />
        <StatCard icon={BarChart3}     label="Trips / Month"     value={trips.month}    sub="last 30 days"                color="rose"   />
        <StatCard icon={MessageSquare} label="Messages"          value={messages.total} sub={`${messages.unread} unread`} color="amber"  />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Trip Trends — last 30 days">
          <BarChart data={trips.trends} color="bg-sky-500" label="trips" />
          <p className="mt-2 text-xs text-slate-400">
            {trips.trends.reduce((s, d) => s + d.count, 0)} trips in this period
          </p>
        </Section>
        <Section title="User Sign-ups — last 30 days">
          <BarChart data={users.growth} color="bg-emerald-500" label="users" />
          <p className="mt-2 text-xs text-slate-400">
            {users.growth.reduce((s, d) => s + d.count, 0)} users registered in this period
          </p>
        </Section>
      </div>

      {/* Top Destinations + Budget + Pace */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Section title="Top Destinations">
            {trips.topDestinations.length === 0 ? (
              <p className="text-sm text-slate-400">No trips yet.</p>
            ) : (
              <div className="space-y-3">
                {trips.topDestinations.map((d, i) => {
                  const pct = trips.total > 0 ? Math.round((d.count / trips.total) * 100) : 0;
                  return (
                    <div key={d._id} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-xs font-bold text-slate-400">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700 truncate">{d._id || "Unknown"}</span>
                          <span className="text-xs text-slate-400 ml-2 shrink-0">{d.count} trips · {pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div className="h-1.5 rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Budget Split">
            <div className="space-y-2">
              {trips.budgetBreakdown.map(b => (
                <div key={b._id} className="flex items-center justify-between">
                  <Badge color={BUDGET_COLOR[b._id] ?? "slate"}>{b._id || "–"}</Badge>
                  <span className="text-sm font-semibold text-slate-700">{fmt(b.count)}</span>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Travel Pace">
            <div className="space-y-2">
              {trips.paceBreakdown.map(p => (
                <div key={p._id} className="flex items-center justify-between">
                  <Badge color={PACE_COLOR[p._id] ?? "slate"}>{p._id || "–"}</Badge>
                  <span className="text-sm font-semibold text-slate-700">{fmt(p.count)}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* Affiliate Links */}
      <Section title="Affiliate & Analytics Dashboards">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              href: "https://www.travelpayouts.com/statistics",
              icon: Hotel,
              label: "Travelpayouts",
              sub: "Hotels · Flights · Cars",
              hover: "hover:border-sky-300 hover:bg-sky-50",
              iconCls: "bg-sky-100 text-sky-600",
              arrowCls: "group-hover:text-sky-600",
            },
            {
              href: "https://www.viator.com/affiliate-dashboard/",
              icon: Star,
              label: "Viator",
              sub: "Tours · Attractions",
              hover: "hover:border-emerald-300 hover:bg-emerald-50",
              iconCls: "bg-emerald-100 text-emerald-600",
              arrowCls: "group-hover:text-emerald-600",
            },
            {
              href: "https://analytics.google.com",
              icon: TrendingUp,
              label: "Google Analytics",
              sub: "Traffic · Behavior · Events",
              hover: "hover:border-orange-300 hover:bg-orange-50",
              iconCls: "bg-orange-100 text-orange-600",
              arrowCls: "group-hover:text-orange-600",
            },
          ].map(({ href, icon: Icon, label, sub, hover, iconCls, arrowCls }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors group ${hover}`}
            >
              <div className={`shrink-0 rounded-lg p-2.5 ${iconCls}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <p className="text-xs text-slate-500 truncate">{sub}</p>
              </div>
              <ExternalLink size={14} className={`shrink-0 text-slate-300 transition-colors ${arrowCls}`} />
            </a>
          ))}
        </div>
      </Section>

      {/* Recent Users + Recent Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Recent Users">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.recent.map(u => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-slate-700 truncate max-w-40">{u.name}</div>
                      <div className="text-xs text-slate-400 truncate max-w-40">{u.email}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge color={u.role === "admin" ? "rose" : "slate"}>{u.role}</Badge>
                    </td>
                    <td className="py-2 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Recent Trips">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="pb-2 font-medium">Destination</th>
                  <th className="pb-2 font-medium">Budget</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {trips.recent.map(t => (
                  <tr key={t._id} className="hover:bg-slate-50">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-slate-700 truncate max-w-40">{t.destination || "–"}</div>
                      <div className="text-xs text-slate-400 truncate max-w-40">{t.userId?.name || "–"}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge color={BUDGET_COLOR[t.preferences?.budget] ?? "slate"}>
                        {t.preferences?.budget || "–"}
                      </Badge>
                    </td>
                    <td className="py-2 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      {/* ── B. Trip Search Panel ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Trip Search</h3>

        {/* Search input */}
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={tripSearch}
            onChange={e => setTripSearch(e.target.value)}
            placeholder="Search by destination, e.g. Japan…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition"
          />
          {tripLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
          )}
        </div>

        {/* Results */}
        <div className="mt-4">
          {tripResults === null && !tripSearch.trim() && (
            <p className="text-sm text-slate-400">Type a destination to search across all trips.</p>
          )}

          {tripResults !== null && tripResults.length === 0 && !tripLoading && (
            <p className="text-sm text-slate-400">No trips found for "{tripSearch}".</p>
          )}

          {tripResults !== null && tripResults.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                    <th className="pb-2 font-medium">Destination</th>
                    <th className="pb-2 font-medium">Dates</th>
                    <th className="pb-2 font-medium">Travelers</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tripResults.map(t => {
                    const start = t.startDate ? new Date(t.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "–";
                    const end   = t.endDate   ? new Date(t.endDate).toLocaleDateString("en-US",   { month: "short", day: "numeric", year: "2-digit" }) : "–";
                    const travelers = t.preferences?.travelers ?? t.preferences?.travelerCount ?? "–";
                    return (
                      <tr key={t._id} className="hover:bg-slate-50">
                        <td className="py-2 pr-4">
                          <span className="font-medium text-slate-700 truncate block max-w-48">{t.destination || "–"}</span>
                        </td>
                        <td className="py-2 pr-4 text-xs text-slate-500 whitespace-nowrap">{start} → {end}</td>
                        <td className="py-2 pr-4 text-xs text-slate-600">{travelers}</td>
                        <td className="py-2 pr-4">
                          <Badge color={t.status === "completed" ? "green" : t.status === "active" ? "sky" : "slate"}>
                            {t.status || "–"}
                          </Badge>
                        </td>
                        <td className="py-2 text-xs text-slate-500 whitespace-nowrap">
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "–"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── C. Server Logs Viewer ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">

        {/* Section header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Terminal size={13} />
            Server Logs
          </h3>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(v => !v)}
              title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh (5s)"}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                autoRefresh
                  ? "bg-sky-100 text-sky-700 hover:bg-sky-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <RefreshCw size={12} className={autoRefresh ? "animate-spin" : ""} />
              {autoRefresh ? "Auto-refresh on" : "Auto-refresh"}
            </button>

            {/* Manual refresh */}
            <button
              onClick={() => fetchLogs(0, false)}
              disabled={logsLoading}
              title="Refresh now"
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={12} className={logsLoading ? "animate-spin" : ""} />
              Refresh
            </button>

            {/* Clear logs */}
            <button
              onClick={clearLogs}
              className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
            >
              <Trash2 size={12} />
              Clear Logs
            </button>
          </div>
        </div>

        {/* Log stats row */}
        {logStats && (
          <div className="flex flex-wrap gap-4 mb-4 p-3 rounded-xl bg-slate-50">
            <div className="text-xs text-slate-500">
              Requests: <span className="font-semibold text-slate-700">{fmt(logStats.requests)}</span>
            </div>
            <div className="text-xs text-slate-500">
              Errors: <span className="font-semibold text-rose-600">{fmt(logStats.errors)}</span>
            </div>
            <div className="text-xs text-slate-500">
              Warnings: <span className="font-semibold text-amber-600">{fmt(logStats.warnings)}</span>
            </div>
            <div className="text-xs text-slate-500">
              Error rate: <span className={`font-semibold ${(logStats.errorRate ?? 0) > 5 ? "text-rose-600" : "text-slate-700"}`}>
                {logStats.errorRate != null ? `${logStats.errorRate.toFixed(1)}%` : "–"}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Total buffered: <span className="font-semibold text-slate-700">{fmt(logStats.total)}</span>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 mb-3 border-b border-slate-100 pb-0">
          {LOG_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setLogLevel(tab.key); setLogSearch(""); }}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors -mb-px ${
                logLevel === tab.key
                  ? "border border-b-white border-slate-200 bg-white text-sky-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Log search */}
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={logSearch}
            onChange={e => setLogSearch(e.target.value)}
            placeholder="Filter by message, URL, or method…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 transition"
          />
          {logSearch && (
            <button
              onClick={() => setLogSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>

        {/* Log table */}
        <div className="overflow-x-auto">
          <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-100">
            {logsLoading && logs.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
              </div>
            ) : visibleLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                <Terminal size={24} className="mb-2 opacity-40" />
                <p className="text-sm">
                  {logSearch ? "No logs match your filter." : "No logs in buffer yet."}
                </p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b border-slate-100 text-left text-slate-400">
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Time</th>
                    <th className="px-3 py-2 font-medium">Level</th>
                    <th className="px-3 py-2 font-medium">Request / Message</th>
                    <th className="px-3 py-2 font-medium text-right">Status</th>
                    <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-mono">
                  {visibleLogs.map((log, idx) => {
                    const requestLabel = log.method && log.url ? `${log.method} ${log.url}` : null;
                    const displayText  = requestLabel ?? log.message ?? "–";
                    const isError      = log.level === "error" || (log.status && log.status >= 500);
                    const isWarn       = log.level === "warn"  || (log.status && log.status >= 400 && log.status < 500);
                    return (
                      <tr
                        key={log.id ?? idx}
                        className={`transition-colors ${
                          isError ? "bg-rose-50/40 hover:bg-rose-50" :
                          isWarn  ? "bg-amber-50/30 hover:bg-amber-50" :
                                    "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{fmtTime(log.timestamp)}</td>
                        <td className="px-3 py-1.5"><LevelBadge level={log.level} /></td>
                        <td className="px-3 py-1.5 text-slate-600 max-w-xs truncate" title={displayText}>{displayText}</td>
                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                          {log.status ? (
                            <span className={`font-semibold ${
                              log.status >= 500 ? "text-rose-600" :
                              log.status >= 400 ? "text-amber-600" :
                              log.status >= 300 ? "text-sky-600" :
                                                  "text-slate-500"
                            }`}>
                              {log.status}
                            </span>
                          ) : "–"}
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-400 whitespace-nowrap">
                          {log.duration != null ? `${log.duration}ms` : "–"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pagination footer */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Showing {visibleLogs.length}{logSearch ? " (filtered)" : ""} of {logTotal} buffered{logLevel ? ` ${logLevel}` : ""} logs
          </p>
          {logs.length < logTotal && !logSearch && (
            <button
              onClick={() => fetchLogs(logOffset + 100, true)}
              disabled={logsLoading}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              {logsLoading ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-slate-700" />
              ) : null}
              Load more
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
