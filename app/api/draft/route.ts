import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  : defaultSupabase;

const KNOWN_LEAGUE_LEVELS: Record<number, { level: string; year: number }> = {
  39: { level: 'O01', year: 1927 },
  40: { level: 'W18', year: 2013 },
  41: { level: 'W19', year: 2014 },
  42: { level: 'W20', year: 2015 },
  43: { level: 'W21', year: 2016 },
  44: { level: 'W22', year: 2017 },
  45: { level: 'W23', year: 2018 },
  46: { level: 'W24', year: 2019 },
  47: { level: 'W25', year: 2020 },
  48: { level: 'W26', year: 2021 },
  49: { level: 'W27', year: 2022 },
  50: { level: 'W28', year: 2023 },
  51: { level: 'W29', year: 2024 },
  52: { level: 'W30', year: 2025 },
  53: { level: 'W31', year: 2026 },
  54: { level: 'O02', year: 1928 },
  55: { level: 'O03', year: 1929 },
  56: { level: 'O04', year: 1930 }
};

async function ensureLeagueExists(supabase: any, leagueId: number, rows?: any[]) {
  const numId = Number(leagueId);
  if (!numId || isNaN(numId)) return;
  const known = KNOWN_LEAGUE_LEVELS[numId];
  const sampleYear = rows?.[0]?.year ? Number(rows[0].year) : (known?.year || (numId >= 41 ? 2014 + (numId - 41) : 2013));
  let leagueLevel = known?.level;
  if (!leagueLevel) {
    if (sampleYear >= 1927 && sampleYear <= 1945) {
      const oNum = Math.max(1, sampleYear - 1926);
      leagueLevel = `O${String(oNum).padStart(2, '0')}`;
    } else {
      const wNum = numId >= 41 ? 19 + (numId - 41) : 18;
      leagueLevel = `W${String(wNum).padStart(2, '0')}`;
    }
  }
  await supabase.from('leagues').upsert(
    [{ league_id: numId, league_level: leagueLevel, nhl_year: sampleYear }],
    { onConflict: 'league_id', ignoreDuplicates: true }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'generate_order') {
      const { leagueId, rows, hasExisting } = body as {
        leagueId: number;
        rows: any[];
        hasExisting?: boolean;
      };

      if (!leagueId || !Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'Missing leagueId or draft order rows' }, { status: 400 });
      }

      await ensureLeagueExists(supabase, Number(leagueId), rows);

      if (hasExisting) {
        const { error: delErr } = await supabase
          .from('league_drafts')
          .delete()
          .eq('league_id', Number(leagueId))
          .is('player_id', null);
        if (delErr) {
          return NextResponse.json({ error: delErr.message }, { status: 400 });
        }
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('league_drafts')
        .insert(rows)
        .select();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }

      return NextResponse.json({ data: inserted || [] });
    }

    if (action === 'submit_pick') {
      const { draftId, updatePayload, rowsToInsert } = body as {
        draftId?: number;
        updatePayload?: Record<string, any>;
        rowsToInsert?: any[];
      };

      if (draftId && updatePayload) {
        const { data: updated, error: updateErr } = await supabase
          .from('league_drafts')
          .update(updatePayload)
          .eq('draft_id', Number(draftId))
          .select();

        if (updateErr) {
          return NextResponse.json({ error: updateErr.message }, { status: 400 });
        }
        return NextResponse.json({ data: updated || [] });
      }

      if (Array.isArray(rowsToInsert) && rowsToInsert.length > 0) {
        if (rowsToInsert[0]?.league_id) {
          await ensureLeagueExists(supabase, Number(rowsToInsert[0].league_id), rowsToInsert);
        }
        const { data: insertedAll, error: insErr } = await supabase
          .from('league_drafts')
          .insert(rowsToInsert)
          .select();

        if (insErr) {
          return NextResponse.json({ error: insErr.message }, { status: 400 });
        }
        return NextResponse.json({ data: insertedAll || [] });
      }

      return NextResponse.json({ error: 'Missing draftId or rowsToInsert' }, { status: 400 });
    }

    if (action === 'upload_capital') {
      const { batches } = body as {
        batches: Array<{ leagueId: number; rows: any[]; hasExisting?: boolean }>;
      };

      if (!Array.isArray(batches) || batches.length === 0) {
        return NextResponse.json({ error: 'No draft capital batches provided' }, { status: 400 });
      }

      const results: Record<string, any[]> = {};

      for (const batch of batches) {
        const lId = Number(batch.leagueId);
        if (!lId || !Array.isArray(batch.rows) || batch.rows.length === 0) continue;

        await ensureLeagueExists(supabase, lId, batch.rows);

        if (batch.hasExisting) {
          const { error: delErr } = await supabase
            .from('league_drafts')
            .delete()
            .eq('league_id', lId)
            .is('player_id', null);
          if (delErr) {
            return NextResponse.json({ error: delErr.message }, { status: 400 });
          }
        }

        const { data: inserted, error: insertErr } = await supabase
          .from('league_drafts')
          .insert(batch.rows)
          .select();

        if (insertErr) {
          return NextResponse.json({ error: insertErr.message }, { status: 400 });
        }

        results[String(lId)] = inserted || [];
      }

      return NextResponse.json({ results });
    }

    if (action === 'confirm_trade') {
      const { tradePayload, pickTransfers } = body as {
        tradePayload: Record<string, any>;
        pickTransfers?: Array<{
          fromTeamId: number;
          toTeamId: number;
          year: number;
          round: number;
          transactionType: string;
        }>;
      };

      if (!tradePayload) {
        return NextResponse.json({ error: 'Missing tradePayload' }, { status: 400 });
      }

      const { data: insertedRows, error } = await supabase
        .from('league_trades')
        .insert([tradePayload])
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (Array.isArray(pickTransfers)) {
        for (const pt of pickTransfers) {
          await supabase
            .from('league_drafts')
            .update({
              team_id: Number(pt.toTeamId),
              transaction_type: pt.transactionType
            })
            .eq('team_id', Number(pt.fromTeamId))
            .eq('year', Number(pt.year))
            .eq('round', Number(pt.round))
            .is('player_id', null);
        }
      }

      return NextResponse.json({ data: insertedRows || [tradePayload] });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('/api/draft error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
