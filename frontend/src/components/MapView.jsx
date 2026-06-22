import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

/* Fix default Leaflet icon paths broken by Vite bundling */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* White car glyph used inside the markers */
const CAR_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 17l-2-2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2l-2 2M7.5 9h9"/></svg>`;

/* Custom clay car icon */
const carIcon = L.divIcon({
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:#B5471D;border:3px solid white;
    box-shadow:0 4px 10px rgba(46,33,18,0.35);
    display:flex;align-items:center;justify-content:center;
  ">${CAR_SVG}</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

/* Pulse icon for live tracking */
const pulseIcon = L.divIcon({
  html: `<div style="position:relative;width:48px;height:48px;">
    <div style="
      position:absolute;inset:0;border-radius:50%;
      background:rgba(181,71,29,0.25);
      animation:pulse-ring 1.5s cubic-bezier(0.215,0.61,0.355,1) infinite;
    "></div>
    <div style="
      position:absolute;inset:6px;border-radius:50%;
      background:#B5471D;border:3px solid white;
      box-shadow:0 4px 10px rgba(46,33,18,0.4);
      display:flex;align-items:center;justify-content:center;
    ">${CAR_SVG}</div>
  </div>
  <style>
    @keyframes pulse-ring {
      0%{transform:scale(0.8);opacity:1}
      80%,100%{transform:scale(1.8);opacity:0}
    }
  </style>`,
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  popupAnchor: [0, -26],
});

/* Re-center map when position changes */
function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng]);
  return null;
}

/**
 * MapView props:
 *  - center: [lat, lng]          default Algiers
 *  - zoom: number                default 13
 *  - height: string              CSS height, default '400px'
 *  - markers: [{ lat, lng, label, popup, live }]
 *  - followFirst: bool           auto-pan to first marker when it moves
 */
export default function MapView({
  center = [36.7372, 3.0864],
  zoom = 13,
  height = '400px',
  markers = [],
  followFirst = false,
}) {
  // Filter out any markers with invalid coordinates so Leaflet never throws
  const safeMarkers = markers.filter(m => m && typeof m.lat === 'number' && typeof m.lng === 'number' && isFinite(m.lat) && isFinite(m.lng));

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%', zIndex: 0 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {followFirst && safeMarkers.length > 0 && (
        <Recenter lat={safeMarkers[0].lat} lng={safeMarkers[0].lng} />
      )}

      {safeMarkers.map((m, i) => (
        <Marker key={i} position={[m.lat, m.lng]} icon={m.live ? pulseIcon : carIcon}>
          {m.popup && (
            <Popup>
              <div className="text-sm font-medium">{m.popup}</div>
              {m.label && <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>}
            </Popup>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}
