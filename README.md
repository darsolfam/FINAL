# Where Do We Go?

An AI-powered overlanding trip planner that uses a live ReAct agent to recommend multi-stop backcountry routes — grounded in real campground data, wildfire feeds, and weather forecasts.

**Live app:** https://final-zeta-lime.vercel.app/

---

## Context, User, and Problem

**Who is the user?** Overlanders — people who take multi-day off-road trips into backcountry terrain using 4WD or lifted vehicles. They camp in federal lands, dispersed sites, and remote areas far from cell service.

**What workflow are we improving?** Today, planning an overlanding trip means opening 5–10 separate tools: Recreation.gov for campground availability, a weather app, a wildfire map, Google Maps for drive times, iOverlander for dispersed sites, and the State Department for international travel advisories. None of these tools communicate with each other, and none reason about the trip holistically.

**Why does it matter?** Backcountry conditions change fast. A campground that was open yesterday may be inside an active fire perimeter today. A road that looks fine on a map may add 3 hours to a drive when dirt multipliers and elevation are factored in. Static recommendation engines can't handle this — they retrieve, they don't reason. The gap between "here is a list of campgrounds" and "here is a safe, realistic, day-by-day plan for your specific vehicle, dates, and experience level" is exactly where an agent adds value.

---

## Solution and Design

**What was built:** A Next.js web app where the user enters a starting location, travel dates, vehicle capability, and comfort level. A Claude-powered agent then plans a complete multi-stop overlanding route with per-stop day itineraries, weather forecasts, and safety checks.

### Architecture

```
User Input (form)
    │
    ▼
/api/route  ──► ReAct Agent (Claude Haiku, up to 18 iterations)
                    │
                    ├── search_recreation_gov     (RIDB / Recreation.gov API)
                    ├── search_dispersed_camping  (OpenStreetMap Overpass API)
                    ├── get_nearby_places         (Geoapify Places API)
                    ├── get_weather               (NWS / weather.gov API)
                    ├── check_wildfires           (NASA FIRMS satellite data)
                    ├── check_travel_advisories   (State Dept. API)
                    ├── get_drive_time            (Geoapify Routing + terrain multipliers)
                    └── submit_recommendations    (terminal tool — ends the loop)
                    │
                    ▼
/api/itinerary  ──► Per-stop narrative (Claude Haiku, date-scoped)
                    │
                    ├── NWS Extended Forecast (date-aligned)
                    └── Geoapify Nearby Attractions
```

### Key GenAI Design Choices

**1. ReAct pattern with a terminal tool**
The agent runs a reason → act → observe loop. It cannot exit until it calls `submit_recommendations` with a structured JSON payload. This forces it to gather evidence before concluding — it cannot hallucinate a route on the first turn.

**2. Prompt caching**
The system prompt (~800 tokens of overlanding domain expertise) is marked with `cache_control: ephemeral`. Across up to 18 iterations, this prompt is processed once and cached, reducing both latency and token cost significantly.

**3. Parallel tool execution**
All tool-use blocks within a single agent turn are executed concurrently via `Promise.all`. A turn that calls weather + wildfires + drive time completes in the time of the slowest API call, not the sum of all three. This cuts average planning time by ~40% compared to sequential execution.

**4. Hard refusal on safety tools**
Wildfire and travel advisory tools are checked first, before `Promise.all` runs on other tools. If active fire data or a State Dept. advisory intersects the destination, the agent issues a `hard_refusal` and the destination is excluded from recommendations — not warned about, excluded.

**5. Server-side URL construction**
The agent is explicitly prohibited from generating URLs. All source links (Recreation.gov campground pages, iOverlander maps) are constructed server-side from verified API-returned IDs. This structurally prevents the model from hallucinating URLs.

**6. Off-road drive time multipliers**
Drive times use road type multipliers on top of base routing: `dirt × 1.6`, `technical × 2.5`. A 60-mile technical trail isn't 1.5 hours — it's closer to 3–4. Standard mapping APIs don't account for this.

**7. Date-aware forecast alignment**
When a trip start date is within the NWS 7-day forecast window, forecast periods are filtered to match actual trip dates. When the trip is further out, the forecast is annotated with a "check back closer to your trip" note rather than showing irrelevant current conditions.

**8. Per-stop date distribution**
For multi-stop trips, total trip days are divided evenly across stops (remainder days given to earlier stops). Each stop's itinerary API call receives an explicit `stopStartDate`, `stopEndDate`, and day count — so a 3-stop weekend generates proportional itineraries per stop, not the full trip duration repeated at every stop.

---

## Evaluation and Results

### Baseline
Zero-shot prompt to the same model (Claude Haiku) with the same user query, but no tools — just generate a trip recommendation from training data.

### Test Cases

| # | Input | What was evaluated |
|---|-------|-------------------|
| 1 | Salt Lake City, UT → 5-day trip, 3 stops, Full Overlander | Multi-stop date distribution, itinerary coherence |
| 2 | Bozeman, MT → weekend, Lifted, campground with real Recreation.gov ID | URL validity, campground link accuracy |
| 3 | International origin → travel advisory region | State Dept. advisory integration |

### Findings

**Factual grounding:** The baseline invented campsite names, mileage figures, and URLs that returned 404s. The agent version grounds every recommendation in a real API result — facility names come from RIDB, coordinates from OSM, URLs constructed from verified IDs.

**Coherence:** The baseline generated flat, non-sequential itineraries with no awareness of drive time, camp setup, or departure logistics. The agent's itineraries include arrival/departure structure, Day 1 camp setup, and a return drive leg — because the domain expertise is encoded in the system prompt, not inferred at generation time.

**Itinerary scoping:** Without per-stop date distribution, each stop in a 3-stop trip received the full trip window and generated redundant multi-day itineraries. With the fix, each stop correctly receives its proportional date range.

**URL validity:** Before server-side URL construction, the model invented URLs that did not exist. Post-fix, all URLs either point to verified RIDB facility pages or fall back to Recreation.gov name-based search queries that always resolve.

### Hallucinations Caught and Fixed

Two hallucinations were identified during demo preparation and corrected iteratively:

**1. Invented URL (`visithomoer.com`)**
The agent generated a campground recommendation with a fabricated website URL that returned a 404. Root cause: the model was asked to produce a `source_url` field and generated a plausible-looking but invented domain from training data. Fix: URLs are now constructed entirely server-side from verified API-returned IDs. The agent is explicitly prohibited from generating URLs in its schema instructions.

**2. State park served via Recreation.gov URL**
The RIDB API returned a state park facility (`Horsethief Reservoir State Park`) alongside federal sites. The app constructed a `recreation.gov/search?q=...` URL for it, which resolved to zero results — effectively a broken link. Root cause: Recreation.gov only indexes federal land; state parks exist in the RIDB database but have no corresponding Recreation.gov page. Fix: state-managed facilities are now detected by name pattern, labeled as `"State Park"` in the result, and linked to a Google search URL instead of Recreation.gov.

Both fixes are structural rather than prompt-based — the model cannot reproduce either hallucination regardless of how it reasons, because the problematic outputs are no longer generated at the model layer.

---

## Artifact Snapshot

### Sample Input
```
Starting from: Denver, CO
Departure: May 17, 2026  |  Return: May 19, 2026
Vehicle: Stock 4WD  |  Comfort: Medium  |  Group: Solo
```

### Sample Output (one stop from a 2-stop route)
```
STOP 1 — Mount Evans Dispersed Area
Score: 8.2/10  |  Terrain: Stock 4WD  |  2 days

Day 1 — Sat May 17
Travel: 1.5 hrs (58 miles via Hwy 103)
Set up camp at Echo Lake Campground. Afternoon hike on Chicago Lakes Trail.
Camp: Echo Lake Campground (backup: Chief Mountain Trailhead dispersed, ~20 min)

Day 2 — Sun May 18
Travel: no drive — camp day
Summit drive on Mount Evans Scenic Byway. Afternoon: wildflower meadows near Summit Lake.
Camp: Echo Lake Campground (backup: Chief Mountain Trailhead dispersed, ~20 min)

Forecast:
- Sat May 17: Partly Cloudy, 54°F
- Sun May 18: Sunny, 61°F

Nearby: Echo Lake Park, Mount Evans Wilderness, Chicago Lakes Trailhead
Official site: https://www.recreation.gov/camping/campgrounds/232493
```

---

## Setup and Usage

### Prerequisites
- Node.js 18+
- API keys for the following services (all have free tiers):

| Service | Environment Variable | Sign Up |
|---------|---------------------|---------|
| Anthropic | `APP_ANTHROPIC_KEY` | https://console.anthropic.com |
| Geoapify | `GEOAPIFY_API_KEY` | https://myprojects.geoapify.com |
| NASA FIRMS | `NASA_FIRMS_MAP_KEY` | https://firms.modaps.eosdis.nasa.gov/api/area/ |
| Recreation.gov RIDB | `RECREATION_GOV_API_KEY` | https://ridb.recreation.gov/profile |

`APP_ANTHROPIC_KEY` is required — the app will not respond without it. The other three degrade gracefully: missing keys return empty results for that data source rather than erroring.

### Installation

```bash
git clone https://github.com/darsolfam/FINAL.git
cd FINAL
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```
APP_ANTHROPIC_KEY=your_anthropic_key_here
GEOAPIFY_API_KEY=your_geoapify_key_here
NASA_FIRMS_MAP_KEY=your_nasa_firms_key_here
RECREATION_GOV_API_KEY=your_recreation_gov_key_here
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Example Usage

1. Enter a starting city (e.g. `Denver, CO`)
2. Set departure and return dates
3. Select your vehicle capability: `Street` → `Stock 4WD` → `Lifted` → `Full Overlander`
4. Select comfort level and group size
5. Click **Find My Route**
6. The agent runs for 20–45 seconds, then returns 2–3 route options
7. Click any stop card to expand the full day-by-day itinerary

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add the four environment variables in the Vercel dashboard under **Settings → Environment Variables** before deploying. Do not commit `.env.local` to version control.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| AI | Anthropic Claude Haiku 4.5 via `@anthropic-ai/sdk` |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Campgrounds | Recreation.gov RIDB API |
| Weather | NWS / weather.gov |
| Wildfires | NASA FIRMS satellite data |
| Routing & Places | Geoapify |
| Dispersed Camping | OpenStreetMap Overpass API |
| Travel Advisories | US State Department API |
