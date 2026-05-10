import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getExtendedForecast } from '@/lib/tools/forecast';
import { getNearbyAttractions } from '@/lib/tools/places';
import { config } from '@/lib/config';
import { Itinerary, NearbyPOI } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const {
      name,
      lat,
      lon,
      duration,
      driveTimeHours,
      distanceMiles,
      stopIndex,
      totalStops,
      nextStopName,
      nextStopDriveHours,
    } = await req.json();

    if (!name || typeof lat !== 'number' || typeof lon !== 'number') {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const [forecast, attractions] = await Promise.all([
      getExtendedForecast({ lat, lon }),
      getNearbyAttractions({ lat, lon }),
    ]);

    const pointsOfInterest: NearbyPOI[] = attractions.slice(0, 8).map((a) => ({
      name: a.name,
      category: a.categories[0] ?? 'point of interest',
    }));

    const client = new Anthropic({ apiKey: config.anthropicKey });
    const narrativeRes = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system:
        'You are an overlanding trip planner. Generate a focused itinerary covering ONLY this stop on a multi-stop route. Each day MUST start with a "Travel: ..." line. Use real driving values, not "minimal". If this stop has a next stop, the LAST day at this camp must drive there. If this is the final stop, the last day drives home. If this is the first stop, the first day drives in. Be concrete. Format with Day 1, Day 2, etc. Keep under 200 words.',
      messages: [
        {
          role: 'user',
          content: `This is STOP ${stopIndex ?? 1} of ${totalStops ?? 1} on the route.
Stop name: ${name}
Trip duration: ${duration ?? 'weekend'}
Drive INTO this stop: ${driveTimeHours ?? 'unknown'} hours (${distanceMiles ?? 'unknown'} miles)
${
  nextStopName
    ? `Next stop after this one: ${nextStopName} (${nextStopDriveHours ?? 'unknown'} hours drive away). This is NOT the final stop — the last day at camp must include the drive to ${nextStopName}.`
    : (stopIndex ?? 1) === (totalStops ?? 1)
      ? 'This is the FINAL stop on the route. The last day must include the drive home.'
      : ''
}

Weather forecast (next few periods):
${forecast.slice(0, 6).map((f) => `- ${f.name}: ${f.shortForecast}, ${f.tempF}°F`).join('\n')}

Nearby points of interest:
${pointsOfInterest.map((p) => `- ${p.name} (${p.category})`).join('\n')}

Generate the itinerary for THIS stop only, with concrete travel times in/out.`,
        },
      ],
    });

    const narrative = narrativeRes.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim();

    const itinerary: Itinerary = { forecast, pointsOfInterest, narrative };
    return NextResponse.json(itinerary);
  } catch (err) {
    console.error('Itinerary error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
