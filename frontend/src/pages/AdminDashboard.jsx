import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import {
  Users, Map, MessageSquare, TrendingUp,
  Hotel, Star, ExternalLink, BarChart3,
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

// ─── Page ───────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    document.title = "Admin Dashboard – Travel Planner";
    api.get("/admin/stats")
      .then(r => setStats(r.data))
      .catch(e => setError(e?.response?.data?.message || "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

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

    </div>
  );
}
