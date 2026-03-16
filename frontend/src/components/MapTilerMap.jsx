import { useEffect, useMemo, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import * as maptilerClient from "@maptiler/client";

const DEFAULT_ZOOM = 11;
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

  const [fallbackCenter, setFallbackCenter] = useState(HARD_FALLBACK);
  const [center, setCenter] = useState(HARD_FALLBACK);
  const [status, setStatus] = useState({ loading: false, error: "" });

  // Configure SDK once
  useEffect(() => {
    if (!key) {
      setStatus({
        loading: false,
        error: "Missing VITE_MAPTILER_KEY in .env.local",
      });
      return;
    }

    maptilersdk.config.apiKey = key;
    maptilerClient.config.apiKey = key;
  }, [key]);

  // Get user location once as fallback
  useEffect(() => {
    let cancelled = false;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;

        const userLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        setFallbackCenter(userLocation);

        setCenter((prev) => {
          const isStillHardFallback =
            prev?.lat === HARD_FALLBACK.lat && prev?.lng === HARD_FALLBACK.lng;

          return isStillHardFallback && (!query || !query.trim())
            ? userLocation
            : prev;
        });
      },
      () => {
        // Keep silent fallback
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60_000,
      }
    );

    return () => {
      cancelled = true;
    };
  }, [query]);

  // Geocode whenever query changes
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!key) return;

      const cleanQuery = query?.trim();

      if (!cleanQuery) {
        setCenter(fallbackCenter);
        setStatus({ loading: false, error: "" });
        return;
      }

      setStatus({ loading: true, error: "" });

      try {
        const result = await maptilerClient.geocoding.forward(cleanQuery, {
          limit: 1,
        });

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
          setStatus({
            loading: false,
            error: e?.message || "Geocoding failed",
          });
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [query, key, fallbackCenter]);

  // Create map once
  useEffect(() => {
    if (!key || !containerRef.current || mapRef.current) return;

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: "outdoor-v2",
      center: [center.lng, center.lat],
      zoom,
    });

    const marker = new maptilersdk.Marker({ color: "#111827" })
      .setLngLat([center.lng, center.lat])
      .addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    // Optional controls
    map.addControl(new maptilersdk.NavigationControl(), "top-right");

    return () => {
      markerRef.current?.remove?.();
      markerRef.current = null;

      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [key]);

  // Update map center when state changes
  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.easeTo({
      center: [center.lng, center.lat],
      zoom,
      duration: 700,
    });

    markerRef.current?.setLngLat([center.lng, center.lat]);
  }, [center, zoom]);

  const overlay = useMemo(() => {
    if (!status.loading && !status.error) return null;

    return (
      <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-3">
        <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-sm backdrop-blur">
          {status.loading ? "Finding location..." : `Map note: ${status.error}`}
        </div>
      </div>
    );
  }, [status]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}
    >
      <div ref={containerRef} style={{ height }} />
      {overlay}
    </div>
  );
}