import Anthropic from '@anthropic-ai/sdk';
import { geocode, searchOverlandingDestinations, getDriveTime } from './tools/places';
import { getWeather } from './tools/weather';
import { getNearbyWildfires, getNASAFirmHotspots } from './tools/wildfires';
import { checkAdvisoryForRegion } from './tools/advisories';
import { searchRecreationGov } from './tools/recreation';
import { searchDispersedCamping, searchOffroadTrails } from './tools/dispersed';
import { config } from './config';
import {
  UserQuery,
  Destination,
  ReasoningStep,
  PlanResult,
  SafetyFlag,
  VehicleTier,
} from '@/types';


const VEHICLE_TIER_ORDER: VehicleTier[] = ['street', 'stock4wd', 'lifted', 'overlander'];

function vehicleTierMeetsRequirement(userTier: VehicleTier, required: VehicleTier): boolean {
  return VEHICLE_TIER_ORDER.indexOf(userTier) >= VEHICLE_TIER_ORDER.indexOf(required);
}

const tools: Anthropic.Tool[] = [
  {
    name: 'geocode_location',
    description: 'Convert a place name or address to GPS coordinates.',
    input_schema: {
      type: 'object' as const,
      properties: {
        location: { type: 'string', description: 'The place name or address to geocode.' },
      },
      required: ['location'],
    },
  },
  {
    name: 'search_recreation_gov',
    description: 'Search official US federal recreation areas (NPS, BLM, USFS) — campgrounds, beaches, trailheads, OHV areas, national seashores. Highest-quality data source for overlanding destinations. By default omit the activity filter to get all facilities (broader results). Use this FIRST before generic place search.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lat: { type: 'number' },
        lon: { type: 'number' },
        radius_miles: { type: 'number' },
        activity: { type: 'string', description: 'Optional activity filter (CAMPING, OFF_ROADING, HIKING, BEACH). Usually OMIT this for broader results — many great overland spots are tagged under unexpected activities.' },
      },
      required: ['lat', 'lon', 'radius_miles'],
    },
  },
  {
    name: 'search_dispersed_camping',
    description: 'Find dispersed/primitive/free camping spots from OpenStreetMap (off-the-beaten-path, no reservations, often remote). Use this to find EPIC, less-trafficked spots that real overlanders prefer.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lat: { type: 'number' },
        lon: { type: 'number' },
        radius_miles: { type: 'number' },
      },
      required: ['lat', 'lon', 'radius_miles'],
    },
  },
  {
    name: 'search_offroad_trails',
    description: 'Find 4x4 trails and technical tracks from OpenStreetMap. Only use for users with lifted or full overlander vehicle tiers — these are not for street vehicles.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lat: { type: 'number' },
        lon: { type: 'number' },
        radius_miles: { type: 'number' },
      },
      required: ['lat', 'lon', 'radius_miles'],
    },
  },
  {
    name: 'search_destinations',
    description: 'Find generic places (parks, natural areas) near a coordinate. Use as a fallback if Recreation.gov returns nothing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lat: { type: 'number' },
        lon: { type: 'number' },
        radius_miles: { type: 'number', description: 'Search radius in miles.' },
      },
      required: ['lat', 'lon', 'radius_miles'],
    },
  },
  {
    name: 'get_weather',
    description: 'Get current weather and forecast for a GPS coordinate.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lat: { type: 'number' },
        lon: { type: 'number' },
      },
      required: ['lat', 'lon'],
    },
  },
  {
    name: 'check_wildfires',
    description: 'Check for active wildfire perimeters and satellite hotspots near a coordinate.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lat: { type: 'number' },
        lon: { type: 'number' },
        radius_miles: { type: 'number' },
      },
      required: ['lat', 'lon', 'radius_miles'],
    },
  },
  {
    name: 'check_travel_advisory',
    description: 'Check U.S. State Department travel advisories for a named region or country.',
    input_schema: {
      type: 'object' as const,
      properties: {
        region_name: { type: 'string' },
      },
      required: ['region_name'],
    },
  },
  {
    name: 'get_drive_time',
    description: 'Get drive distance and time between two coordinates.',
    input_schema: {
      type: 'object' as const,
      properties: {
        origin_lat: { type: 'number' },
        origin_lon: { type: 'number' },
        dest_lat: { type: 'number' },
        dest_lon: { type: 'number' },
      },
      required: ['origin_lat', 'origin_lon', 'dest_lat', 'dest_lon'],
    },
  },
  {
    name: 'submit_recommendations',
    description: 'Submit 2-3 ALTERNATIVE ROUTES the user can choose between. Each route is an ordered sequence of campsite stops with a distinct theme/character. For day trips: each route has 1 destination. For weekends: 2-3 stops per route. For multi-day: 3-5 stops per route.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search_note: { type: 'string', description: 'Optional explanation when results are sparse.' },
        routes: {
          type: 'array',
          description: 'Array of 2-3 alternative routes, each with a distinct theme.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Short evocative route name, e.g. "The Coastal Loop", "Pisgah High-Country".' },
              theme: { type: 'string', description: 'One sentence describing what makes this route distinct from the others.' },
              reasoning: { type: 'string', description: 'Why this route fits the user constraints.' },
              stops: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    lat: { type: 'number' },
                    lon: { type: 'number' },
                    description: { type: 'string' },
                    terrain_rating: { type: 'string', enum: ['street', 'stock4wd', 'lifted', 'overlander'] },
                    reasoning: { type: 'string' },
                    score: { type: 'number' },
                    distance_miles: { type: 'number', description: 'LEG distance from previous stop or start.' },
                    drive_time_hours: { type: 'number', description: 'LEG drive time from previous stop or start.' },
                  },
                  required: ['name', 'lat', 'lon', 'description', 'terrain_rating', 'reasoning', 'score', 'distance_miles', 'drive_time_hours'],
                },
              },
            },
            required: ['name', 'theme', 'reasoning', 'stops'],
          },
        },
      },
      required: ['routes'],
    },
  },
  {
    name: 'hard_refusal',
    description: 'Issue a hard refusal when a critical safety condition is detected. This ends the planning loop.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', description: 'Clear explanation of why no recommendations can be made.' },
        triggered_by: { type: 'string', description: 'The specific safety condition that triggered this refusal.' },
      },
      required: ['reason', 'triggered_by'],
    },
  },
];

async function executeTool(name: string, input: Record<string, any>): Promise<string> {
  switch (name) {
    case 'geocode_location': {
      const coords = await geocode(input.location);
      return coords ? JSON.stringify(coords) : 'Could not geocode location.';
    }
    case 'search_destinations': {
      const results = await searchOverlandingDestinations(
        { lat: input.lat, lon: input.lon },
        input.radius_miles * 1609.34
      );
      return JSON.stringify(results.slice(0, 10));
    }
    case 'search_recreation_gov': {
      const results = await searchRecreationGov(
        { lat: input.lat, lon: input.lon },
        input.radius_miles,
        input.activity ?? 'CAMPING'
      );
      return JSON.stringify(results);
    }
    case 'search_dispersed_camping': {
      const results = await searchDispersedCamping(
        { lat: input.lat, lon: input.lon },
        input.radius_miles
      );
      return JSON.stringify(results);
    }
    case 'search_offroad_trails': {
      const results = await searchOffroadTrails(
        { lat: input.lat, lon: input.lon },
        input.radius_miles
      );
      return JSON.stringify(results);
    }
    case 'get_weather': {
      const weather = await getWeather({ lat: input.lat, lon: input.lon });
      return weather ? JSON.stringify(weather) : 'Weather data unavailable.';
    }
    case 'check_wildfires': {
      const [perimeters, hotspots] = await Promise.all([
        getNearbyWildfires({ lat: input.lat, lon: input.lon }, input.radius_miles),
        getNASAFirmHotspots({ lat: input.lat, lon: input.lon }, input.radius_miles),
      ]);
      return JSON.stringify({ active_perimeters: perimeters, satellite_hotspots_24h: hotspots });
    }
    case 'check_travel_advisory': {
      const advisory = await checkAdvisoryForRegion(input.region_name);
      return advisory ? JSON.stringify(advisory) : 'No Level 3+ advisory found for this region.';
    }
    case 'get_drive_time': {
      const result = await getDriveTime(
        { lat: input.origin_lat, lon: input.origin_lon },
        { lat: input.dest_lat, lon: input.dest_lon }
      );
      return result ? JSON.stringify(result) : 'Routing data unavailable.';
    }
    default:
      return 'Unknown tool.';
  }
}

export async function runPlanningAgent(query: UserQuery): Promise<PlanResult> {
  const client = new Anthropic({ apiKey: config.anthropicKey });

  // Geocode the start location upfront so we can render a start pin even on errors.
  const startCoordinates = (await geocode(query.startingLocation)) ?? undefined;
  const reasoningSteps: ReasoningStep[] = [];

  const systemPrompt = `You are an expert overlanding trip planner for U.S.-based adventurers.
Your job is to design 2-3 ALTERNATIVE multi-stop ROUTES the user can choose between.

ROUTE PLANNING MODEL:
- Each route is an ordered sequence of campsite stops (one route = one journey).
- Day trip: 1 destination per route.
- Weekend: 2-3 stops per route along a logical loop or progression.
- Multi-day expedition: 3-5 stops per route as a coherent journey.

Each route MUST have a distinct character/theme — don't return three variations of the same trip:
- One could be coastal/water-focused
- One could be mountain/high-elevation
- One could be desert/canyon
- Or by terrain difficulty (mellow vs technical)
- Or by experience type (solitude vs scenic landmarks)

Give each route an evocative name (e.g. "The Coastal Loop", "Pisgah High-Country Run", "Cedar Mesa Solitude"). Within each route, geographic flow matters — avoid backtracking, prefer loops or progressions.

SAFETY RULES (non-negotiable):
- If you find active wildfire perimeters OR more than 5 NASA satellite hotspots within 30 miles of ANY destination, issue a hard_refusal immediately.
- If a State Department Level 3 or 4 advisory applies to the region, issue a hard_refusal.
- If a destination requires a vehicle tier higher than the user's, exclude it silently.
- Never recommend a destination you haven't verified with weather and wildfire data.

VEHICLE TIERS (lowest to highest capability):
- street: paved roads only
- stock4wd: light dirt and maintained forest roads
- lifted: rocky terrain, moderate off-road
- overlander: technical routes, shelf roads, water crossings

PROCESS:
1. Geocode the starting location.
2. Search broadly for candidates in 2-3 different directions/themes from the start:
   a. search_recreation_gov (federal sites — campgrounds, beaches, OHV, seashores).
   b. search_dispersed_camping (primitive/free/remote).
   c. If user has lifted or overlander tier, also search_offroad_trails.
3. Group candidates into 2-3 distinct ROUTE OPTIONS, each with its own theme.
4. For each route, pick stops that form a coherent journey — loop, progression, or hub-and-spoke.
5. Verify drive times between consecutive stops (chained: start→stop1, stop1→stop2, etc.) USING PARALLEL TOOL CALLS.
6. Check weather, wildfires for at least the primary stop in each route.
7. Submit all routes via submit_recommendations. Each stop's distance_miles and drive_time_hours are LEG distances.

EFFICIENCY RULES (avoid wasting time):
- USE PARALLEL TOOL CALLS whenever possible. When checking multiple candidates, call get_weather, check_wildfires, and get_drive_time for ALL candidates in a SINGLE response with multiple tool_use blocks. Do NOT serialize these calls one at a time.
- Investigate at most 3 candidate destinations in detail (weather + wildfires + drive time).
- If your initial searches return fewer than 3 viable candidates total, STOP searching wider radii. Submit what you have with a search_note explaining the regional limitation.
- Don't repeat the same search with marginally different parameters.
- Aim to call submit_recommendations within 6-8 iterations.

UNIQUE-ACCESS DESTINATIONS (often overlooked — actively look for these):
- Ferry-accessed islands (e.g. Cape Lookout / North Core Banks NC via Morris Marina ferry, Padre Island NS in TX)
- Beach driving zones (Outer Banks NC, Padre Island TX, Daytona FL, Oregon Dunes)
- OHV / off-road vehicle parks (especially in regions with limited dispersed camping)
- National Seashores and Lakeshores — many allow primitive vehicle camping
- BLM Long-Term Visitor Areas (Quartzsite AZ-style)
- State park primitive zones if federal options are sparse

These are gold for overlanders and frequently missed by generic search. Specifically check if any are in range.

CURATION RULES (this is what makes the recommendations EPIC, not generic):
- The final list MUST blend source types. Don't return 5 popular Recreation.gov campgrounds — that's what every blog already has.
- Aim for at least 1 dispersed/primitive spot in the top 3 if any are available.
- Score "epic-ness" higher for: remote locations, fewer crowds, terrain that matches the user's vehicle's full capability, unique features (high altitude, water, ghost towns, dark skies).
- A reservable Recreation.gov site is fine, but a free dispersed BLM spot 30 minutes further with a view is BETTER for an overlander.
- Always explain in the reasoning field WHY this destination is special, not just that it exists.

User's vehicle tier: ${query.vehicleTier}
Trip duration: ${query.duration}
Max drive time (one-way): ${query.maxDriveHours} hours
Comfort level: ${query.comfortLevel}
Additional constraints: ${query.freeformConstraints || 'none'}

COMFORT LEVEL RULES (critical — this drives source mix and filtering):
- "light": REQUIRE amenities. Prefer Recreation.gov reservable sites with toilets and water. Exclude dispersed/primitive spots. Prefer sites with cell service. Family-friendly default.
- "medium": Prefer remote but not fully off-grid. Mix Recreation.gov and dispersed. Some cell coverage expected. The default overlanding experience.
- "hard": Fully off-grid. Heavily favor dispersed camping (Overpass) and primitive BLM/USFS sites. No cell service required. Self-sufficient travelers only — no hand-holding. Soft-warn if any candidate is too close to populated areas.

DURATION LOGIC (critical):
- "day" trip: User needs to return same day. The destination should be no more than HALF of max drive time away (so total round-trip + activity time fits in one day). Aim for destinations 1-3 hours one-way max.
- "weekend": One-way drive of up to ${query.maxDriveHours} hours is acceptable. Allow full radius.
- "multiday": Full one-way radius acceptable, can be at the maximum.

If a candidate destination's one-way drive time exceeds the duration-appropriate limit, exclude it.`;

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Find me overlanding destinations starting from: ${query.startingLocation}`,
    },
  ];

  let finalResult: PlanResult = {
    status: 'thinking',
    routes: [],
    reasoningSteps: [],
    startCoordinates,
    startLabel: query.startingLocation,
  };

  for (let iteration = 0; iteration < 18; iteration++) {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    });

    // Capture text reasoning
    for (const block of response.content) {
      if (block.type === 'text' && block.text.trim()) {
        reasoningSteps.push({ thought: block.text.trim() });
      }
    }

    if (response.stop_reason === 'end_turn') {
      finalResult = {
        status: 'done',
        routes: [],
        reasoningSteps,
        startCoordinates,
        startLabel: query.startingLocation,
      };
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        if (block.type !== 'tool_use') continue;

        const step: ReasoningStep = {
          thought: reasoningSteps[reasoningSteps.length - 1]?.thought ?? '',
          action: `${block.name}(${JSON.stringify(block.input)})`,
        };

        // Handle terminal tools
        if (block.name === 'hard_refusal') {
          const input = block.input as { reason: string; triggered_by: string };
          finalResult = {
            status: 'refused',
            routes: [],
            reasoningSteps,
            refusalReason: input.reason,
            startCoordinates,
            startLabel: query.startingLocation,
          };
          return finalResult;
        }

        if (block.name === 'submit_recommendations') {
          const input = block.input as { routes: any[]; search_note?: string };
          const routes = (input.routes ?? [])
            .map((r) => {
              const validStops: Destination[] = (r.stops ?? [])
                .filter((s: any) => vehicleTierMeetsRequirement(query.vehicleTier, s.terrain_rating))
                .map((s: any) => ({
                  id: crypto.randomUUID(),
                  name: s.name,
                  coordinates: { lat: s.lat, lon: s.lon },
                  description: s.description,
                  distanceMiles: s.distance_miles ?? 0,
                  driveTimeHours: s.drive_time_hours ?? 0,
                  terrainRating: s.terrain_rating,
                  weather: { condition: '', tempF: 0, windMph: 0, forecast: '' },
                  safetyFlags: [],
                  score: s.score,
                  reasoning: s.reasoning,
                }));
              const totalMiles = validStops.reduce((sum, s) => sum + s.distanceMiles, 0);
              const totalDriveHours = validStops.reduce((sum, s) => sum + s.driveTimeHours, 0);
              return {
                id: crypto.randomUUID(),
                name: r.name ?? 'Route',
                theme: r.theme ?? '',
                reasoning: r.reasoning ?? '',
                stops: validStops,
                totalMiles: Math.round(totalMiles),
                totalDriveHours: Math.round(totalDriveHours * 10) / 10,
              };
            })
            .filter((r) => r.stops.length > 0);

          step.observation = `Submitted ${routes.length} routes with ${routes.reduce((sum, r) => sum + r.stops.length, 0)} total stops.`;
          reasoningSteps.push(step);
          finalResult = {
            status: 'done',
            routes,
            reasoningSteps,
            searchNote: input.search_note,
            startCoordinates,
            startLabel: query.startingLocation,
          };
          return finalResult;
        }

        const observation = await executeTool(block.name, block.input as Record<string, any>);
        step.observation = observation;
        reasoningSteps.push(step);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: observation,
        });
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  // Loop exhausted without the agent calling submit_recommendations.
  // Return whatever destinations we accumulated with an explanation.
  return {
    status: 'done',
    routes: [],
    reasoningSteps,
    searchNote:
      'The agent ran out of search iterations before finalizing routes. This region likely has limited overlanding options — try a different starting point or expand your drive radius.',
    startCoordinates,
    startLabel: query.startingLocation,
  };
}
