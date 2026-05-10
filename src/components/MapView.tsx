'use client';

import { useEffect, useRef } from 'react';
import { Destination, Coordinates } from '@/types';

interface Props {
  destinations: Destination[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  startCoordinates?: Coordinates;
  startLabel?: string;
}

export default function MapView({ destinations, selectedId, onSelect, startCoordinates, startLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamically import maplibre-gl to avoid SSR issues
    import('maplibre-gl').then((maplibregl) => {
      const map = new maplibregl.Map({
        container: containerRef.current!,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [-105.0, 39.5],
        zoom: 5,
      });

      mapRef.current = map;

      map.on('load', () => {
        updateMarkers(maplibregl, map);
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    import('maplibre-gl').then((maplibregl) => {
      updateMarkers(maplibregl, mapRef.current);
    });
  }, [destinations, selectedId, startCoordinates]);

  function updateMarkers(maplibregl: any, map: any) {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Remove previous route line if it exists
    if (map.getLayer('route-line')) map.removeLayer('route-line');
    if (map.getSource('route')) map.removeSource('route');

    if (destinations.length === 0 && !startCoordinates) return;

    const bounds = new maplibregl.LngLatBounds();

    // Render start marker (green diamond style)
    if (startCoordinates) {
      const startEl = document.createElement('div');
      startEl.className = 'flex items-center justify-center w-8 h-8 font-bold text-xs cursor-default';
      startEl.style.backgroundColor = '#22c55e';
      startEl.style.color = '#052e16';
      startEl.style.border = '2px solid #052e16';
      startEl.style.borderRadius = '4px';
      startEl.style.transform = 'rotate(45deg)';
      const inner = document.createElement('span');
      inner.style.transform = 'rotate(-45deg)';
      inner.textContent = 'S';
      startEl.appendChild(inner);

      const startMarker = new maplibregl.Marker({ element: startEl })
        .setLngLat([startCoordinates.lon, startCoordinates.lat])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setText(`Start: ${startLabel ?? ''}`))
        .addTo(map);
      markersRef.current.push(startMarker);
      bounds.extend([startCoordinates.lon, startCoordinates.lat]);
    }

    // Draw connecting route line: start → stop1 → stop2 → ...
    const lineCoords: number[][] = [];
    if (startCoordinates) {
      lineCoords.push([startCoordinates.lon, startCoordinates.lat]);
    }
    destinations.forEach((d) => lineCoords.push([d.coordinates.lon, d.coordinates.lat]));

    if (lineCoords.length >= 2) {
      const coords = lineCoords;
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#f59e0b',
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 0.8,
        },
      });
    }

    destinations.forEach((d, i) => {
      const el = document.createElement('div');
      el.className = 'flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-sm cursor-pointer transition-transform hover:scale-110';
      el.style.backgroundColor = selectedId === d.id ? '#f59e0b' : '#292524';
      el.style.borderColor = selectedId === d.id ? '#f59e0b' : '#78716c';
      el.style.color = selectedId === d.id ? '#1c1917' : '#e7e5e4';
      el.textContent = String(i + 1);

      el.addEventListener('click', () => onSelect(d.id));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([d.coordinates.lon, d.coordinates.lat])
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([d.coordinates.lon, d.coordinates.lat]);
    });

    map.fitBounds(bounds, { padding: 80, maxZoom: 10, duration: 800 });
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      {destinations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900/80">
          <p className="text-stone-500 text-sm">Destinations will appear here</p>
        </div>
      )}
    </div>
  );
}
