import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet marker icons (important for many bundlers)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/** Jerusalem fallback */
const DEFAULT_CENTER = [31.7683, 35.2137];
const DEFAULT_ZOOM = 13;

function isValidPoint(p) {
  return (
    p &&
    Number.isFinite(Number(p.lat)) &&
    Number.isFinite(Number(p.lon)) &&
    Math.abs(Number(p.lat)) <= 90 &&
    Math.abs(Number(p.lon)) <= 180
  );
}

/**
 * Adds a Leaflet Routing Machine control.
 * IMPORTANT: This draws a route ONLY between your given points.
 * It does NOT add any extra markers/places.
 */
function RouteControl({ points }) {
  const map = useMap();
  const controlRef = useRef(null);

  const waypoints = useMemo(() => {
    return (points ?? [])
      .filter(isValidPoint)
      .map((p) => L.latLng(Number(p.lat), Number(p.lon)));
  }, [points]);

  useEffect(() => {
    if (!map) return;

    let cancelled = false;

    const safeRemove = () => {
      const ctrl = controlRef.current;
      if (!ctrl) return;

      try {
        // try to clear route first (reduces removeLayer null crashes)
        if (ctrl.getPlan) {
          try {
            ctrl.getPlan().setWaypoints([]);
          } catch {}
        }
        map.removeControl(ctrl);
      } catch {}
      controlRef.current = null;
    };

    // Remove previous control
    safeRemove();

    // Add route only if 2+ points
    if (waypoints.length < 2) return () => {};

    const control = L.Routing.control({
      waypoints,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      show: false,
      routeWhileDragging: false,
      createMarker: () => null,
    });

    controlRef.current = control;

    try {
      if (!cancelled) control.addTo(map);
    } catch {}

    return () => {
      cancelled = true;
      safeRemove();
    };
  }, [map, waypoints]);

  return null;
}

/**
 * Fits map view to the provided points.
 */
function FitBounds({ points }) {
  const map = useMap();

  const valid = useMemo(() => (points ?? []).filter(isValidPoint), [points]);

  useEffect(() => {
    if (!map) return;

    if (!valid.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    const latLngs = valid.map((p) => [Number(p.lat), Number(p.lon)]);
    const bounds = L.latLngBounds(latLngs);

    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, valid]);

  return null;
}

export default function TripRouteMap({ points }) {
  const validPoints = useMemo(() => (points ?? []).filter(isValidPoint), [points]);

  const initialCenter = useMemo(() => {
    if (validPoints.length) return [Number(validPoints[0].lat), Number(validPoints[0].lon)];
    return DEFAULT_CENTER;
  }, [validPoints]);

  return (
    // ✅ This class lets you control Leaflet z-index safely if needed
    <div className="trip-route-map" style={{ height: 420, width: "100%" }}>
      <MapContainer
        center={initialCenter}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds points={validPoints} />
        <RouteControl points={validPoints} />

        {validPoints.map((p, idx) => (
          <Marker
            key={`${p.location || p.title || "p"}-${p.day}-${p.timeBlock}-${idx}`}
            position={[Number(p.lat), Number(p.lon)]}
          >
            <Popup>
              <div style={{ maxWidth: 240 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {p.title || p.displayName || "Place"}
                </div>

                {p.location ? (
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{p.location}</div>
                ) : null}

                {p.displayName && p.displayName !== p.location ? (
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                    {p.displayName}
                  </div>
                ) : null}

                {p.day || p.timeBlock ? (
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
                    {p.day ? `Day ${p.day}` : ""}
                    {p.day && p.timeBlock ? " • " : ""}
                    {p.timeBlock || ""}
                  </div>
                ) : null}

                {p.photoUrl ? (
                  <img
                    src={p.photoUrl}
                    alt={p.title || p.location || "place"}
                    style={{
                      marginTop: 10,
                      borderRadius: 10,
                      width: "100%",
                      height: 120,
                      objectFit: "cover",
                    }}
                  />
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}