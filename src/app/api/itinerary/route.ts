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
      stopStartDate,
      stopEndDate,
    } = await req.json();

    // Compute the exact number of days this stop covers so the model doesn't overshoot.
    const stopDays =
      stopStartDate && stopEndDate
        ? Math.max(1, Math.round(
            (new Date(stopEndDate).getTime() - new Date(stopStartDate).getTime()) /
            (1000 * 60 * 60 * 24)
          ))
        : null;

    if (!name || typeof lat !== 'number' || typeof lon !== 'number') {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const [forecast, attractions] = await Promise.all([
      getExtendedForecast({ lat, lon }, stopStartDate),
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
        'You are an overlanding trip planner. Generate a day-by-day itinerary covering ONLY this one stop. ' +
        'You will be told the EXACT number of days to cover — do not add extra days. ' +
        'Label each day with its actual calendar date (e.g. "Day 1 — Sat May 17"). ' +
        'Day 1 is the arrival/drive-in day — on Day 1 the user MUST set up camp; tell them exactly where to camp (the named stop is the primary site) and suggest a nearby backup option within ~30 min in case it\'s taken. ' +
        'The final day is the departure day (drive to next stop or home) — no camp needed on the final night here. ' +
        'EVERY day that ends at this stop (Day 1 through the second-to-last day, or every day if there\'s only one) must end with a "Camp: [primary site name] (backup: [nearby alternative])" line. ' +
        'Each day starts with a one-line "Travel:" note (use actual hours/miles, or "no drive — camp day" for middle days). ' +
        'Be concrete and specific. Keep the whole response under 240 words.',
      messages: [
        {
          role: 'user',
          content: `STOP ${stopIndex ?? 1} of ${totalStops ?? 1}: ${name}
${stopStartDate ? `This stop covers: ${stopStartDate} to ${stopEndDate ?? stopStartDate} — EXACTLY ${stopDays} day${stopDays === 1 ? '' : 's'}. Generate exactly ${stopDays} day${stopDays === 1 ? '' : 's'}, no more.` : `Trip duration: ${duration ?? 'weekend'}`}
Drive IN: ${driveTimeHours ?? 'unknown'} hours (${distanceMiles ?? 'unknown'} miles)
${
  nextStopName
    ? `Depart final day to: ${nextStopName} (${nextStopDriveHours ?? 'unknown'} hours away)`
    : (stopIndex ?? 1) === (totalStops ?? 1)
      ? 'FINAL STOP — last day drives home.'
      : ''
}

Weather for this stop's dates:
${forecast.slice(0, stopDays ? Math.min(stopDays * 2, 8) : 6).map((f) => `- ${f.name}: ${f.shortForecast}, ${f.tempF}°F`).join('\n')}

Nearby things to do:
${pointsOfInterest.map((p) => `- ${p.name} (${p.category})`).join('\n')}`,
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
