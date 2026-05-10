import { NextRequest, NextResponse } from 'next/server';
import { runPlanningAgent } from '@/lib/agent';
import { UserQuery } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const query: UserQuery = await req.json();

    if (!query.startingLocation || !query.duration || !query.vehicleTier) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const result = await runPlanningAgent(query);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Agent error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
