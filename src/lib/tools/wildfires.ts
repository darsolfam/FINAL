import { Coordinates } from '@/types';
import { config } from '../config';

export interface FireIncident {
  name: string;
  coordinates: Coordinates;
  acres: number;
  containment: number;
}

export async function getNearbyWildfires(center: Coordinates, radiusMiles: number): Promise<FireIncident[]> {
  try {
    // NIFC active fire perimeters via ArcGIS REST — no key required
    const url =
      `https://services3.arcgis.com/T4QMspbfLg3qoC1z/arcgis/rest/services/WFIGS_Interagency_Perimeters_YTD/FeatureServer/0/query?` +
      `where=1%3D1` +
      `&outFields=poly_IncidentName,attr_TotalAcres,attr_PercentContained` +
      `&geometry=${center.lon},${center.lat}` +
      `&geometryType=esriGeometryPoint` +
      `&inSR=4326` +
      `&spatialRel=esriSpatialRelIntersects` +
      `&distance=${radiusMiles}&units=esriSRUnit_StatuteMile` +
      `&outSR=4326&f=json`;

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.features ?? []).map((f: any) => ({
      name: f.attributes.poly_IncidentName ?? 'Unknown Fire',
      coordinates: center,
      acres: f.attributes.attr_TotalAcres ?? 0,
      containment: f.attributes.attr_PercentContained ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function getNASAFirmHotspots(center: Coordinates, radiusMiles: number): Promise<number> {
  const mapKey = config.nasaFirmsKey;
  if (!mapKey) return 0;

  try {
    // Returns CSV of active fire hotspots detected in last 24h
    const url =
      `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/` +
      `${center.lon - 1},${center.lat - 1},${center.lon + 1},${center.lat + 1}/1`;

    const res = await fetch(url);
    if (!res.ok) return 0;
    const text = await res.text();
    const lines = text.trim().split('\n');
    return Math.max(0, lines.length - 1); // subtract header row
  } catch {
    return 0;
  }
}
