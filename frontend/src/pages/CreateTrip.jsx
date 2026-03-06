import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Input, Select } from "../components/UI.jsx";
import MapTilerMap from "../components/MapTilerMap.jsx";

const interestOptions = [
  "history",
  "food",
  "culture",
  "nature",
  "shopping",
  "nightlife",
  "family",
];

function todayISOPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function CreateTrip() {
  const nav = useNavigate();

  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(todayISOPlus(0));
  const [endDate, setEndDate] = useState(todayISOPlus(1));

  const [pace, setPace] = useState("moderate");
  const [budget, setBudget] = useState("mid");
  const [interests, setInterests] = useState([]);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const daysCount = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) return null;
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
  }, [startDate, endDate]);

  function toggleInterest(x) {
    setInterests((prev) => (prev.includes(x) ? prev.filter((i) => i !== x) : [...prev, x]));
  }

  async function generate(e) {
    e.preventDefault();
    setErr("");

    if (!destination.trim()) {
      setErr("Please enter a destination.");
      return;
    }
    if (!daysCount) {
      setErr("Please select valid dates.");
      return;
    }

    setLoading(true);

    try {
      // ✅ NEW: AI generate + save in one call
      const { data: trip } = await api.post("/trips/generate-and-save", {
        destination: destination.trim(),
        startDate,
        endDate,
        preferences: { pace, budget, interests, notes },
      });

      // ✅ Redirect to the saved trip page
      // Assumes your route exists like: /trips/:id
      nav(`/trip/${trip._id}`);
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Generate failed (login first?)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      {/* Left: form */}
      <div className="lg:col-span-5">
        <Card>
          <CardHeader
            title="Create a trip"
            subtitle="Destination + dates → get a day-by-day plan"
            right={daysCount ? <Badge>{daysCount} days</Badge> : <Badge>Invalid dates</Badge>}
          />
          <CardBody>
            <form onSubmit={generate} className="space-y-4">
              <Input
                label="Destination"
                placeholder="e.g., City, Country"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Start date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  label="End date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Pace" value={pace} onChange={(e) => setPace(e.target.value)}>
                  <option value="relaxed">relaxed</option>
                  <option value="moderate">moderate</option>
                  <option value="packed">packed</option>
                </Select>

                <Select label="Budget" value={budget} onChange={(e) => setBudget(e.target.value)}>
                  <option value="low">low</option>
                  <option value="mid">mid</option>
                  <option value="high">high</option>
                </Select>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">Interests</div>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((x) => {
                    const active = interests.includes(x);
                    return (
                      <button
                        type="button"
                        key={x}
                        onClick={() => toggleInterest(x)}
                        className={[
                          "px-3 py-1.5 rounded-full text-xs font-semibold border transition",
                          active
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {x}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <div className="text-sm font-medium text-slate-700 mb-1">Notes (optional)</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., we like walking, cafes, not too early..."
                  className="w-full min-h-22.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                />
              </label>

              {err ? <Alert type="error">{err}</Alert> : null}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? "Generating..." : "Generate & Save"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => nav("/trips")}
                >
                  View My Trips
                </Button>
              </div>

              <div className="text-xs text-slate-500">
                Generates an AI itinerary and saves it to your account automatically.
              </div>
            </form>
          </CardBody>
        </Card>
      </div>

      {/* Right: preview */}
      <div className="lg:col-span-7">
        <Card className="overflow-hidden">
          <div className="p-6 bg-linear-to-br from-slate-900 to-slate-700 text-white">
            <div className="text-sm opacity-90">Preview</div>
            <div className="text-2xl font-extrabold mt-1">{destination || "Your destination"}</div>
            <div className="text-sm opacity-90 mt-2">
              {startDate} → {endDate} • pace: {pace} • budget: {budget}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {interests.slice(0, 6).map((x) => (
                <span
                  key={x}
                  className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold"
                >
                  {x}
                </span>
              ))}
            </div>
          </div>

          <div className="p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <PreviewCard title="Day structure" text="Morning / Afternoon / Evening" />
              <PreviewCard title="Realistic pace" text="Breaks + clustered activities" />
              <PreviewCard title="Food & backup plan" text="Suggestions + rainy-day option" />
              <PreviewCard title="Saved trips" text="Stored in MongoDB under your account" />
            </div>

            <div className="mt-6 text-sm text-slate-600">
              When you click <b>Generate & Save</b>, we create your itinerary and save it immediately.
            </div>
          </div>
        </Card>

        <div className="mt-6">
          <MapTilerMap query={destination} height={360} />
        </div>
      </div>
    </div>
  );
}

function PreviewCard({ title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="font-bold text-slate-900">{title}</div>
      <div className="text-sm text-slate-600 mt-1">{text}</div>
    </div>
  );
}