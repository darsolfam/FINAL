import { Coordinates, ForecastDay } from '@/types';

export async function getExtendedForecast(coords: Coordinates): Promise<ForecastDay[]> {
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

    return (data.properties.periods ?? []).slice(0, 8).map((p: any) => ({
      name: p.name,
      tempF: p.temperature,
      shortForecast: p.shortForecast,
      detailed: p.detailedForecast,
      precipChance: p.probabilityOfPrecipitation?.value ?? undefined,
    }));
  } catch {
    return [];
  }
}
