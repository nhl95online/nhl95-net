import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// Set TEAM_COLORS_ADMIN_PASSWORD in Vercel (and .env.local). Saving is disabled until it's set.
const adminPassword = (process.env.TEAM_COLORS_ADMIN_PASSWORD || '').trim();

const HEX_RE = /^#[0-9a-f]{6}$/i;
const JERSEY_KEYS = [
  'helmet', 'jerseyMain', 'shoulders', 'stripe1', 'stripe2',
  'pants', 'socksMain', 'socksStripe', 'gloves', 'numbers'
] as const;

function cleanHex(v: unknown): string | null {
  const s = String(v ?? '').trim();
  return HEX_RE.test(s) ? s.toLowerCase() : null;
}

function cleanJersey(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== 'object') return null;
  const out: Record<string, string> = {};
  for (const k of JERSEY_KEYS) {
    const hex = cleanHex((v as any)[k]);
    if (hex) out[k] = hex;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function parseMeta(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object') return { ...(raw as Record<string, any>) };
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return p && typeof p === 'object' ? p : {};
    } catch {
      return {};
    }
  }
  return {};
}

function checkPassword(supplied: unknown): NextResponse | null {
  if (!adminPassword) {
    return NextResponse.json(
      { ok: false, error: 'TEAM_COLORS_ADMIN_PASSWORD is not configured on the server.' },
      { status: 503 }
    );
  }
  if (String(supplied ?? '') !== adminPassword) {
    return NextResponse.json({ ok: false, error: 'Wrong admin password.' }, { status: 401 });
  }
  if (!serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' },
      { status: 503 }
    );
  }
  return null;
}

/**
 * POST { password, verifyOnly: true } -> checks the password.
 * POST { password, team: { abbreviation, primary_color, secondary_color, text_color?, accent_color?, jersey_home?, jersey_away? } }
 *   -> writes team_meta.colors on EVERY league_teams row with that abbreviation (arena/division etc. are preserved).
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const denied = checkPassword(body?.password);
  if (denied) return denied;
  if (body?.verifyOnly) return NextResponse.json({ ok: true });

  const t = body?.team || {};
  const abbreviation = String(t.abbreviation || '').trim().toUpperCase();
  const primary = cleanHex(t.primary_color);
  const secondary = cleanHex(t.secondary_color);
  if (!abbreviation || !primary || !secondary) {
    return NextResponse.json(
      { ok: false, error: 'abbreviation, primary_color and secondary_color (#rrggbb) are required.' },
      { status: 400 }
    );
  }

  const colors = {
    primary,
    secondary,
    text: cleanHex(t.text_color),
    accent: cleanHex(t.accent_color),
    jersey_home: cleanJersey(t.jersey_home),
    jersey_away: cleanJersey(t.jersey_away),
  };

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: rows, error: readErr } = await supabase
    .from('league_teams')
    .select('team_id, abbreviation, team_meta')
    .ilike('abbreviation', abbreviation);

  if (readErr) {
    return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 });
  }
  const targets = (rows || []).filter((r: any) => String(r.abbreviation || '').trim().toUpperCase() === abbreviation);
  if (targets.length === 0) {
    return NextResponse.json({ ok: false, error: `No league_teams rows found for ${abbreviation}.` }, { status: 404 });
  }

  const failures: string[] = [];
  await Promise.all(
    targets.map(async (r: any) => {
      const meta = parseMeta(r.team_meta);
      meta.colors = colors;
      const { error } = await supabase.from('league_teams').update({ team_meta: meta }).eq('team_id', r.team_id);
      if (error) failures.push(`team_id ${r.team_id}: ${error.message}`);
    })
  );

  if (failures.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Saved ${targets.length - failures.length}/${targets.length} rows. ${failures[0]}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, rowsUpdated: targets.length, colors });
}
