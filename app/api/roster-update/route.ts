import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  : defaultSupabase;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const leagueId = Number(body?.leagueId);
    const teamId = Number(body?.teamId);
    const teamAbbr = String(body?.teamAbbr || '').trim().toUpperCase();
    const coachName = String(body?.coachName || '').trim();
    const players: Array<{ playerName: string; pos: 'G' | 'F' | 'D' }> = Array.isArray(body?.players)
      ? body.players
      : [];

    if (!leagueId || isNaN(leagueId) || !teamId || isNaN(teamId)) {
      return NextResponse.json({ error: 'Valid leagueId and teamId are required.' }, { status: 400 });
    }

    const cleanPlayers = players
      .map((p) => ({
        playerName: String(p.playerName || '').trim(),
        pos: (['G', 'F', 'D'].includes(String(p.pos || '').toUpperCase())
          ? String(p.pos).toUpperCase()
          : 'F') as 'G' | 'F' | 'D',
      }))
      .filter((p) => p.playerName && p.playerName !== '--' && !p.playerName.startsWith('OPEN '));

    // Resolve player_id from league_player_database where available
    const names = cleanPlayers.map((p) => p.playerName);
    const playerIdByNorm = new Map<string, number>();
    if (names.length > 0) {
      const { data: dbPlayers } = await supabase
        .from('league_player_database')
        .select('player_id, player_name')
        .in('player_name', names);

      (dbPlayers || []).forEach((row: any) => {
        const key = String(row.player_name || '').trim().toLowerCase();
        if (key && row.player_id && !playerIdByNorm.has(key)) {
          playerIdByNorm.set(key, Number(row.player_id));
        }
      });
    }

    // Replace league_rosters rows for this team & league
    const { error: delErr } = await supabase
      .from('league_rosters')
      .delete()
      .eq('league_id', leagueId)
      .eq('team_id', teamId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    let insertedRows: any[] = [];
    if (cleanPlayers.length > 0) {
      const rowsToInsert = cleanPlayers.map((p) => ({
        league_id: leagueId,
        team_id: teamId,
        player_id: playerIdByNorm.get(p.playerName.toLowerCase()) ?? null,
        player_name: p.playerName,
        pos: p.pos,
      }));

      const { data: insData, error: insErr } = await supabase
        .from('league_rosters')
        .insert(rowsToInsert)
        .select('*');

      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 400 });
      }
      insertedRows = insData || rowsToInsert;
    }

    // Record confirmed roster snapshot in leagues.rules_json.confirmed_rosters
    const { data: leagueRow } = await supabase
      .from('leagues')
      .select('rules_json')
      .eq('league_id', leagueId)
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

    const confirmedRosters = {
      ...(currentRules.confirmed_rosters && typeof currentRules.confirmed_rosters === 'object'
        ? currentRules.confirmed_rosters
        : {}),
      [String(teamAbbr || teamId)]: {
        team_id: teamId,
        team_abbr: teamAbbr,
        coach_name: coachName || undefined,
        updated_at: new Date().toISOString(),
        players: cleanPlayers,
      },
    };

    await supabase
      .from('leagues')
      .update({ rules_json: { ...currentRules, confirmed_rosters: confirmedRosters } })
      .eq('league_id', leagueId);

    return NextResponse.json({
      ok: true,
      leagueId,
      teamId,
      teamAbbr,
      count: insertedRows.length,
      players: cleanPlayers,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update roster.' }, { status: 500 });
  }
}
