import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.storage
      .from('roms')
      .list('', { limit: 500, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      return NextResponse.json({ files: [], error: error.message }, { status: 200 });
    }

    const files = (data || [])
      .map(item => item.name)
      .filter(name => name && !name.startsWith('.'));

    return NextResponse.json({ files });
  } catch (err: any) {
    return NextResponse.json({ files: [], error: err?.message || 'Failed to list roms bucket' }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const targetName = (formData.get('targetName') as string | null)?.trim() || file?.name;

    if (!file || !targetName) {
      return NextResponse.json({ error: 'Missing ROM file or targetName' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const buffer = new Uint8Array(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from('roms')
      .upload(targetName, buffer, {
        contentType: file.name.endsWith('.zip') ? 'application/zip' : 'application/octet-stream',
        upsert: true
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fileName: targetName,
      publicUrl: `${supabaseUrl}/storage/v1/object/public/roms/${encodeURIComponent(targetName)}`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to upload ROM to bucket' }, { status: 500 });
  }
}
