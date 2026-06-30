"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon paths broken by Webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const selectedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Pin = {
  id: number;
  lat: number;
  lng: number;
  label: string;
  selected: boolean;
};

function FitBounds({ pins, selectedId }: { pins: Pin[]; selectedId: number | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedId !== null) {
      const pin = pins.find((p) => p.id === selectedId);
      if (pin) {
        map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 14), { animate: true });
        return;
      }
    }
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return null;
}

export default function LocationMap({
  pins,
  onSelect,
}: {
  pins: Pin[];
  onSelect: (id: number) => void;
}) {
  const center: [number, number] =
    pins.length > 0 ? [pins[0].lat, pins[0].lng] : [39.5, -98.35];
  const selectedId = pins.find((p) => p.selected)?.id ?? null;

  return (
    <MapContainer
      center={center}
      zoom={pins.length === 1 ? 14 : 4}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds pins={pins} selectedId={selectedId} />
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={pin.selected ? selectedIcon : new L.Icon.Default()}
          eventHandlers={{ click: () => onSelect(pin.id) }}
        >
          <Popup>{pin.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
