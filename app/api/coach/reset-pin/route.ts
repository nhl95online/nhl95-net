import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const DEFAULT_LEAGUE_PASSKEY = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'nhl95';

const supabase = serviceKey
  ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  : defaultSupabase;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { coachId, currentPinOrMasterKey, newPin } = body as {
      coachId: number | string;
      currentPinOrMasterKey: string;
      newPin: string;
    };

    if (!coachId) {
      return NextResponse.json({ error: 'Missing coach ID' }, { status: 400 });
    }

    if (!newPin || !newPin.trim()) {
      return NextResponse.json({ error: 'New PIN cannot be empty' }, { status: 400 });
    }

    const cId = Number(coachId);
    const cleanNewPin = newPin.trim();
    const cleanAuthKey = (currentPinOrMasterKey || '').trim();

    // 1. Fetch the coach's current record
    const { data: coachData, error: fetchErr } = await supabase
      .from('league_coaches')
      .select('coach_id, coach_name, pin')
      .eq('coach_id', cId)
      .single();

    if (fetchErr || !coachData) {
      return NextResponse.json({ error: 'Coach not found in database' }, { status: 404 });
    }

    // 2. Validate authorization: must match master league passkey OR existing coach PIN
    const isMasterValid = cleanAuthKey.toLowerCase() === DEFAULT_LEAGUE_PASSKEY.toLowerCase();
    const isCurrentPinValid = coachData.pin && cleanAuthKey === coachData.pin;
    const isFirstTimeSetup = !coachData.pin && isMasterValid;

    if (!isMasterValid && !isCurrentPinValid) {
      return NextResponse.json({ 
        error: 'Authorization failed. Please enter your current PIN or the master league passkey to reset.' 
      }, { status: 401 });
    }

    // 3. Update the coach PIN in Supabase
    const { error: updateErr } = await supabase
      .from('league_coaches')
      .update({ pin: cleanNewPin })
      .eq('coach_id', cId);

    if (updateErr) {
      console.error('Failed to update coach PIN:', updateErr);
      return NextResponse.json({ error: updateErr.message || 'Failed to save new PIN to database' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `PIN for Coach ${coachData.coach_name} updated successfully!`
    });
  } catch (error: any) {
    console.error('Error resetting coach PIN:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
