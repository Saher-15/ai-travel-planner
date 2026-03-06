import { useEffect, useMemo, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import * as maptilerClient from "@maptiler/client";

const DEFAULT_ZOOM = 11;

// Backup backup (used only if geolocation fails/blocked)
const HARD_FALLBACK = { lng: 20.4964, lat: 41.9028 };

export default function MapTilerMap({
  query, 
  className = "",
  height = 360,
  zoom = DEFAULT_ZOOM,
}) {
  const key = import.meta.env.VITE_MAPTILER_KEY;

  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markerRef = useRef(null);

  // This will become the user's location if available
  const [fallbackCenter, setFallbackCenter] = useState(HARD_FALLBACK);
  const [center, setCenter] = useState(HARD_FALLBACK);
  const [status, setStatus] = useState({ loading: false, error: "" });

  // Configure MapTiler client + SDK once
  useEffect(() => {
    if (!key) {
      setStatus({ loading: false, error: "Missing VITE_MAPTILER_KEY in .env.local" });
      return;
    }
    maptilersdk.config.apiKey = key;
    maptilerClient.config.apiKey = key;
  }, [key]);

  // Get user's current location ONCE and use it as fallback
  useEffect(() => {
    let cancelled = false;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const user = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setFallbackCenter(user);

        // If we’re still at the hard fallback and no query is driving the center, move to user
        setCenter((prev) => {
          const isStillHard =
            prev?.lat === HARD_FALLBACK.lat && prev?.lng === HARD_FALLBACK.lng;
          return isStillHard && (!query || !query.trim()) ? user : prev;
        });
      },
      (err) => {
        // If blocked/failed, keep HARD_FALLBACK silently (or you can show a note if you want)
        // console.log("Geolocation error:", err);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geocode whenever query changes
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!key) return;

      // If no query, just use fallbackCenter (user location if available)
      if (!query || !query.trim()) {
        setCenter(fallbackCenter);
        setStatus({ loading: false, error: "" });
        return;
      }

      setStatus({ loading: true, error: "" });

      try {
        const result = await maptilerClient.geocoding.forward(query, { limit: 1 });
        const feature = result?.features?.[0];
        const coords = feature?.geometry?.coordinates;

        if (!coords || coords.length < 2) {
          throw new Error("No location found for this destination.");
        }

        const [lng, lat] = coords;

        if (!cancelled) {
          setCenter({ lng, lat });
          setStatus({ loading: false, error: "" });
        }
      } catch (e) {
        if (!cancelled) {
          setCenter(fallbackCenter);
          setStatus({ loading: false, error: e?.message || "Geocoding failed" });
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [query, key, fallbackCenter]);

  // Create the map once
  useEffect(() => {
    if (!key) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    mapRef.current = new maptilersdk.Map({
      container: containerRef.current,
      style: maptilersdk.MapStyle.STREETS,
      center: [center.lng, center.lat],
      zoom,
    });

    markerRef.current = new maptilersdk.Marker({ color: "#111827" })
      .setLngLat([center.lng, center.lat])
      .addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Update center when it changes
  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.easeTo({ center: [center.lng, center.lat], zoom, duration: 700 });

    markerRef.current?.setLngLat([center.lng, center.lat]);
  }, [center, zoom]);

  const overlay = useMemo(() => {
    if (!status.loading && !status.error) return null;
    return (
      <div className="absolute inset-0 flex items-start justify-end p-3 pointer-events-none">
        <div className="rounded-xl border border-slate-200 bg-white/90 backdrop-blur px-3 py-2 text-xs text-slate-700 shadow-sm">
          {status.loading ? "Finding location…" : `Map note: ${status.error}`}
        </div>
      </div>
    );
  }, [status]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}>
      <div ref={containerRef} style={{ height }} />
      {overlay}
    </div>
  );
}