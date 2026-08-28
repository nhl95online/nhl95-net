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
    const { coachId, email, coachName, currentPinOrMasterKey, newPin } = body as {
      coachId?: number | string;
      email?: string;
      coachName?: string;
      currentPinOrMasterKey: string;
      newPin: string;
    };

    if (!coachId && !email && !coachName) {
      return NextResponse.json({ error: 'Missing coach identification (email, coach name, or coach ID)' }, { status: 400 });
    }

    if (!newPin || !newPin.trim()) {
      return NextResponse.json({ error: 'New PIN cannot be empty' }, { status: 400 });
    }

    const cleanNewPin = newPin.trim();
    const cleanAuthKey = (currentPinOrMasterKey || '').trim();

    // 1. Fetch the coach's current record by coach_id, email, or coach_name
    let coachData: any = null;

    if (coachId && !isNaN(Number(coachId)) && Number(coachId) > 0) {
      const { data } = await supabase
        .from('league_coaches')
        .select('coach_id, coach_name, email, pin')
        .eq('coach_id', Number(coachId))
        .single();
      coachData = data;
    }

    if (!coachData && email && email.trim()) {
      const { data } = await supabase
        .from('league_coaches')
        .select('coach_id, coach_name, email, pin')
        .ilike('email', email.trim())
        .limit(1);
      if (data && data.length > 0) coachData = data[0];
    }

    if (!coachData && coachName && coachName.trim()) {
      const { data } = await supabase
        .from('league_coaches')
        .select('coach_id, coach_name, email, pin')
        .ilike('coach_name', coachName.trim())
        .limit(1);
      if (data && data.length > 0) coachData = data[0];
    }

    if (!coachData) {
      return NextResponse.json({ error: 'Coach record was not found in league_coaches table' }, { status: 404 });
    }

    // 2. Validate authorization: must match master league passkey OR existing coach PIN
    const isMasterValid = cleanAuthKey.toLowerCase() === DEFAULT_LEAGUE_PASSKEY.toLowerCase();
    const isCurrentPinValid = coachData.pin && cleanAuthKey === coachData.pin;

    if (!isMasterValid && !isCurrentPinValid) {
      return NextResponse.json({ 
        error: 'Authorization failed. Please enter your current PIN or the master league passkey to reset.' 
      }, { status: 401 });
    }

    // 3. Update the coach PIN in Supabase
    const { error: updateErr } = await supabase
      .from('league_coaches')
      .update({ pin: cleanNewPin })
      .eq('coach_id', coachData.coach_id);

    if (updateErr) {
      console.error('Failed to update coach PIN:', updateErr);
      return NextResponse.json({ error: updateErr.message || 'Failed to save new PIN to database' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `PIN for Coach ${coachData.coach_name} (${coachData.email || 'ID #' + coachData.coach_id}) updated successfully!`
    });
  } catch (error: any) {
    console.error('Error resetting coach PIN:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
