'use client';

import { Destination, TripDuration } from '@/types';
import { Thermometer, Wind, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import ItineraryView from './ItineraryView';

interface Props {
  destination: Destination;
  rank: number;
  selected: boolean;
  duration: TripDuration;
  totalStops: number;
  nextStopName?: string;
  nextStopDriveHours?: number;
  stopStartDate?: string;
  stopEndDate?: string;
  onClick: () => void;
}

const TIER_LABELS: Record<string, string> = {
  street: 'Street',
  stock4wd: 'Stock 4WD',
  lifted: 'Lifted',
  overlander: 'Full Overlander',
};

const TIER_COLORS: Record<string, string> = {
  street: 'text-green-400 bg-green-400/10',
  stock4wd: 'text-blue-400 bg-blue-400/10',
  lifted: 'text-amber-400 bg-amber-400/10',
  overlander: 'text-red-400 bg-red-400/10',
};

export default function DestinationCard({ destination: d, rank, selected, duration, totalStops, nextStopName, nextStopDriveHours, stopStartDate, stopEndDate, onClick }: Props) {
  const hardFlags = d.safetyFlags.filter((f) => f.severity === 'hard');
  const softFlags = d.safetyFlags.filter((f) => f.severity === 'soft');

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      className={`w-full text-left rounded-lg border p-4 transition-all cursor-pointer ${
        selected
          ? 'border-amber-500 bg-amber-500/5'
          : 'border-stone-700 bg-stone-900 hover:border-stone-500'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-500 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
            STOP {rank}
          </span>
          <h3 className="text-sm font-bold text-stone-100">{d.name}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[d.terrainRating]}`}>
            {TIER_LABELS[d.terrainRating]}
          </span>
          <span className="text-xs font-bold text-amber-400">{d.score}/10</span>
        </div>
      </div>

      <p className="text-xs text-stone-400 mb-3 leading-relaxed">{d.description}</p>

      {(d.weather.tempF > 0 || d.weather.condition) && (
        <div className="flex flex-wrap gap-3 text-xs text-stone-500 mb-2">
          {d.weather.tempF > 0 && (
            <span className="flex items-center gap-1">
              <Thermometer size={11} /> {d.weather.tempF}°F
            </span>
          )}
          {d.weather.condition && (
            <span className="flex items-center gap-1">
              <Wind size={11} /> {d.weather.condition}
            </span>
          )}
        </div>
      )}

      {softFlags.length > 0 && (
        <div className="space-y-1">
          {softFlags.map((f, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-yellow-400">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" />
              <span>{f.message}</span>
            </div>
          ))}
        </div>
      )}

      {hardFlags.length === 0 && softFlags.length === 0 && (
        <div className="flex items-center gap-1.5 text-xs text-green-400">
          <CheckCircle size={11} />
          <span>No active safety flags</span>
        </div>
      )}

      <p className="text-xs text-stone-500 mt-2 italic leading-relaxed">{d.reasoning}</p>

      {d.sourceUrl && (
        <a
          href={d.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-2"
        >
          <ExternalLink size={11} /> Official site
        </a>
      )}

      {selected && (
        <ItineraryView
          destination={d}
          duration={duration}
          stopIndex={rank}
          totalStops={totalStops}
          nextStopName={nextStopName}
          nextStopDriveHours={nextStopDriveHours}
          stopStartDate={stopStartDate}
          stopEndDate={stopEndDate}
        />
      )}
    </div>
  );
}
