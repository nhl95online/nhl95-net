import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const ROM_FILE_RE =
  /\.(zip|bin|md|gen|smd|sfc|smc|fig|swc|nes|fds|unf|unif|sms|gg|32x|z64|n64|v64|a26|a52|a78|lnx|j64|jag|jsdos|dosz|exe|com|bat|img|ima|vhd|iso|cue|chd|conf)$/i;

const KNOWN_CONSOLE_FOLDERS = ['league', 'sega', 'nes', 'snes', 'n64', 'atari', 'mame', 'arcade', 'pc', 'dos'];

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.storage
      .from('roms')
      .list('', { limit: 500, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      return NextResponse.json({ files: [], folders: [], error: error.message }, { status: 200 });
    }

    const rootItems = data || [];
    const files: string[] = [];
    const folderSet = new Set<string>(KNOWN_CONSOLE_FOLDERS);

    for (const item of rootItems) {
      const name = item.name;
      if (!name || name.startsWith('.')) continue;
      const isFolder = item.id === null || item.metadata === null;
      if (isFolder && !ROM_FILE_RE.test(name)) {
        folderSet.add(name);
      } else if (ROM_FILE_RE.test(name)) {
        files.push(name);
      }
    }

    const discoveredFolders: string[] = [];
    await Promise.all(
      Array.from(folderSet).map(async folder => {
        const { data: subData } = await supabase.storage
          .from('roms')
          .list(folder, { limit: 500, sortBy: { column: 'name', order: 'asc' } });
        if (!subData || subData.length === 0) return;
        let hasFiles = false;
        for (const sub of subData) {
          if (!sub.name || sub.name.startsWith('.') || sub.id === null) continue;
          if (ROM_FILE_RE.test(sub.name)) {
            files.push(`${folder}/${sub.name}`);
            hasFiles = true;
          }
        }
        if (hasFiles) discoveredFolders.push(folder);
      })
    );

    files.sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ files, folders: discoveredFolders.sort() });
  } catch (err: any) {
    return NextResponse.json({ files: [], folders: [], error: err?.message || 'Failed to list roms bucket' }, { status: 200 });
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
