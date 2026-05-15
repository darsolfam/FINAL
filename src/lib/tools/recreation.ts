import { Coordinates } from '@/types';
import { config } from '../config';

export interface RecreationFacility {
  id: string;
  name: string;
  description: string;
  coordinates: Coordinates;
  type: string;
  reservable: boolean;
  activities: string[];
}

export async function searchRecreationGov(
  center: Coordinates,
  radiusMiles: number,
  activity?: string
): Promise<RecreationFacility[]> {
  const apiKey = config.recreationGovKey;
  if (!apiKey || apiKey.startsWith('your_')) return [];

  const url =
    `https://ridb.recreation.gov/api/v1/facilities?` +
    `latitude=${center.lat}` +
    `&longitude=${center.lon}` +
    `&radius=${radiusMiles}` +
    (activity ? `&activity=${activity}` : '') +
    `&limit=25`;

  try {
    const res = await fetch(url, { headers: { apikey: apiKey } });
    if (!res.ok) return [];
    const data = await res.json();

    const STATE_MANAGED = /state park|state rec|state forest|state beach|state trail|state lake|state wildlife/i;

    return (data.RECDATA ?? [])
      .filter((f: any) => f.FacilityLatitude && f.FacilityLongitude)
      .map((f: any) => ({
        id: f.FacilityID,
        name: f.FacilityName,
        description: (f.FacilityDescription ?? '').replace(/<[^>]+>/g, '').slice(0, 300),
        coordinates: { lat: f.FacilityLatitude, lon: f.FacilityLongitude },
        type: f.FacilityTypeDescription ?? 'Recreation Area',
        reservable: !!f.Reservable,
        stateManaged: STATE_MANAGED.test(f.FacilityName ?? ''),
        activities: (f.ACTIVITY ?? []).map((a: any) => a.ActivityName).filter(Boolean),
      }));
  } catch {
    return [];
  }
}
