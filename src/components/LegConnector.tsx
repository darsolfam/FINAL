'use client';

import { Navigation, Clock, MapPin } from 'lucide-react';

interface Props {
  fromLabel: string;
  toLabel: string;
  driveTimeHours: number;
  distanceMiles: number;
}

function formatDriveTime(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function LegConnector({ fromLabel, toLabel, driveTimeHours, distanceMiles }: Props) {
  return (
    <div className="relative flex items-stretch py-1 pl-3">
      <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500/50 via-amber-500 to-amber-500/50" />
      <div className="ml-6 flex items-center gap-2 bg-stone-800/60 border border-stone-700 rounded-md px-3 py-1.5 text-xs text-stone-300">
        <Navigation size={11} className="text-amber-400 shrink-0" />
        <span className="text-stone-400">
          <span className="text-stone-500">{fromLabel}</span>
          <span className="mx-1.5 text-stone-600">→</span>
          <span className="text-stone-300 font-medium">{toLabel}</span>
        </span>
        <span className="ml-auto flex items-center gap-2 text-stone-400">
          <span className="flex items-center gap-1">
            <Clock size={10} /> {formatDriveTime(driveTimeHours)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={10} /> {distanceMiles} mi
          </span>
        </span>
      </div>
    </div>
  );
}
