import { Coordinates } from '@/types';
import { config } from '../config';

export interface PlaceResult {
  name: string;
  coordinates: Coordinates;
  categories: string[];
  address: string;
}

export async function searchOverlandingDestinations(
  center: Coordinates,
  radiusMeters: number
): Promise<PlaceResult[]> {
  const apiKey = config.geoapifyKey;
  if (!apiKey) return [];

  const categories = [
    'camping',
    'leisure.park',
    'natural',
    'tourism.attraction',
  ].join(',');

  const url =
    `https://api.geoapify.com/v2/places?` +
    `categories=${categories}` +
    `&filter=circle:${center.lon},${center.lat},${radiusMeters}` +
    `&limit=20` +
    `&apiKey=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.features ?? []).map((f: any) => ({
      name: f.properties.name ?? 'Unnamed location',
      coordinates: { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] },
      categories: f.properties.categories ?? [],
      address: f.properties.formatted ?? '',
    }));
  } catch {
    return [];
  }
}

export async function geocode(location: string): Promise<Coordinates | null> {
  const apiKey = config.geoapifyKey;
  if (!apiKey) return null;

  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(location)}&apiKey=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const first = data.features?.[0];
    if (!first) return null;
    return {
      lat: first.geometry.coordinates[1],
      lon: first.geometry.coordinates[0],
    };
  } catch {
    return null;
  }
}

export async function getNearbyAttractions(
  center: Coordinates,
  radiusMeters: number = 16000
): Promise<PlaceResult[]> {
  const apiKey = config.geoapifyKey;
  if (!apiKey) return [];

  const categories = [
    'tourism.attraction',
    'tourism.sights',
    'natural',
    'leisure.park',
    'tourism.attraction.viewpoint',
  ].join(',');

  const url =
    `https://api.geoapify.com/v2/places?` +
    `categories=${categories}` +
    `&filter=circle:${center.lon},${center.lat},${radiusMeters}` +
    `&limit=12` +
    `&apiKey=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.features ?? []).map((f: any) => ({
      name: f.properties.name ?? 'Unnamed point of interest',
      coordinates: { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] },
      categories: f.properties.categories ?? [],
      address: f.properties.formatted ?? '',
    }));
  } catch {
    return [];
  }
}

export async function getDriveTime(
  origin: Coordinates,
  destination: Coordinates
): Promise<{ distanceMiles: number; driveTimeHours: number } | null> {
  const apiKey = config.geoapifyKey;
  if (!apiKey) return null;

  const url =
    `https://api.geoapify.com/v1/routing?` +
    `waypoints=${origin.lat},${origin.lon}|${destination.lat},${destination.lon}` +
    `&mode=drive&apiKey=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const leg = data.features?.[0]?.properties?.legs?.[0];
    if (!leg) return null;
    return {
      distanceMiles: Math.round(leg.distance / 1609.34),
      driveTimeHours: Math.round((leg.time / 3600) * 10) / 10,
    };
  } catch {
    return null;
  }
}
