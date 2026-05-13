'use client';

import { useEffect, useState } from 'react';
import { Itinerary, Destination, TripDuration } from '@/types';
import { Cloud, MapPin, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  destination: Destination;
  duration: TripDuration;
  stopIndex: number;
  totalStops: number;
  nextStopName?: string;
  nextStopDriveHours?: number;
  stopStartDate?: string;
  stopEndDate?: string;
}

export default function ItineraryView({ destination, duration, stopIndex, totalStops, nextStopName, nextStopDriveHours, stopStartDate, stopEndDate }: Props) {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setItinerary(null);

    fetch('/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: destination.name,
        lat: destination.coordinates.lat,
        lon: destination.coordinates.lon,
        duration,
        driveTimeHours: destination.driveTimeHours,
        distanceMiles: destination.distanceMiles,
        stopIndex,
        totalStops,
        nextStopName,
        nextStopDriveHours,
        stopStartDate,
        stopEndDate,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: Itinerary) => {
        if (!cancelled) {
          setItinerary(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [destination.id, duration, stopStartDate, stopEndDate]);

  if (loading) {
    return (
      <div className="mt-3 pt-3 border-t border-stone-700 flex items-center gap-2 text-xs text-stone-400">
        <Loader2 size={12} className="animate-spin" />
        <span>Building your itinerary...</span>
      </div>
    );
  }

  if (error || !itinerary) {
    return (
      <div className="mt-3 pt-3 border-t border-stone-700 text-xs text-red-400">
        Couldn&apos;t load itinerary details.
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-stone-700 space-y-4">
      {/* Itinerary narrative */}
      {itinerary.narrative && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={12} className="text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Itinerary</span>
          </div>
          <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-line">{itinerary.narrative}</p>
        </div>
      )}

      {/* Forecast */}
      {itinerary.forecast.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Cloud size={12} className="text-blue-400" />
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Forecast</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {itinerary.forecast.slice(0, 6).map((f, i) => (
              <div key={i} className="bg-stone-800 rounded-md px-2 py-1.5 text-xs">
                <div className="font-semibold text-stone-200">{f.name}</div>
                <div className="text-stone-400">{f.tempF}°F · {f.shortForecast}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Points of interest */}
      {itinerary.pointsOfInterest.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin size={12} className="text-green-400" />
            <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Sites & Things to Do</span>
          </div>
          <ul className="space-y-1">
            {itinerary.pointsOfInterest.map((p, i) => (
              <li key={i} className="text-xs text-stone-300 flex justify-between gap-2">
                <span>{p.name}</span>
                <span className="text-stone-500 capitalize">{p.category.split('.').slice(-1)[0]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
