import { Coordinates } from '@/types';
import { config } from '../config';

export interface CampflareCampground {
  id: string;
  name: string;
  description: string;
  coordinates: Coordinates;
  kind: 'established' | 'dispersed';
  status: string;
  reservationUrl: string;
  amenities: {
    toilets: boolean;
    water: boolean;
    showers: boolean;
    petsAllowed: boolean;
    firesAllowed: boolean;
    electricHookups: boolean;
  };
  price: { min: number; max: number } | null;
  agency: string;
}

export async function searchCampflare(
  center: Coordinates,
  radiusMiles: number,
  kind?: 'established' | 'dispersed'
): Promise<CampflareCampground[]> {
  const apiKey = config.campflareKey;
  if (!apiKey) return [];

  // Convert radius in miles to a bounding box (~1 mile ≈ 0.0145 degrees)
  const deg = (radiusMiles / 69);
  const bbox = {
    min_latitude: center.lat - deg,
    max_latitude: center.lat + deg,
    min_longitude: center.lon - deg,
    max_longitude: center.lon + deg,
  };

  const body: Record<string, unknown> = { bbox, limit: 20, status: 'open' };
  if (kind) body.kind = kind;

  try {
    const res = await fetch('https://api.campflare.com/v2/campgrounds/search', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.campgrounds ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      description: (c.short_description ?? c.medium_description ?? '').slice(0, 300),
      coordinates: { lat: c.location.latitude, lon: c.location.longitude },
      kind: c.kind,
      status: c.status,
      reservationUrl: c.reservation_url ?? '',
      amenities: {
        toilets: !!c.amenities?.toilets,
        water: !!c.amenities?.water,
        showers: !!c.amenities?.showers,
        petsAllowed: !!c.amenities?.pets_allowed,
        firesAllowed: !!c.amenities?.fires_allowed,
        electricHookups: !!c.amenities?.electric_hookups,
      },
      price: c.price ? { min: c.price.minimum, max: c.price.maximum } : null,
      agency: c.management?.agency_name ?? '',
    }));
  } catch {
    return [];
  }
}
