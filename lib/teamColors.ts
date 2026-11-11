"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Team colors live inside `league_teams.team_meta.colors` (JSON), next to arena/division:
 *
 *   "colors": {
 *     "primary": "#0c5454",            // team page theme
 *     "secondary": "#111111",
 *     "text": null,                    // optional header text color (null = auto black/white)
 *     "accent": null,                  // optional
 *     "jersey_home": { "helmet": "#..", "jerseyMain": "#..", ... },   // Mod My Team defaults
 *     "jersey_away": { ... }
 *   }
 *
 * Edit them at /team-colors (password protected) or directly in Supabase -> league_teams -> team_meta.
 * The admin page writes the same colors to every season row of a franchise (same abbreviation).
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

/** Parses team_meta (object or JSON string) safely. */
export function parseTeamMeta(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, any>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Converts a league_teams row's team_meta.colors into TeamColors (null when not set). */
export function teamColorsFromMeta(abbreviation: string, teamName: string | null | undefined, rawMeta: unknown): TeamColors | null {
  const meta = parseTeamMeta(rawMeta);
  let colors = meta.colors;
  // Fallback: older rows store flat team_meta.primary_color / secondary_color
  if ((!colors || typeof colors !== 'object' || !colors.primary) && meta.primary_color) {
    colors = { primary: meta.primary_color, secondary: meta.secondary_color };
  }
  if (!colors || typeof colors !== 'object' || !colors.primary) return null;
  return {
    abbreviation,
    team_name: teamName || abbreviation,
    primary_color: normalizeHex(colors.primary, '#111111'),
    secondary_color: normalizeHex(colors.secondary, '#f59e0b'),
    text_color: colors.text ? normalizeHex(colors.text, '') || null : null,
    accent_color: colors.accent ? normalizeHex(colors.accent, '') || null : null,
    jersey_home: colors.jersey_home && typeof colors.jersey_home === 'object' ? colors.jersey_home : null,
    jersey_away: colors.jersey_away && typeof colors.jersey_away === 'object' ? colors.jersey_away : null,
  };
}

let cache: Map<string, TeamColors> | null = null;
let inflight: Promise<Map<string, TeamColors>> | null = null;

/** Loads colors for every franchise once per page session (keyed by upper-case abbreviation, latest season wins). */
export async function fetchAllTeamColors(): Promise<Map<string, TeamColors>> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const map = new Map<string, TeamColors>();
    try {
      const { data, error } = await supabase
        .from('league_teams')
        .select('abbreviation, team_name, league_id, team_meta')
        .order('league_id', { ascending: false })
        .range(0, 4999);
      if (!error && Array.isArray(data)) {
        for (const row of data as any[]) {
          const abbr = String(row.abbreviation || '').trim().toUpperCase();
          if (!abbr || map.has(abbr)) continue;
          const tc = teamColorsFromMeta(abbr, row.team_name, row.team_meta);
          if (tc) map.set(abbr, tc);
        }
      }
    } catch {
      // offline: callers fall back to their defaults
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
