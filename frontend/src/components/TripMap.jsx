// import { useEffect } from "react";
// import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // Fix marker icon issue (often needed in Vite/React)
// import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
// import markerIcon from "leaflet/dist/images/marker-icon.png";
// import markerShadow from "leaflet/dist/images/marker-shadow.png";

// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: markerIcon2x,
//   iconUrl: markerIcon,
//   shadowUrl: markerShadow,
// });

// function FitBounds({ points }) {
//   const map = useMap();

//   useEffect(() => {
//     if (!points?.length) return;

//     const valid = points.filter(
//       (p) =>
//         typeof p.lat === "number" &&
//         typeof p.lon === "number" &&
//         !Number.isNaN(p.lat) &&
//         !Number.isNaN(p.lon)
//     );

//     if (!valid.length) return;

//     const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lon]));
//     map.fitBounds(bounds, { padding: [30, 30] });
//   }, [map, points]);

//   return null;
// }

// export default function TripMap({ points = [] }) {
//   // points = [{ title, location, lat, lon, day, timeBlock }]
//   const center = points.length
//     ? [points[0].lat, points[0].lon]
//     : [31.7683, 35.2137]; // fallback: Jerusalem

//   return (
//     <div className="w-full rounded-2xl overflow-hidden border border-slate-200">
//       <div className="h-80 sm:h-[420px]">
//         <MapContainer
//           center={center}
//           zoom={13}
//           scrollWheelZoom={false}
//           className="h-full w-full"
//         >
//           <TileLayer
//             attribution='&copy; OpenStreetMap contributors'
//             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           />

//           <FitBounds points={points} />

//           {points.map((p, idx) => (
//             <Marker key={`${p.location || "p"}-${idx}`} position={[p.lat, p.lon]}>
//               <Popup>
//                 <div className="text-sm">
//                   <div className="font-semibold">{p.title || "Place"}</div>
//                   <div className="text-slate-600">{p.location || ""}</div>
//                   {p.day != null && (
//                     <div className="text-slate-500 mt-1">
//                       Day {p.day} {p.timeBlock ? `• ${p.timeBlock}` : ""}
//                     </div>
//                   )}
//                 </div>
//               </Popup>
//             </Marker>
//           ))}
//         </MapContainer>
//       </div>

//       {!points.length && (
//         <div className="p-3 text-sm text-slate-600 bg-slate-50 border-t border-slate-200">
//           No map locations yet (geocoding returned 0 coordinates).
//         </div>
//       )}
//     </div>
//   );
// }