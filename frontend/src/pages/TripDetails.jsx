import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { Alert, Card, CardBody, CardHeader } from "../components/UI.jsx";

export default function TripDetails() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErr("");
      setLoading(true);
      try {
        const { data } = await api.get(`/trips/${id}`);
        if (!cancelled) setTrip(data);
      } catch (e) {
        if (!cancelled) setErr(e?.response?.data?.message || "Failed to load trip");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div>Loading...</div>;

  if (err) return <Alert type="error">{err}</Alert>;

  if (!trip) return <div>Trip not found</div>;

  return (
    <Card>
      <CardHeader
        title={trip.destination}
        subtitle={`${trip.startDate} → ${trip.endDate}`}
      />
      <CardBody>
        <pre className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-auto">
          {JSON.stringify(trip.itinerary, null, 2)}
        </pre>
      </CardBody>
    </Card>
  );
}