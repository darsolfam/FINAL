export interface TravelAdvisory {
  country: string;
  level: number; // 1=normal, 2=caution, 3=reconsider, 4=doNotTravel
  message: string;
}

let cachedAdvisories: TravelAdvisory[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getTravelAdvisories(): Promise<TravelAdvisory[]> {
  if (cachedAdvisories && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedAdvisories;
  }

  try {
    const res = await fetch(
      'https://travel.state.gov/content/dam/NEWTravelAssets/pdfs/traveladvisories.json',
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();

    cachedAdvisories = (data.advisories ?? []).map((a: any) => ({
      country: a.country ?? '',
      level: parseInt(a.level) || 1,
      message: a.message ?? '',
    }));
    cacheTimestamp = Date.now();
    return cachedAdvisories ?? [];
  } catch {
    return [];
  }
}

export async function checkAdvisoryForRegion(regionName: string): Promise<TravelAdvisory | null> {
  const advisories = await getTravelAdvisories();
  const lower = regionName.toLowerCase();
  return (
    advisories.find(
      (a) => a.level >= 3 && lower.includes(a.country.toLowerCase())
    ) ?? null
  );
}
