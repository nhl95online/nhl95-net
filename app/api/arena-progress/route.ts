import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  : defaultSupabase;

export interface ArenaHighScoreEntry {
  id: string;
  gameKey: string;
  gameTitle: string;
  playerName: string;
  score: number | null;
  distance: string;
  createdAt: string;
}

const STORAGE_LEAGUE_ID = 40;

async function readAllScores(): Promise<Record<string, ArenaHighScoreEntry[]>> {
  const { data } = await supabase
    .from('leagues')
    .select('rules_json')
    .eq('league_id', STORAGE_LEAGUE_ID)
    .maybeSingle();

  if (!data?.rules_json) return {};
  try {
    const parsed =
      typeof data.rules_json === 'string' ? JSON.parse(data.rules_json) : data.rules_json;
    const map = parsed?.arena_high_scores;
    return map && typeof map === 'object' ? map : {};
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  try {
    const gameKey = String(req.nextUrl.searchParams.get('gameKey') || '')
      .trim()
      .toUpperCase();
    const allScores = await readAllScores();
    if (gameKey) {
      return NextResponse.json({ scores: allScores[gameKey] || [] });
    }
    return NextResponse.json({ allScores });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load high scores' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const gameKey = String(body?.gameKey || '').trim().toUpperCase();
    const gameTitle = String(body?.gameTitle || gameKey).trim();
    const playerName = String(body?.playerName || 'Player').trim().slice(0, 40);
    const rawScore = body?.score;
    const score =
      rawScore !== undefined && rawScore !== null && String(rawScore).trim() !== '' && !isNaN(Number(rawScore))
        ? Number(rawScore)
        : null;
    const distance = String(body?.distance || '').trim().slice(0, 60);

    if (!gameKey) {
      return NextResponse.json({ error: 'gameKey is required.' }, { status: 400 });
    }
    if (score === null && !distance) {
      return NextResponse.json({ error: 'Enter a high score or distance/stage reached.' }, { status: 400 });
    }

    const { data: leagueRow } = await supabase
      .from('leagues')
      .select('rules_json')
      .eq('league_id', STORAGE_LEAGUE_ID)
      .maybeSingle();

    let currentRules: Record<string, any> = {};
    if (leagueRow?.rules_json) {
      try {
        currentRules =
          typeof leagueRow.rules_json === 'string'
            ? JSON.parse(leagueRow.rules_json)
            : { ...leagueRow.rules_json };
      } catch {
        currentRules = {};
      }
    }

    const allScores: Record<string, ArenaHighScoreEntry[]> =
      currentRules.arena_high_scores && typeof currentRules.arena_high_scores === 'object'
        ? { ...currentRules.arena_high_scores }
        : {};

    const entry: ArenaHighScoreEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      gameKey,
      gameTitle,
      playerName: playerName || 'Player',
      score,
      distance,
      createdAt: new Date().toISOString(),
    };

    const existing = Array.isArray(allScores[gameKey]) ? [...allScores[gameKey]] : [];
    existing.push(entry);
    existing.sort((a, b) => {
      const sa = a.score ?? -1;
      const sb = b.score ?? -1;
      if (sb !== sa) return sb - sa;
      return b.createdAt.localeCompare(a.createdAt);
    });
    allScores[gameKey] = existing.slice(0, 25);

    const { error: updErr } = await supabase
      .from('leagues')
      .update({ rules_json: { ...currentRules, arena_high_scores: allScores } })
      .eq('league_id', STORAGE_LEAGUE_ID);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, scores: allScores[gameKey], entry });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to save high score' }, { status: 500 });
  }
}
