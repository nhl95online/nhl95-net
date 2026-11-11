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

/** POST { password, verifyOnly?: true } -> checks the password.
 *  POST { password, team: { abbreviation, team_name, primary_color, secondary_color, accent_color?, text_color?, jersey_home?, jersey_away? } } -> upserts one team. */
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
  const abbreviation = String(t.abbreviation || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const primary = cleanHex(t.primary_color);
  const secondary = cleanHex(t.secondary_color);
  if (!abbreviation || !primary || !secondary) {
    return NextResponse.json(
      { ok: false, error: 'abbreviation, primary_color and secondary_color (#rrggbb) are required.' },
      { status: 400 }
    );
  }

  const row = {
    abbreviation,
    team_name: String(t.team_name || abbreviation).trim().slice(0, 80),
    primary_color: primary,
    secondary_color: secondary,
    accent_color: cleanHex(t.accent_color),
    text_color: cleanHex(t.text_color),
    jersey_home: cleanJersey(t.jersey_home),
    jersey_away: cleanJersey(t.jersey_away),
  };

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('team_colors')
    .upsert(row, { onConflict: 'abbreviation' })
    .select()
    .single();

  if (error) {
    const missing = /relation .*team_colors.* does not exist|Could not find the table/i.test(error.message || '');
    return NextResponse.json(
      {
        ok: false,
        error: missing
          ? 'The team_colors table does not exist yet. Run supabase/team_colors.sql in the Supabase SQL Editor first.'
          : error.message,
      },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, team: data });
}
