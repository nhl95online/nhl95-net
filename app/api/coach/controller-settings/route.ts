import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const coachId = searchParams.get('coachId');
    if (!coachId) {
      return NextResponse.json({ error: 'Missing coachId' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const cleanId = String(coachId).replace(/[^0-9a-zA-Z_-]/g, '');
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const storagePath = `coach-configs/coach_${cleanId}.json`;
    const { data, error } = await supabase.storage.from('roms').download(storagePath);

    if (error || !data) {
      return NextResponse.json({ config: null }, { status: 200, headers: NO_CACHE_HEADERS });
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    const cfg = parsed.config || parsed;
    const updatedAt = parsed.updatedAt || cfg?.updatedAt || null;

    return NextResponse.json(
      {
        config: cfg,
        updatedAt
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json({ config: null, error: err?.message }, { status: 200, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { coachId, coachName, config } = body as {
      coachId: number | string;
      coachName?: string;
      config: any;
    };

    if (!coachId || !config) {
      return NextResponse.json(
        { error: 'Missing coachId or controller config' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const cleanId = String(coachId).replace(/[^0-9a-zA-Z_-]/g, '');
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const enrichedConfig = {
      ...config,
      updatedAt: config.updatedAt || nowMs
    };

    const payload = {
      coachId: Number(coachId) || cleanId,
      coachName: coachName || `Coach #${cleanId}`,
      config: enrichedConfig,
      updatedAt: nowIso,
      updatedAtMs: enrichedConfig.updatedAt
    };

    const storagePath = `coach-configs/coach_${cleanId}.json`;
    const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));

    const { error } = await supabase.storage.from('roms').upload(storagePath, bytes, {
      contentType: 'application/json',
      cacheControl: '0',
      upsert: true
    });

    if (error) {
      // Fallback: if upsert failed due to storage policy, try remove then upload
      await supabase.storage.from('roms').remove([storagePath]);
      const retry = await supabase.storage.from('roms').upload(storagePath, bytes, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true
      });
      if (retry.error) {
        return NextResponse.json({ error: retry.error.message }, { status: 500, headers: NO_CACHE_HEADERS });
      }
    }

    return NextResponse.json(
      {
        success: true,
        coachId: payload.coachId,
        updatedAt: payload.updatedAt,
        updatedAtMs: payload.updatedAtMs
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to save controller settings' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
