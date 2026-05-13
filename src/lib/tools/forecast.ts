import { Coordinates, ForecastDay } from '@/types';

export async function getExtendedForecast(
  coords: Coordinates,
  tripStartDate?: string
): Promise<ForecastDay[]> {
  try {
    const pointsRes = await fetch(
      `https://api.weather.gov/points/${coords.lat},${coords.lon}`,
      { headers: { 'User-Agent': 'WhereDoWeGo/1.0' } }
    );
    if (!pointsRes.ok) return [];
    const pointsData = await pointsRes.json();
    const { gridId, gridX, gridY } = pointsData.properties;

    const forecastRes = await fetch(
      `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast`,
      { headers: { 'User-Agent': 'WhereDoWeGo/1.0' } }
    );
    if (!forecastRes.ok) return [];
    const data = await forecastRes.json();

    const periods: ForecastDay[] = (data.properties.periods ?? []).map((p: any) => ({
      name: p.name,
      tempF: p.temperature,
      shortForecast: p.shortForecast,
      detailed: p.detailedForecast,
      precipChance: p.probabilityOfPrecipitation?.value ?? undefined,
      startTime: p.startTime as string,
    }));

    if (!tripStartDate) return periods.slice(0, 8);

    const tripStart = new Date(tripStartDate);
    const now = new Date();
    const daysUntilTrip = Math.round((tripStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // NWS forecasts cover ~7 days. If trip is beyond that, return current forecast
    // with a note so the itinerary can warn the user.
    if (daysUntilTrip > 7) {
      return periods.slice(0, 8).map((p) => ({
        ...p,
        name: `${p.name} (current — trip forecast unavailable until ~${formatDate(addDays(now, daysUntilTrip - 7))})`,
      }));
    }

    // Filter to periods that start on or after the trip start date.
    const tripStartStr = tripStart.toISOString().split('T')[0];
    const filtered = periods.filter((p) => {
      const periodDate = (p as any).startTime?.split('T')[0] ?? '';
      return periodDate >= tripStartStr;
    });

    return (filtered.length > 0 ? filtered : periods).slice(0, 8);
  } catch {
    return [];
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
