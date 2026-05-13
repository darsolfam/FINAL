'use client';

import { useState } from 'react';
import InputForm from '@/components/InputForm';
import MapView from '@/components/MapView';
import ReasoningTrace from '@/components/ReasoningTrace';
import DestinationCard from '@/components/DestinationCard';
import RefusalScreen from '@/components/RefusalScreen';
import RouteSelector from '@/components/RouteSelector';
import LegConnector from '@/components/LegConnector';
import { UserQuery, PlanResult, TripDuration } from '@/types';
import { Compass } from 'lucide-react';

function distributeStopDates(
  tripStartDate: string,
  tripEndDate: string,
  totalStops: number
): Array<{ startDate: string; endDate: string }> {
  const start = new Date(tripStartDate);
  const end = new Date(tripEndDate);
  const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysPerStop = Math.floor(totalDays / totalStops);
  const remainder = totalDays % totalStops;
  const ranges: Array<{ startDate: string; endDate: string }> = [];
  let cursor = new Date(start);
  for (let i = 0; i < totalStops; i++) {
    const days = daysPerStop + (i < remainder ? 1 : 0);
    const stopStart = new Date(cursor);
    const stopEnd = new Date(cursor);
    stopEnd.setDate(stopEnd.getDate() + days);
    ranges.push({
      startDate: stopStart.toISOString().split('T')[0],
      endDate: stopEnd.toISOString().split('T')[0],
    });
    cursor = new Date(stopEnd);
  }
  return ranges;
}

export default function Home() {
  const [result, setResult] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastDuration, setLastDuration] = useState<TripDuration>('weekend');
  const [lastTripStartDate, setLastTripStartDate] = useState<string | undefined>();
  const [lastTripEndDate, setLastTripEndDate] = useState<string | undefined>();

  async function handleSubmit(query: UserQuery) {
    setLoading(true);
    setResult(null);
    setSelectedRouteId(null);
    setSelectedStopId(null);
    setError(null);
    setLastDuration(query.duration);
    setLastTripStartDate(query.tripStartDate);
    setLastTripEndDate(query.tripEndDate);

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      if (!res.ok) throw new Error('Server error');
      const data: PlanResult = await res.json();
      setResult(data);
      if (data.routes.length > 0) {
        setSelectedRouteId(data.routes[0].id);
        setSelectedStopId(data.routes[0].stops[0]?.id ?? null);
      }
    } catch {
      setError('Something went wrong. Check your API keys and try again.');
    } finally {
      setLoading(false);
    }
  }

  const routes = result?.routes ?? [];
  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const stops = selectedRoute?.stops ?? [];

  function handleSelectRoute(id: string) {
    setSelectedRouteId(id);
    const route = routes.find((r) => r.id === id);
    setSelectedStopId(route?.stops[0]?.id ?? null);
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <header className="border-b border-stone-800 px-6 py-4 flex items-center gap-3">
        <Compass size={22} className="text-amber-400" />
        <h1 className="text-base font-bold text-stone-100">Where Do We Go?</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-96 border-r border-stone-800 flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-stone-800">
            <InputForm onSubmit={handleSubmit} loading={loading} />
          </div>

          <div className="p-5 flex-1 space-y-4">
            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            {(loading || (result?.reasoningSteps && result.reasoningSteps.length > 0)) && (
              <ReasoningTrace steps={result?.reasoningSteps ?? []} loading={loading} />
            )}

            {result?.status === 'refused' && (
              <RefusalScreen
                reason={result.refusalReason ?? 'A safety check blocked this request.'}
                onReset={() => setResult(null)}
              />
            )}

            {result?.status === 'done' && routes.length > 0 && (
              <>
                {result.searchNote && (
                  <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-3 text-xs text-amber-200">
                    {result.searchNote}
                  </div>
                )}

                <RouteSelector
                  routes={routes}
                  selectedRouteId={selectedRouteId}
                  onSelect={handleSelectRoute}
                />

                {selectedRoute && (
                  <div>
                    <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3 mt-2">
                      {selectedRoute.name} — {stops.length} Stop{stops.length !== 1 ? 's' : ''}
                    </h2>
                    <div className="space-y-1">
                      {(() => {
                        const stopDateRanges =
                          lastTripStartDate && lastTripEndDate
                            ? distributeStopDates(lastTripStartDate, lastTripEndDate, stops.length)
                            : null;
                        return stops.map((d, i) => {
                          const prev = stops[i - 1];
                          const next = stops[i + 1];
                          const fromLabel = i === 0 ? (result.startLabel ?? 'Start') : prev.name;
                          const stopDates = stopDateRanges?.[i];
                          return (
                            <div key={d.id}>
                              {d.driveTimeHours > 0 && (
                                <LegConnector
                                  fromLabel={fromLabel}
                                  toLabel={d.name}
                                  driveTimeHours={d.driveTimeHours}
                                  distanceMiles={d.distanceMiles}
                                />
                              )}
                              <DestinationCard
                                destination={d}
                                rank={i + 1}
                                selected={selectedStopId === d.id}
                                duration={lastDuration}
                                totalStops={stops.length}
                                nextStopName={next?.name}
                                nextStopDriveHours={next?.driveTimeHours}
                                stopStartDate={stopDates?.startDate}
                                stopEndDate={stopDates?.endDate}
                                onClick={() => setSelectedStopId(d.id)}
                              />
                            </div>
                          );
                        });
                      })()}
                      {selectedRoute.returnDriveHours != null && selectedRoute.returnDistanceMiles != null && (
                        <LegConnector
                          fromLabel={stops[stops.length - 1]?.name ?? 'Last stop'}
                          toLabel={result.startLabel ?? 'Home'}
                          driveTimeHours={selectedRoute.returnDriveHours}
                          distanceMiles={selectedRoute.returnDistanceMiles}
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {result?.status === 'done' && routes.length === 0 && (
              <div className="bg-stone-800 border border-stone-700 rounded-lg p-4 text-center">
                <p className="text-sm font-semibold text-stone-200 mb-2">No routes found</p>
                <p className="text-xs text-stone-400 leading-relaxed">
                  {result.searchNote ?? 'No routes matched your constraints. Try adjusting your parameters or expanding the drive radius.'}
                </p>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 p-4">
          <MapView
            destinations={stops}
            selectedId={selectedStopId}
            onSelect={setSelectedStopId}
            startCoordinates={result?.startCoordinates}
            startLabel={result?.startLabel}
          />
        </main>
      </div>
    </div>
  );
}
