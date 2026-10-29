import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const coachId = searchParams.get('coachId');
    if (!coachId) {
      return NextResponse.json({ error: 'Missing coachId' }, { status: 400 });
    }

    const cleanId = String(coachId).replace(/[^0-9a-zA-Z_-]/g, '');
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const storagePath = `coach-configs/coach_${cleanId}.json`;
    const { data, error } = await supabase.storage.from('roms').download(storagePath);

    if (error || !data) {
      return NextResponse.json({ config: null }, { status: 200 });
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    return NextResponse.json({
      config: parsed.config || parsed,
      updatedAt: parsed.updatedAt || null
    });
  } catch (err: any) {
    return NextResponse.json({ config: null, error: err?.message }, { status: 200 });
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
      return NextResponse.json({ error: 'Missing coachId or controller config' }, { status: 400 });
    }

    const cleanId = String(coachId).replace(/[^0-9a-zA-Z_-]/g, '');
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const payload = {
      coachId: Number(coachId) || cleanId,
      coachName: coachName || `Coach #${cleanId}`,
      config,
      updatedAt: new Date().toISOString()
    };

    const storagePath = `coach-configs/coach_${cleanId}.json`;
    const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));

    const { error } = await supabase.storage.from('roms').upload(storagePath, bytes, {
      contentType: 'application/json',
      upsert: true
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      coachId: payload.coachId,
      updatedAt: payload.updatedAt
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to save controller settings' },
      { status: 500 }
    );
  }
}
