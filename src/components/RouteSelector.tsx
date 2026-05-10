'use client';

import { RouteOption } from '@/types';
import { Route, Clock, MapPin } from 'lucide-react';

interface Props {
  routes: RouteOption[];
  selectedRouteId: string | null;
  onSelect: (id: string) => void;
}

export default function RouteSelector({ routes, selectedRouteId, onSelect }: Props) {
  if (routes.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
        {routes.length} Route Option{routes.length !== 1 ? 's' : ''}
      </h2>
      <div className="space-y-2">
        {routes.map((r) => {
          const isSelected = r.id === selectedRouteId;
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`w-full text-left rounded-lg border p-3 transition-all ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-stone-700 bg-stone-900 hover:border-stone-500'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Route size={13} className={isSelected ? 'text-amber-400' : 'text-stone-400'} />
                <h3 className={`text-sm font-bold ${isSelected ? 'text-amber-300' : 'text-stone-100'}`}>
                  {r.name}
                </h3>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed mb-2">{r.theme}</p>
              <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <MapPin size={10} /> {r.stops.length} stop{r.stops.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={10} /> {r.totalMiles} mi
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={10} /> {r.totalDriveHours}h drive
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
