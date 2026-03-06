import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
} from "../components/UI.jsx";
import TripRouteMap from "../components/TripRouteMap.jsx";

const BLOCKS = ["morning", "afternoon", "evening"];
const BLOCK_ORDER = { morning: 1, afternoon: 2, evening: 3 };

const fmtRange = (s, e) => (s && e ? `${s} → ${e}` : "");
const clamp = (s, n = 120) => {
  const str = (s ?? "").toString();
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
};

function extractUniqueLocations(itinerary) {
  const rows =
    itinerary?.days?.flatMap((d) =>
      BLOCKS.flatMap((block) =>
        (d?.[block] ?? [])
          .map((a) => ({
            day: d.day,
            timeBlock: block,
            title: a?.title || "Place",
            location: (a?.location || "").trim(),
          }))
          .filter((x) => x.location)
      )
    ) ?? [];

  const unique = Array.from(
    new Map(rows.map((x) => [x.location.toLowerCase(), x])).values()
  );

  return unique.sort(
    (a, b) =>
      (a.day ?? 0) - (b.day ?? 0) ||
      (BLOCK_ORDER[a.timeBlock] ?? 99) - (BLOCK_ORDER[b.timeBlock] ?? 99)
  );
}

function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: "" }));

    (async () => {
      try {
        const data = await fn();
        if (alive) setState({ data, loading: false, error: "" });
      } catch (e) {
        if (alive)
          setState({
            data: null,
            loading: false,
            error: e?.response?.data?.message || "Something went wrong",
          });
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

function useGeoPoints(locations) {
  return useAsync(async () => {
    if (!locations.length) return { points: [], failed: [] };

    const normalize = (s) => String(s || "").trim().toLowerCase();
    const includesCity = (text, city) =>
      normalize(text).includes(normalize(city));

    const queries = locations.map((p) => p.location);
    const { data: geo } = await api.post("/geocode/batch", { queries });

    const results = Array.isArray(geo?.results) ? geo.results : [];
    const byQuery = new Map(results.map((r) => [normalize(r.query), r]));

    const points = [];
    const failed = [];

    async function retrySingle(forcedQuery) {
      const { data } = await api.post("/geocode/batch", { queries: [forcedQuery] });
      const r = Array.isArray(data?.results) ? data.results[0] : null;
      return r && Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lon)) ? r : null;
    }

    for (const p of locations) {
      const q = p.location.trim();
      const qNorm = normalize(q);

      let hit = byQuery.get(qNorm) || null;

      const hitLat = Number(hit?.lat);
      const hitLon = Number(hit?.lon);

      const wantsParis = qNorm.includes("paris");
      const hitName = hit?.display_name || "";

      const looksWrongCity = wantsParis && hit && !includesCity(hitName, "paris");

      if (!Number.isFinite(hitLat) || !Number.isFinite(hitLon) || looksWrongCity) {
        const forced = wantsParis
          ? `${q.replace(/,?\s*paris.*$/i, "")}, Paris, Île-de-France, France`
          : q;

        const retried = await retrySingle(forced);

        if (retried) {
          hit = retried;
        } else {
          failed.push({
            q,
            reason: !hit
              ? "No match returned"
              : looksWrongCity
              ? "Matched wrong city (retry failed)"
              : "No lat/lon returned",
          });
          continue;
        }
      }

      const lat = Number(hit?.lat);
      const lon = Number(hit?.lon);

      try {
        const { data: detail } = await api.get("/geocode/place-details", {
          params: { lat, lon, q },
        });

        points.push({
          ...p,
          lat,
          lon,
          photoUrl: detail?.photoUrl ?? null,
          displayName: detail?.display_name ?? hit?.display_name ?? null,
          category: detail?.category ?? null,
          type: detail?.type ?? null,
          address: detail?.address ?? null,
          wikipedia: detail?.wikipedia ?? null,
        });
      } catch {
        points.push({ ...p, lat, lon, displayName: hit?.display_name ?? null });
      }
    }

    return { points, failed };
  }, [locations]);
}

export default function ViewTrip() {
  const nav = useNavigate();
  const { id } = useParams();

  const tripState = useAsync(async () => (await api.get(`/trips/${id}`)).data, [id]);
  const trip = tripState.data;
  const summary = trip?.itinerary?.tripSummary || {};

  // ✅ PDF ref should wrap ONLY the printable content (NOT the Leaflet map)
  const pdfRef = useRef(null);

  const downloadPDF = async () => {
  const res = await api.get(`/trips/${id}/pdf`, { responseType: "blob" });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);

  const safeName = (trip?.destination || "planner")
    .toString()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const a = document.createElement("a");
  a.href = url;
  a.download = `trip-${safeName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

  const locations = useMemo(() => extractUniqueLocations(trip?.itinerary), [trip]);
  const examples = useMemo(() => locations.slice(0, 3).map((x) => x.location), [locations]);

  const geoState = useGeoPoints(locations);
  const mapPoints = geoState.data?.points ?? [];
  const geoFailed = geoState.data?.failed ?? [];

  if (tripState.loading) return <TripSkeleton />;

  if (tripState.error)
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Alert type="error">{tripState.error}</Alert>
        <div className="flex gap-2">
          <Button onClick={() => nav("/trips")} variant="secondary">Back</Button>
          <Button onClick={() => nav("/create")} variant="ghost">Create New</Button>
        </div>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ✅ PDF AREA (Header + itinerary + tips only) */}
      <div ref={pdfRef} className="space-y-6">
        <Header
          trip={trip}
          summary={summary}
          onBack={() => nav("/trips")}
          onNew={() => nav("/create")}
          onDownload={downloadPDF}
        />

        <div className="grid lg:grid-cols-2 gap-6">
          {trip?.itinerary?.days?.map((d) => (
            <DayCard key={d.day} day={d} />
          ))}
        </div>

        {!!trip?.itinerary?.tips?.length && (
          <Card>
            <CardHeader title="Tips" subtitle="Helpful reminders" />
            <CardBody>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                {trip.itinerary.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>

      {/* ✅ LIVE MAP OUTSIDE PDF AREA (prevents Leaflet overlays stealing clicks + avoids export issues) */}
      <Card className="overflow-hidden relative z-0">
        <CardHeader title="Map" subtitle="Places + route from your itinerary" />
        <CardBody className="space-y-3">
          {geoState.error ? <Alert type="error">{geoState.error}</Alert> : null}

          {geoState.loading ? (
            <MapSkeleton />
          ) : locations.length === 0 ? (
            <NiceEmptyState
              title="No map locations found"
              subtitle="This saved itinerary doesn’t include activity location fields."
              action={<Button onClick={() => nav("/create")} variant="secondary">Create a new trip</Button>}
            />
          ) : mapPoints.length === 0 ? (
            <NiceEmptyState
              title="We couldn’t geocode your locations"
              subtitle={
                <>
                  Found <b>{locations.length}</b> location strings, but got <b>0</b> coordinates back.
                </>
              }
              hint={
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 wrap-break-word">
                    Example queries: {examples.join(" | ")}
                  </div>
                  {geoFailed.length ? (
                    <div className="text-xs text-slate-500 wrap-break-word">
                      Failed examples: {geoFailed.slice(0, 3).map((x) => `${x.q} (${x.reason})`).join(" | ")}
                    </div>
                  ) : null}
                </div>
              }
              action={
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => window.location.reload()} variant="secondary">Retry</Button>
                  <Button onClick={() => nav("/create")} variant="ghost">Create New</Button>
                </div>
              }
            />
          ) : (
            <>
              <div className="rounded-2xl overflow-hidden border border-slate-200 relative z-0">
                <TripRouteMap points={mapPoints} />
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-slate-500">
                <div>
                  Showing <b>{mapPoints.length}</b> pinned places (route draws when 2+ exist).
                </div>
                <div>
                  Total requested: <b>{locations.length}</b>
                  {geoFailed.length ? (
                    <>
                      {" "}• Failed: <b>{geoFailed.length}</b>
                    </>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ---------------- UI bits (small + stylish) ---------------- */

function Header({ trip, summary, onBack, onNew, onDownload }) {
  return (
    // ✅ isolate creates a new stacking context so Leaflet can't overlay it
    <Card className="overflow-hidden relative z-50 pointer-events-auto isolate">
      <div className="bg-linear-to-r from-slate-950 via-slate-900 to-slate-950 text-white relative z-50 pointer-events-auto">
        <div className="px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs/5 opacity-80">Your Trip</div>
            <div className="text-2xl font-extrabold tracking-tight">
              {trip?.destination || "Trip"}
            </div>
            <div className="text-sm opacity-90 mt-1">
              {fmtRange(trip?.startDate, trip?.endDate)}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            {summary.days ? <Badge>{summary.days} days</Badge> : null}
            {summary.style ? <Badge>pace: {summary.style}</Badge> : null}
            {summary.budget ? <Badge>budget: {summary.budget}</Badge> : null}
          </div>
        </div>

        <div className="px-6 pb-5 flex flex-wrap gap-2">
          <Button type="button" onClick={onBack} variant="secondary">Back to My Trips</Button>
          <Button type="button" onClick={onNew} variant="ghost">Create New</Button>
          <Button
            type="button"
            className="pointer-events-auto"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDownload?.();
            }}
          >
            Download PDF
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DayCard({ day }) {
  return (
    <Card className="overflow-hidden">
      <div className="p-5 bg-slate-900 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs opacity-90">Day {day.day}</div>
            <div className="text-lg font-extrabold leading-snug">{day.title}</div>
            <div className="text-sm opacity-90 mt-1">{day.date}</div>
          </div>
          <Badge>Day Plan</Badge>
        </div>
      </div>

      <CardBody>
        <MiniSection title="Morning" items={day.morning} />
        <MiniSection title="Afternoon" items={day.afternoon} />
        <MiniSection title="Evening" items={day.evening} />

        {(day.foodSuggestion || day.backupPlan) && (
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {day.foodSuggestion ? <InfoTile label="Food" value={clamp(day.foodSuggestion)} /> : null}
            {day.backupPlan ? <InfoTile label="Backup" value={clamp(day.backupPlan)} /> : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function TripSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      <Card>
        <CardBody>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-200 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded animate-pulse w-1/3" />
              <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
            </div>
          </div>
          <div className="mt-5 h-28 bg-slate-100 rounded-xl animate-pulse" />
        </CardBody>
      </Card>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">Finding locations…</div>
          <div className="text-xs text-slate-500 mt-1">Converting place names into coordinates.</div>
        </div>
        <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
      </div>
      <div className="mt-4 h-48 rounded-xl bg-slate-100 animate-pulse" />
    </div>
  );
}

function NiceEmptyState({ title, subtitle, hint, action }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-linear-to-b from-white to-slate-50 p-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-slate-900/10 grid place-items-center">
          <div className="h-4 w-4 rounded bg-slate-900/30" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <div className="text-sm text-slate-600 mt-1">{subtitle}</div>
          {hint ? <div className="text-xs text-slate-500 mt-3 leading-relaxed">{hint}</div> : null}
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm text-slate-800 mt-1 leading-relaxed">{value}</div>
    </div>
  );
}

function MiniSection({ title, items }) {
  if (!items?.length) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</div>
        <div className="text-[11px] text-slate-500">
          {items.length} item{items.length > 1 ? "s" : ""}
        </div>
      </div>

      <ul className="mt-2 space-y-2 text-sm text-slate-800">
        {items.map((x, i) => (
          <li
            key={x.id ?? `${x.title}-${x.location}-${i}`}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            <div className="font-semibold">{x.title}</div>
            {x.location ? <div className="text-xs text-slate-500 mt-0.5">{x.location}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}