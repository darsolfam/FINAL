export type VehicleTier = 'street' | 'stock4wd' | 'lifted' | 'overlander';

export type TripDuration = 'day' | 'weekend' | 'multiday';

export type ComfortLevel = 'light' | 'medium' | 'hard';

export interface UserQuery {
  startingLocation: string;
  duration: TripDuration;
  maxDriveHours: number;
  vehicleTier: VehicleTier;
  comfortLevel: ComfortLevel;
  freeformConstraints: string;
}

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface WeatherSnapshot {
  condition: string;
  tempF: number;
  windMph: number;
  forecast: string;
}

export interface SafetyFlag {
  type: 'wildfire' | 'advisory' | 'closure' | 'weather' | 'vehicle';
  severity: 'hard' | 'soft';
  message: string;
}

export interface Destination {
  id: string;
  name: string;
  coordinates: Coordinates;
  description: string;
  distanceMiles: number;
  driveTimeHours: number;
  terrainRating: VehicleTier;
  weather: WeatherSnapshot;
  safetyFlags: SafetyFlag[];
  score: number;
  reasoning: string;
}

export interface ReasoningStep {
  thought: string;
  action?: string;
  observation?: string;
}

export type PlanStatus = 'idle' | 'thinking' | 'refused' | 'done' | 'error';

export interface RouteOption {
  id: string;
  name: string;
  theme: string;
  stops: Destination[];
  totalMiles: number;
  totalDriveHours: number;
  reasoning: string;
}

export interface PlanResult {
  status: PlanStatus;
  routes: RouteOption[];
  reasoningSteps: ReasoningStep[];
  refusalReason?: string;
  searchNote?: string;
  startCoordinates?: Coordinates;
  startLabel?: string;
}

export interface ForecastDay {
  name: string;
  tempF: number;
  shortForecast: string;
  detailed: string;
  precipChance?: number;
}

export interface NearbyPOI {
  name: string;
  category: string;
  distanceMiles?: number;
}

export interface Itinerary {
  forecast: ForecastDay[];
  pointsOfInterest: NearbyPOI[];
  narrative: string;
}
