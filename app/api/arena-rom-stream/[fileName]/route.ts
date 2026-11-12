import { NextRequest, NextResponse } from 'next/server';
import zlib from 'zlib';

const SUPABASE_ROMS_PUBLIC_URL =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co') +
  '/storage/v1/object/public/roms';

/**
 * Extracts the ROM binary (.bin, .md, .gen, .smd, .sfc, .smc, .nes, .sms, .gg, or largest entry) from a ZIP buffer
 * using Node's built-in zlib.inflateRawSync. If the buffer is not a ZIP, returns it as-is.
 */
function extractRomFromZipOrRaw(
  buf: Buffer,
  fallbackName: string
): { buffer: Buffer; entryName: string } {
  // Check PK\x03\x04 magic
  if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
    return { buffer: buf, entryName: fallbackName };
  }

  // Locate End of Central Directory (EOCD) signature 0x06054b50 from end of buffer
  let eocdOffset = -1;
  const minEocdSearch = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= minEocdSearch; i--) {
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x05 &&
      buf[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP archive: EOCD not found');
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  interface ZipEntry {
    name: string;
    method: number;
    compSize: number;
    uncompSize: number;
    lhOffset: number;
  }

  const entries: ZipEntry[] = [];
  let pos = cdOffset;

  for (let i = 0; i < totalEntries && pos + 46 <= buf.length; i++) {
    if (
      buf[pos] !== 0x50 ||
      buf[pos + 1] !== 0x4b ||
      buf[pos + 2] !== 0x01 ||
      buf[pos + 3] !== 0x02
    ) {
      break;
    }

    const method = buf.readUInt16LE(pos + 10);
    const compSize = buf.readUInt32LE(pos + 20);
    const uncompSize = buf.readUInt32LE(pos + 24);
    const fnLen = buf.readUInt16LE(pos + 28);
    const exLen = buf.readUInt16LE(pos + 30);
    const cmLen = buf.readUInt16LE(pos + 32);
    const lhOffset = buf.readUInt32LE(pos + 42);
    const name = buf.subarray(pos + 46, pos + 46 + fnLen).toString('utf8');

    if (!name.endsWith('/')) {
      entries.push({ name, method, compSize, uncompSize, lhOffset });
    }

    pos += 46 + fnLen + exLen + cmLen;
  }

  if (entries.length === 0) {
    throw new Error('ZIP archive contains no file entries');
  }

  // Prefer known SEGA, SNES, or NES ROM extensions; otherwise pick the largest uncompressed file
  const romEntry =
    entries.find(e => /\.(bin|md|gen|smd|sfc|smc|fig|swc|nes|fds|unf|sms|gg|32x)$/i.test(e.name)) ||
    entries.sort((a, b) => b.uncompSize - a.uncompSize)[0];

  const lh = romEntry.lhOffset;
  if (lh + 30 > buf.length) {
    throw new Error('Invalid local header offset in ZIP archive');
  }

  const lhFnLen = buf.readUInt16LE(lh + 26);
  const lhExLen = buf.readUInt16LE(lh + 28);
  const dataStart = lh + 30 + lhFnLen + lhExLen;
  const compressedSlice = buf.subarray(dataStart, dataStart + romEntry.compSize);

  if (romEntry.method === 0) {
    return { buffer: compressedSlice, entryName: romEntry.name };
  } else if (romEntry.method === 8) {
    return { buffer: zlib.inflateRawSync(compressedSlice), entryName: romEntry.name };
  } else {
    throw new Error(`Unsupported ZIP compression method: ${romEntry.method}`);
  }
}

/**
 * Converts an interleaved Super Magic Drive (.smd) Genesis dump into a plain .bin ROM.
 * Layout: 512-byte header, then 16KB blocks where the first 8KB holds the odd bytes
 * and the second 8KB holds the even bytes.
 */
function deinterleaveSmd(buf: Buffer): Buffer {
  const body = buf.subarray(512);
  const out = Buffer.alloc(body.length);
  for (let blockStart = 0; blockStart + 16384 <= body.length; blockStart += 16384) {
    for (let i = 0; i < 8192; i++) {
      out[blockStart + i * 2 + 1] = body[blockStart + i];
      out[blockStart + i * 2] = body[blockStart + 8192 + i];
    }
  }
  return out;
}

function looksLikeSmd(buf: Buffer, entryName: string): boolean {
  if (buf.length < 512 + 16384 || (buf.length - 512) % 16384 !== 0) return false;
  // Standard SMD header magic (bytes 8-9 = 0xAA 0xBB) or an explicit .smd entry name
  return (buf[8] === 0xaa && buf[9] === 0xbb) || /\.smd$/i.test(entryName);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ fileName: string }> }
) {
  try {
    const { fileName } = await context.params;
    const bucketFile = req.nextUrl.searchParams.get('bucketFile') || fileName;

    const targetUrl = `${SUPABASE_ROMS_PUBLIC_URL}/${encodeURIComponent(bucketFile)}`;
    const upstream = await fetch(targetUrl);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `File "${bucketFile}" not found in Supabase roms bucket (HTTP ${upstream.status})` },
        { status: 404 }
      );
    }

    const rawBuffer = Buffer.from(await upstream.arrayBuffer());
    const extracted = extractRomFromZipOrRaw(rawBuffer, bucketFile);
    let romBuffer = extracted.buffer;
    let entryName = extracted.entryName;
    // Genesis .smd dumps are interleaved — convert to plain .bin so the emulator boots them
    if (looksLikeSmd(romBuffer, entryName)) {
      romBuffer = deinterleaveSmd(romBuffer);
      entryName = entryName.replace(/\.smd$/i, '.bin');
    }
    const extMatch = entryName.match(/\.(bin|md|gen|smd|sfc|smc|fig|swc|nes|fds|unf|sms|gg|32x)$/i);
    const ext = extMatch ? extMatch[0].toLowerCase() : '.bin';
    const cleanRomName = bucketFile.replace(/\.(zip|bin|md|gen|smd|sfc|smc|nes|sms|gg|32x)$/i, '') + ext;

    let detectedCore = 'segaMD';
    if (/\.(sfc|smc|fig|swc)$/i.test(ext)) detectedCore = 'snes';
    else if (/\.(nes|fds|unf)$/i.test(ext)) detectedCore = 'nes';
    else if (/\.sms$/i.test(ext)) detectedCore = 'segaMS';
    else if (/\.gg$/i.test(ext)) detectedCore = 'segaGG';
    else if (/\.32x$/i.test(ext)) detectedCore = 'sega32x';

    return new NextResponse(new Uint8Array(romBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(romBuffer.length),
        'Content-Disposition': `inline; filename="${cleanRomName}"`,
        'X-Emulator-Core': detectedCore,
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to stream ROM from bucket' },
      { status: 500 }
    );
  }
}
