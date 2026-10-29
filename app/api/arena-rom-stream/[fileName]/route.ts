import { NextRequest, NextResponse } from 'next/server';
import zlib from 'zlib';

const SUPABASE_ROMS_PUBLIC_URL =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co') +
  '/storage/v1/object/public/roms';

/**
 * Extracts the ROM binary (.bin, .md, .gen, .smd, or largest entry) from a ZIP buffer
 * using Node's built-in zlib.inflateRawSync. If the buffer is not a ZIP, returns it as-is.
 */
function extractRomFromZipOrRaw(buf: Buffer): Buffer {
  // Check PK\x03\x04 magic
  if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
    return buf;
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

  // Prefer .bin / .md / .gen / .smd file; otherwise pick the largest uncompressed file
  const romEntry =
    entries.find(e => /\.(bin|md|gen|smd)$/i.test(e.name)) ||
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
    return compressedSlice;
  } else if (romEntry.method === 8) {
    return zlib.inflateRawSync(compressedSlice);
  } else {
    throw new Error(`Unsupported ZIP compression method: ${romEntry.method}`);
  }
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
    const romBuffer = extractRomFromZipOrRaw(rawBuffer);
    const cleanRomName = bucketFile.replace(/\.zip$/i, '') + '.bin';

    return new NextResponse(new Uint8Array(romBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(romBuffer.length),
        'Content-Disposition': `inline; filename="${cleanRomName}"`,
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
