import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Input } from "../components/UI.jsx";

export default function MyTrips() {
  const nav = useNavigate();
  const [trips, setTrips] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const { data } = await api.get("/trips");
      setTrips(Array.isArray(data) ? data : []);
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Failed to load trips (login first)");
    } finally {
      setLoading(false);
    }
  }

  async function del(id) {
    if (!confirm("Delete this trip?")) return;
    await api.delete(`/trips/${id}`);
    load();
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = trips.filter((t) =>
    (t.destination || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="My Trips"
          subtitle="Saved itineraries from your account"
          right={<Badge>{filtered.length} trips</Badge>}
        />
        <CardBody>
          <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
            <div className="w-full md:max-w-sm">
              <Input
                label="Search by destination"
                placeholder="e.g., City"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={() => nav("/create")}>Create Trip</Button>
              <Button onClick={load} variant="secondary">
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-4">
            {err ? <Alert type="error">{err}</Alert> : null}
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="text-sm text-slate-600">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map((t) => (
            <Card key={t._id} className="overflow-hidden">
              <div className="p-5 bg-linear-to-br from-slate-900 to-slate-700 text-white">
                <div className="text-xs opacity-90">Destination</div>
                <div className="text-xl font-extrabold">{t.destination}</div>
                <div className="text-sm opacity-90 mt-1">
                  {t.startDate} → {t.endDate}
                </div>
              </div>

              <CardBody>
                <div className="flex flex-wrap gap-2">
                  {t.preferences?.pace ? <Badge>pace: {t.preferences.pace}</Badge> : null}
                  {t.preferences?.budget ? <Badge>budget: {t.preferences.budget}</Badge> : null}
                  {t.itinerary?.tripSummary?.days ? <Badge>{t.itinerary.tripSummary.days} days</Badge> : null}
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <Button onClick={() => nav(`/trip/${t._id}`)} variant="secondary">
                    View
                  </Button>
                  <Button onClick={() => del(t._id)} variant="danger">
                    Delete
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}

          {!filtered.length ? (
            <div className="md:col-span-2">
              <Card>
                <CardBody>
                  <div className="text-sm text-slate-700">
                    No trips yet. Create your first trip and save it.
                  </div>
                  <div className="mt-3">
                    <Button onClick={() => nav("/create")}>Create Trip</Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}