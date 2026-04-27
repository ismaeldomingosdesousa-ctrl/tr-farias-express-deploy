import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

export interface MapMarker {
  lat: number;
  lng: number;
  title?: string;
  color?: "red" | "green" | "blue" | "orange" | "purple";
}

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  markers?: MapMarker[];
  panTo?: { lat: number; lng: number } | null;
}

const COLORS: Record<string, string> = {
  red:    "#ef4444",
  green:  "#22c55e",
  blue:   "#3b82f6",
  orange: "#f97316",
  purple: "#7C3AED",
};

function makeIcon(color: string) {
  const c = COLORS[color] ?? COLORS.red;
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22s14-12.67 14-22C28 6.27 21.73 0 14 0z" fill="${c}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="white" opacity="0.9"/>
    </svg>`);
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

export function MapView({
  className,
  initialCenter = { lat: -15.77, lng: -47.92 },
  initialZoom = 4,
  markers = [],
  panTo,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: initialZoom,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers when they change
  useEffect(() => {
    if (!markerLayerRef.current || !mapRef.current) return;
    markerLayerRef.current.clearLayers();

    markers.forEach(m => {
      const icon = makeIcon(m.color ?? "red");
      const marker = L.marker([m.lat, m.lng], { icon });
      if (m.title) marker.bindPopup(m.title);
      markerLayerRef.current!.addLayer(marker);
    });

    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [markers]);

  // Pan to target when requested
  useEffect(() => {
    if (!mapRef.current || !panTo) return;
    mapRef.current.setView([panTo.lat, panTo.lng], 14);
  }, [panTo]);

  return <div ref={containerRef} className={cn("w-full h-[500px]", className)} />;
}
