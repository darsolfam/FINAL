import { Coordinates, WeatherSnapshot } from '@/types';

async function getGridPoint(coords: Coordinates): Promise<{ gridId: string; gridX: number; gridY: number } | null> {
  const res = await fetch(
    `https://api.weather.gov/points/${coords.lat},${coords.lon}`,
    { headers: { 'User-Agent': 'WhereDoWeGo/1.0' } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const { gridId, gridX, gridY } = data.properties;
  return { gridId, gridX, gridY };
}

export async function getWeather(coords: Coordinates): Promise<WeatherSnapshot | null> {
  try {
    const grid = await getGridPoint(coords);
    if (!grid) return null;

    const res = await fetch(
      `https://api.weather.gov/gridpoints/${grid.gridId}/${grid.gridX},${grid.gridY}/forecast`,
      { headers: { 'User-Agent': 'WhereDoWeGo/1.0' } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const period = data.properties.periods[0];

    return {
      condition: period.shortForecast,
      tempF: period.temperature,
      windMph: parseInt(period.windSpeed) || 0,
      forecast: period.detailedForecast,
    };
  } catch {
    return null;
  }
}
