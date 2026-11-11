"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Team colors live in the Supabase `team_colors` table (see supabase/team_colors.sql).
 * Edit them in Supabase -> Table Editor -> team_colors; the site reads them on page load.
 *
 *  - primary_color / secondary_color / accent_color / text_color: team page theme
 *  - jersey_home / jersey_away: default NOSE jersey palettes for /mod-my-team
 */

export interface TeamJerseyPalette {
  helmet: string;
  jerseyMain: string;
  shoulders: string;
  stripe1: string;
  stripe2: string;
  pants: string;
  socksMain: string;
  socksStripe: string;
  gloves: string;
  numbers: string;
}

export interface TeamColors {
  abbreviation: string;
  team_name?: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color?: string | null;
  text_color?: string | null;
  jersey_home?: Partial<TeamJerseyPalette> | null;
  jersey_away?: Partial<TeamJerseyPalette> | null;
}

const HEX_RE = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;

export function normalizeHex(value: unknown, fallback: string): string {
  const v = String(value || '').trim();
  if (!HEX_RE.test(v)) return fallback;
  if (v.length === 4) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  }
  return v.toLowerCase();
}

/** Best readable text color (#111111 or #ffffff) for a background hex. */
export function readableTextOn(hex: string): string {
  const h = normalizeHex(hex, '#111111');
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#111111' : '#ffffff';
}

/** Mixes a hex color with white (amount 0..1) — used for light tinted backgrounds. */
export function tintHex(hex: string, amount: number): string {
  const h = normalizeHex(hex, '#111111');
  const mix = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16);
    return Math.round(c + (255 - c) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${mix(1)}${mix(3)}${mix(5)}`;
}

let cache: Map<string, TeamColors> | null = null;
let inflight: Promise<Map<string, TeamColors>> | null = null;

/** Loads every row of team_colors once per page session (keyed by upper-case abbreviation). */
export async function fetchAllTeamColors(): Promise<Map<string, TeamColors>> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const map = new Map<string, TeamColors>();
    try {
      const { data, error } = await supabase.from('team_colors').select('*').range(0, 999);
      if (!error && Array.isArray(data)) {
        for (const row of data as any[]) {
          const abbr = String(row.abbreviation || '').trim().toUpperCase();
          if (!abbr) continue;
          map.set(abbr, {
            ...row,
            abbreviation: abbr,
            primary_color: normalizeHex(row.primary_color, '#111111'),
            secondary_color: normalizeHex(row.secondary_color, '#f59e0b'),
          });
        }
      }
    } catch {
      // table missing or offline: callers fall back to their defaults
    }
    cache = map;
    inflight = null;
    return map;
  })();
  return inflight;
}

/** React hook: colors for one team abbreviation (null until loaded / when not configured). */
export function useTeamColors(abbreviation?: string | null): TeamColors | null {
  const [colors, setColors] = useState<TeamColors | null>(null);
  useEffect(() => {
    let active = true;
    const key = String(abbreviation || '').trim().toUpperCase();
    if (!key) {
      setColors(null);
      return;
    }
    fetchAllTeamColors().then((map) => {
      if (active) setColors(map.get(key) || null);
    });
    return () => {
      active = false;
    };
  }, [abbreviation]);
  return colors;
}
