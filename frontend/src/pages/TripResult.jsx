import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { api } from "../api/client.js";
import { Alert, Badge, Button, Card, CardBody, CardHeader } from "../components/UI.jsx";
import MapTilerMap from "../components/MapTilerMap.jsx";

function Section({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</div>
      <ul className="mt-2 space-y-2">
        {items.map((x, idx) => (
          <li key={idx} className="text-sm text-slate-800">
            <span className="font-semibold">{x.title}</span>
            {x.durationHours ? <span className="text-slate-500"> • {x.durationHours}h</span> : null}
            {x.notes ? <span className="text-slate-500"> — {x.notes}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TripResult() {
  const nav = useNavigate();
  const { state } = useLocation();

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const itinerary = state?.itinerary;

  const meta = useMemo(() => {
    if (!itinerary) return null;
    const s = itinerary.tripSummary || {};
    return {
      title: s.destination || state?.destination || "Trip",
      days: s.days || itinerary.days?.length || 0,
      budget: s.budget,
      style: s.style,
    };
  }, [itinerary, state]);

  if (!itinerary) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert type="error">
          No itinerary found. Go back to Create Trip and generate one.
        </Alert>
        <div className="mt-4">
          <Button onClick={() => nav("/create")}>Back to Create</Button>
        </div>
      </div>
    );
  }

  async function saveTrip() {
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      await api.post("/trips", {
        destination: state.destination,
        startDate: state.startDate,
        endDate: state.endDate,
        preferences: state.preferences,
        itinerary,
      });
      setMsg("Saved ✅");
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={`${meta?.title || "Trip"} itinerary`}
          subtitle={`${state.startDate} → ${state.endDate}`}
          right={
            <div className="flex flex-wrap gap-2 justify-end">
              {meta?.days ? <Badge>{meta.days} days</Badge> : null}
              {meta?.style ? <Badge>pace: {meta.style}</Badge> : null}
              {meta?.budget ? <Badge>budget: {meta.budget}</Badge> : null}
            </div>
          }
        />
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => nav("/create")} variant="secondary">New Trip</Button>
            <Button onClick={saveTrip} disabled={saving}>
              {saving ? "Saving..." : "Save Trip"}
            </Button>
            <Button onClick={() => nav("/trips")} variant="ghost">My Trips</Button>
          </div>

          <div className="mt-4 space-y-3">
            {err ? <Alert type="error">{err}</Alert> : null}
            {msg ? <Alert type="success">{msg}</Alert> : null}
          </div>
        </CardBody>
      </Card>
      <MapTilerMap query={state.destination} height={360} />

      <div className="grid md:grid-cols-2 gap-6">
        {itinerary.days.map((d) => (
          <Card key={d.day} className="overflow-hidden">
            <div className="p-5 bg-slate-900 text-white">
              <div className="text-xs opacity-90">Day {d.day}</div>
              <div className="text-lg font-extrabold">{d.title}</div>
              <div className="text-sm opacity-90 mt-1">{d.date}</div>
            </div>

            <CardBody>
              <Section title="Morning" items={d.morning} />
              <Section title="Afternoon" items={d.afternoon} />
              <Section title="Evening" items={d.evening} />

              <div className="mt-4 space-y-2 text-sm">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Food</div>
                  <div className="mt-1 text-slate-800">{d.foodSuggestion}</div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Backup plan</div>
                  <div className="mt-1 text-slate-800">{d.backupPlan}</div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {itinerary.tips?.length ? (
        <Card>
          <CardHeader title="Tips" subtitle="Small things that make the trip smoother" />
          <CardBody>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
              {itinerary.tips.map((t, idx) => (
                <li key={idx}>{t}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}