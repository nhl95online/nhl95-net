import { NextRequest, NextResponse } from 'next/server';
import { parseSaveStateBuffer } from '../../../lib/parsers/savestate';
import { getSeasonConfig } from '../../../lib/seasons';
import { SeasonConfig } from '../../../lib/seasons/types';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const seasonId = (formData.get('seasonId') as string) || '38';
    const customConfigRaw = formData.get('customConfig') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No save state file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    let seasonConfig: Partial<SeasonConfig> = getSeasonConfig(seasonId);

    if (customConfigRaw) {
      try {
        const parsedCustom = JSON.parse(customConfigRaw);
        seasonConfig = {
          ...seasonConfig,
          ...parsedCustom
        };
      } catch (e) {
        console.warn('Could not parse customConfig JSON:', e);
      }
    }

    const parsedGame = parseSaveStateBuffer(buffer, seasonConfig);

    return NextResponse.json({
      success: true,
      filename: file.name,
      seasonId,
      game: parsedGame
    });
  } catch (error: any) {
    console.error('Error parsing save state:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse save state file' },
      { status: 500 }
    );
  }
}
