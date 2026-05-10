import { Coordinates } from '@/types';

export interface DispersedSpot {
  name: string;
  coordinates: Coordinates;
  type: string;
  tags: Record<string, string>;
}

export async function searchDispersedCamping(
  center: Coordinates,
  radiusMiles: number
): Promise<DispersedSpot[]> {
  const radiusMeters = Math.round(radiusMiles * 1609.34);

  // OSM features that indicate dispersed/primitive/free overlanding camping
  // Plus 4x4 tracks and remote backcountry features
  const query = `
    [out:json][timeout:20];
    (
      node["tourism"="camp_pitch"](around:${radiusMeters},${center.lat},${center.lon});
      node["tourism"="camp_site"]["fee"="no"](around:${radiusMeters},${center.lat},${center.lon});
      node["tourism"="camp_site"]["camp_site"="basic"](around:${radiusMeters},${center.lat},${center.lon});
      node["tourism"="wilderness_hut"](around:${radiusMeters},${center.lat},${center.lon});
      node["informal"="yes"]["tourism"="camp_site"](around:${radiusMeters},${center.lat},${center.lon});
    );
    out body 30;
  `.trim();

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.elements ?? [])
      .filter((el: any) => el.lat && el.lon)
      .map((el: any) => ({
        name: el.tags?.name ?? `Dispersed site (${el.tags?.tourism ?? 'primitive'})`,
        coordinates: { lat: el.lat, lon: el.lon },
        type: el.tags?.tourism ?? 'unknown',
        tags: el.tags ?? {},
      }));
  } catch {
    return [];
  }
}

export async function searchOffroadTrails(
  center: Coordinates,
  radiusMiles: number
): Promise<DispersedSpot[]> {
  const radiusMeters = Math.round(radiusMiles * 1609.34);

  const query = `
    [out:json][timeout:20];
    (
      way["highway"="track"]["4wd_only"="yes"](around:${radiusMeters},${center.lat},${center.lon});
      way["highway"="track"]["tracktype"~"grade[3-5]"](around:${radiusMeters},${center.lat},${center.lon});
    );
    out center 20;
  `.trim();

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.elements ?? [])
      .filter((el: any) => el.center?.lat || el.lat)
      .map((el: any) => ({
        name: el.tags?.name ?? `4x4 track (grade ${el.tags?.tracktype ?? 'unknown'})`,
        coordinates: {
          lat: el.center?.lat ?? el.lat,
          lon: el.center?.lon ?? el.lon,
        },
        type: 'offroad_trail',
        tags: el.tags ?? {},
      }));
  } catch {
    return [];
  }
}
