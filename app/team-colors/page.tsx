"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { normalizeHex, readableTextOn, tintHex, type TeamJerseyPalette } from '@/lib/teamColors';

// ==========================================
// Team Colors Admin — edits the Supabase `team_colors` table
// (the same table you can edit directly in Supabase -> Table Editor -> team_colors)
// ==========================================

const PW_STORAGE_KEY = 'nhl95_team_colors_pw';
const O6_ABBRS = new Set(['BOS', 'CHI', 'DET', 'DTC', 'MTL', 'NYR', 'TOR']);

const JERSEY_SLOTS: { key: keyof TeamJerseyPalette; label: string }[] = [
  { key: 'helmet', label: 'Helmet' },
  { key: 'jerseyMain', label: 'Jersey Base' },
  { key: 'shoulders', label: 'Shoulders / Yoke' },
  { key: 'stripe1', label: 'Stripe Primary' },
  { key: 'stripe2', label: 'Stripe Trim' },
  { key: 'pants', label: 'Pants' },
  { key: 'socksMain', label: 'Socks Base' },
  { key: 'socksStripe', label: 'Socks Stripe' },
  { key: 'gloves', label: 'Gloves & Skates' },
  { key: 'numbers', label: 'Numbers / Crest' },
];

type TeamRow = {
  abbreviation: string;
  team_name: string;
  logo_url: string;
  team_id: number | null;
  league_id: number;
  inTable: boolean;
  primary_color: string;
  secondary_color: string;
  text_color: string | null;
  accent_color: string | null;
  jersey_home: TeamJerseyPalette;
  jersey_away: TeamJerseyPalette;
};

function buildJerseys(p: string, s: string): { home: TeamJerseyPalette; away: TeamJerseyPalette } {
  return {
    home: { helmet: p, jerseyMain: '#ffffff', shoulders: p, stripe1: p, stripe2: s, pants: p, socksMain: '#ffffff', socksStripe: p, gloves: p, numbers: p },
    away: { helmet: p, jerseyMain: p, shoulders: s, stripe1: '#ffffff', stripe2: s, pants: '#111111', socksMain: p, socksStripe: s, gloves: '#111111', numbers: readableTextOn(p) },
  };
}

function fillJersey(raw: any, fallback: TeamJerseyPalette): TeamJerseyPalette {
  const out = { ...fallback };
  if (raw && typeof raw === 'object') {
    JERSEY_SLOTS.forEach(({ key }) => {
      out[key] = normalizeHex(raw[key], out[key]);
    });
  }
  return out;
}

/** Simple front-view jersey preview built from the 10 palette slots. */
function JerseyPreview({ pal, label }: { pal: TeamJerseyPalette; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 120 150" className="w-28 h-36 drop-shadow">
        {/* helmet */}
        <ellipse cx="60" cy="14" rx="15" ry="11" fill={pal.helmet} stroke="#000" strokeWidth="1.5" />
        {/* sleeves */}
        <path d="M18 34 L6 70 L22 76 L32 46 Z" fill={pal.jerseyMain} stroke="#000" strokeWidth="1.5" />
        <path d="M102 34 L114 70 L98 76 L88 46 Z" fill={pal.jerseyMain} stroke="#000" strokeWidth="1.5" />
        <rect x="7" y="60" width="16" height="5" transform="rotate(20 15 62)" fill={pal.stripe1} />
        <rect x="97" y="60" width="16" height="5" transform="rotate(-20 105 62)" fill={pal.stripe1} />
        {/* gloves */}
        <rect x="4" y="72" width="17" height="11" rx="2" fill={pal.gloves} stroke="#000" strokeWidth="1.5" />
        <rect x="99" y="72" width="17" height="11" rx="2" fill={pal.gloves} stroke="#000" strokeWidth="1.5" />
        {/* torso */}
        <path d="M32 28 L88 28 L94 88 L26 88 Z" fill={pal.jerseyMain} stroke="#000" strokeWidth="1.5" />
        <path d="M32 28 L88 28 L90 42 L30 42 Z" fill={pal.shoulders} />
        <rect x="27" y="74" width="66" height="5" fill={pal.stripe1} />
        <rect x="27" y="79" width="66" height="3" fill={pal.stripe2} />
        <text x="60" y="66" textAnchor="middle" fontSize="20" fontWeight="900" fill={pal.numbers} fontFamily="Arial, sans-serif">95</text>
        {/* pants */}
        <path d="M28 88 L92 88 L90 110 L64 110 L60 100 L56 110 L30 110 Z" fill={pal.pants} stroke="#000" strokeWidth="1.5" />
        {/* socks */}
        <rect x="33" y="110" width="20" height="30" fill={pal.socksMain} stroke="#000" strokeWidth="1.5" />
        <rect x="67" y="110" width="20" height="30" fill={pal.socksMain} stroke="#000" strokeWidth="1.5" />
        <rect x="33" y="120" width="20" height="5" fill={pal.socksStripe} />
        <rect x="67" y="120" width="20" height="5" fill={pal.socksStripe} />
        {/* skates */}
        <rect x="30" y="140" width="25" height="7" rx="2" fill={pal.gloves} stroke="#000" strokeWidth="1.2" />
        <rect x="65" y="140" width="25" height="7" rx="2" fill={pal.gloves} stroke="#000" strokeWidth="1.2" />
      </svg>
      <span className="text-[10px] font-mono font-black uppercase">{label}</span>
    </div>
  );
}

function ColorField({ label, value, onChange, allowEmpty }: { label: string; value: string | null; onChange: (v: string | null) => void; allowEmpty?: boolean }) {
  const [text, setText] = useState(value || '');
  useEffect(() => setText(value || ''), [value]);
  return (
    <label className="flex items-center gap-2 text-xs">
      <input
        type="color"
        value={normalizeHex(value, '#111111')}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 border-2 border-black cursor-pointer p-0 bg-transparent shrink-0"
      />
      <span className="font-black uppercase w-28 shrink-0 leading-tight">{label}</span>
      <input
        type="text"
        value={text}
        placeholder={allowEmpty ? 'auto' : '#rrggbb'}
        onChange={(e) => {
          const v = e.target.value.trim();
          setText(v);
          if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase());
          else if (allowEmpty && v === '') onChange(null);
        }}
        className="w-24 border border-black px-1.5 py-1 font-mono text-[11px] uppercase bg-white"
      />
    </label>
  );
}

export default function TeamColorsAdminPage() {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const [rows, setRows] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [filter, setFilter] = useState<'W' | 'O' | 'ALL'>('W');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>('');
  const [draft, setDraft] = useState<TeamRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // --- password gate ---
  const verify = async (pw: string) => {
    setChecking(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/team-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, verifyOnly: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        sessionStorage.setItem(PW_STORAGE_KEY, pw);
        setPassword(pw);
        setUnlocked(true);
      } else {
        sessionStorage.removeItem(PW_STORAGE_KEY);
        setAuthError(json.error || `Error ${res.status}`);
      }
    } catch {
      setAuthError('Could not reach the server.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem(PW_STORAGE_KEY);
    if (saved) verify(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- load teams + saved colors ---
  useEffect(() => {
    if (!unlocked) return;
    (async () => {
      setLoading(true);
      const [teamsRes, colorsRes] = await Promise.all([
        supabase.from('league_teams').select('team_id, team_name, abbreviation, logo_url, league_id').order('league_id', { ascending: false }).range(0, 4999),
        supabase.from('team_colors').select('*').range(0, 999),
      ]);
      setTableMissing(!!colorsRes.error);
      const colorMap = new Map<string, any>();
      (colorsRes.data || []).forEach((c: any) => colorMap.set(String(c.abbreviation || '').toUpperCase(), c));

      const latest = new Map<string, any>();
      (teamsRes.data || []).forEach((t: any) => {
        const ab = String(t.abbreviation || '').trim().toUpperCase();
        if (!ab) return;
        const prev = latest.get(ab);
        if (!prev) latest.set(ab, { ...t });
        else if (!prev.logo_url && t.logo_url) prev.logo_url = t.logo_url;
      });
      colorMap.forEach((c, ab) => {
        if (!latest.has(ab)) latest.set(ab, { abbreviation: ab, team_name: c.team_name || ab, logo_url: '', team_id: null, league_id: 0 });
      });

      const list: TeamRow[] = Array.from(latest.values()).map((t: any) => {
        const ab = String(t.abbreviation).toUpperCase();
        const c = colorMap.get(ab);
        const p = normalizeHex(c?.primary_color, '#111111');
        const s = normalizeHex(c?.secondary_color, '#f59e0b');
        const base = buildJerseys(p, s);
        return {
          abbreviation: ab,
          team_name: String(c?.team_name || t.team_name || ab).trim(),
          logo_url: String(t.logo_url || '').trim(),
          team_id: t.team_id != null ? Number(t.team_id) : null,
          league_id: Number(t.league_id || 0),
          inTable: !!c,
          primary_color: p,
          secondary_color: s,
          text_color: c?.text_color ? normalizeHex(c.text_color, '') || null : null,
          accent_color: c?.accent_color ? normalizeHex(c.accent_color, '') || null : null,
          jersey_home: fillJersey(c?.jersey_home, base.home),
          jersey_away: fillJersey(c?.jersey_away, base.away),
        };
      });
      list.sort((a, b) => a.team_name.localeCompare(b.team_name));
      setRows(list);
      setLoading(false);
    })();
  }, [unlocked]);

  const activeWSeason = useMemo(
    () => rows.reduce((m, r) => (!O6_ABBRS.has(r.abbreviation) && r.league_id <= 53 ? Math.max(m, r.league_id) : m), 0),
    [rows]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'W' && !(r.league_id === activeWSeason && !O6_ABBRS.has(r.abbreviation))) return false;
      if (filter === 'O' && !O6_ABBRS.has(r.abbreviation)) return false;
      if (q && !r.team_name.toLowerCase().includes(q) && !r.abbreviation.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, search, activeWSeason]);

  useEffect(() => {
    const r = rows.find((x) => x.abbreviation === selected);
    setDraft(r ? JSON.parse(JSON.stringify(r)) : null);
    setBanner(null);
  }, [selected, rows]);

  const update = (patch: Partial<TeamRow>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const updateJersey = (side: 'jersey_home' | 'jersey_away', key: keyof TeamJerseyPalette, value: string) =>
    setDraft((d) => (d ? { ...d, [side]: { ...d[side], [key]: value } } : d));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch('/api/team-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          team: {
            abbreviation: draft.abbreviation,
            team_name: draft.team_name,
            primary_color: draft.primary_color,
            secondary_color: draft.secondary_color,
            text_color: draft.text_color,
            accent_color: draft.accent_color,
            jersey_home: draft.jersey_home,
            jersey_away: draft.jersey_away,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setRows((prev) => prev.map((r) => (r.abbreviation === draft.abbreviation ? { ...draft, inTable: true } : r)));
        setBanner({ ok: true, text: `Saved ${draft.abbreviation}. Team page & Mod My Team pick it up on next load.` });
      } else {
        setBanner({ ok: false, text: json.error || `Save failed (HTTP ${res.status})` });
      }
    } catch {
      setBanner({ ok: false, text: 'Could not reach the server.' });
    } finally {
      setSaving(false);
    }
  };

  // ---------------- RENDER ----------------
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#f4f1ea] font-serif flex items-start justify-center p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify(password);
          }}
          className="mt-16 w-full max-w-sm bg-white border-4 border-black p-5 shadow-[4px_4px_0px_#000] space-y-3"
        >
          <h1 className="text-2xl font-black uppercase tracking-tight">Team Colors Admin</h1>
          <p className="text-xs italic text-gray-600">Enter the admin password to edit team theme colors and default jerseys.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full border-2 border-black px-2 py-1.5 font-mono text-sm"
            autoFocus
          />
          {authError && <p className="text-xs font-bold text-red-700">{authError}</p>}
          <button
            type="submit"
            disabled={checking || !password}
            className="w-full bg-black text-yellow-400 font-black uppercase text-sm py-2 border-2 border-black disabled:opacity-50 cursor-pointer"
          >
            {checking ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    );
  }

  const pText = draft ? draft.text_color || readableTextOn(draft.primary_color) : '#ffffff';

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black font-serif p-3 sm:p-6">
      <header className="border-b-4 border-black pb-3 mb-4 flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Team Colors Admin</h1>
          <p className="text-xs font-bold uppercase italic text-gray-700">
            Theme colors for team pages + default home/away jerseys for Mod My Team. Saved to Supabase <code>team_colors</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem(PW_STORAGE_KEY);
            setUnlocked(false);
            setPassword('');
          }}
          className="text-xs font-black uppercase border-2 border-black px-3 py-1 bg-white hover:bg-gray-100 self-start md:self-auto cursor-pointer"
        >
          Lock
        </button>
      </header>

      {tableMissing && (
        <div className="mb-4 border-2 border-red-700 bg-red-50 text-red-800 p-3 text-xs font-bold">
          The <code>team_colors</code> table doesn&apos;t exist yet. Run <code>supabase/team_colors.sql</code> in the Supabase SQL Editor, then reload.
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Team list */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-3 bg-white border-2 border-black p-3 space-y-2 md:sticky md:top-3 md:max-h-[calc(100vh-1.5rem)] md:overflow-y-auto">
          <div className="flex border-2 border-black">
            {(['W', 'O', 'ALL'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`flex-1 py-1 text-[11px] font-black uppercase cursor-pointer ${filter === f ? 'bg-black text-yellow-400' : 'bg-[#faf8f5] hover:bg-gray-100'}`}
              >
                {f === 'W' ? 'W League' : f === 'O' ? 'Original 6' : 'All Teams'}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team…"
            className="w-full border border-black px-2 py-1 text-xs font-mono"
          />
          {loading ? (
            <p className="text-xs italic text-gray-500 animate-pulse">Loading teams…</p>
          ) : (
            <ul className="divide-y divide-black/10">
              {visible.map((r) => (
                <li key={r.abbreviation}>
                  <button
                    type="button"
                    onClick={() => setSelected(r.abbreviation)}
                    className={`w-full flex items-center gap-2 px-1.5 py-1.5 text-left cursor-pointer ${selected === r.abbreviation ? 'bg-yellow-100' : 'hover:bg-gray-50'}`}
                  >
                    {r.logo_url ? <img src={r.logo_url} alt="" className="w-6 h-6 object-contain shrink-0" /> : <span className="w-6 h-6 shrink-0" />}
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-black uppercase truncate">{r.team_name}</span>
                      <span className="block text-[9px] font-mono text-gray-500">{r.abbreviation}{r.inTable ? '' : ' • not saved yet'}</span>
                    </span>
                    <span className="flex shrink-0 border border-black">
                      <span className="w-3.5 h-5" style={{ backgroundColor: r.primary_color }} />
                      <span className="w-3.5 h-5" style={{ backgroundColor: r.secondary_color }} />
                    </span>
                  </button>
                </li>
              ))}
              {visible.length === 0 && <li className="text-xs italic text-gray-500 py-2">No teams match.</li>}
            </ul>
          )}
        </aside>

        {/* Editor */}
        <main className="col-span-12 md:col-span-8 lg:col-span-9 space-y-4">
          {!draft ? (
            <div className="bg-white border-2 border-black p-8 text-center text-sm italic text-gray-600">Pick a team on the left to edit its colors.</div>
          ) : (
            <>
              {/* Live team page header preview */}
              <section
                className="border-2 border-black p-3 sm:p-4 shadow-[3px_3px_0px_#000]"
                style={{ backgroundColor: tintHex(draft.primary_color, 0.9) }}
              >
                <div className="text-[10px] font-mono font-black uppercase mb-1.5 text-black/60">Team page preview</div>
                <div
                  className="flex items-center gap-4 p-3 border-2 border-black"
                  style={{
                    background: `linear-gradient(135deg, ${draft.primary_color} 0%, ${draft.primary_color} 62%, ${draft.secondary_color} 62%, ${draft.secondary_color} 68%, ${draft.primary_color} 68%)`,
                    color: pText,
                  }}
                >
                  <div className="w-16 h-16 bg-white border-4 p-1 flex items-center justify-center shrink-0" style={{ borderColor: draft.secondary_color }}>
                    {draft.logo_url && <img src={draft.logo_url} alt="" className="max-w-full max-h-full object-contain" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-2xl sm:text-3xl font-black uppercase tracking-tighter truncate">{draft.team_name}</div>
                    <span
                      className="inline-block mt-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase border border-black"
                      style={{ backgroundColor: draft.secondary_color, color: readableTextOn(draft.secondary_color) }}
                    >
                      {draft.abbreviation}
                    </span>
                  </div>
                </div>
              </section>

              {/* Theme colors */}
              <section className="bg-white border-2 border-black p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <h2 className="text-sm font-black uppercase border-b-2 border-black pb-1">Team Theme</h2>
                  <ColorField label="Primary" value={draft.primary_color} onChange={(v) => v && update({ primary_color: v })} />
                  <ColorField label="Secondary" value={draft.secondary_color} onChange={(v) => v && update({ secondary_color: v })} />
                  <ColorField label="Header Text" value={draft.text_color} onChange={(v) => update({ text_color: v })} allowEmpty />
                  <p className="text-[10px] italic text-gray-500">Leave Header Text blank to auto-pick black/white for contrast.</p>
                </div>
                <div className="space-y-2">
                  <h2 className="text-sm font-black uppercase border-b-2 border-black pb-1">Quick Actions</h2>
                  <button
                    type="button"
                    onClick={() => {
                      const j = buildJerseys(draft.primary_color, draft.secondary_color);
                      update({ jersey_home: j.home, jersey_away: j.away });
                    }}
                    className="w-full text-xs font-black uppercase border-2 border-black px-3 py-1.5 bg-[#faf8f5] hover:bg-gray-100 cursor-pointer"
                  >
                    Rebuild both jerseys from team colors
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ primary_color: draft.secondary_color, secondary_color: draft.primary_color })}
                    className="w-full text-xs font-black uppercase border-2 border-black px-3 py-1.5 bg-[#faf8f5] hover:bg-gray-100 cursor-pointer"
                  >
                    Swap primary ↔ secondary
                  </button>
                  <div className="flex gap-2">
                    {draft.team_id && (
                      <Link href={`/team/${draft.team_id}`} target="_blank" className="flex-1 text-center text-[11px] font-black uppercase border border-black px-2 py-1 hover:bg-gray-100">
                        Open team page ↗
                      </Link>
                    )}
                    <Link href="/mod-my-team" target="_blank" className="flex-1 text-center text-[11px] font-black uppercase border border-black px-2 py-1 hover:bg-gray-100">
                      Open Mod My Team ↗
                    </Link>
                  </div>
                </div>
              </section>

              {/* Jerseys */}
              <section className="bg-white border-2 border-black p-3 sm:p-4">
                <h2 className="text-sm font-black uppercase border-b-2 border-black pb-1 mb-3">Default Jerseys (Mod My Team)</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {([
                    { side: 'jersey_home', label: 'Home (Light)' },
                    { side: 'jersey_away', label: 'Away (Dark)' },
                  ] as const).map(({ side, label }) => (
                    <div key={side} className="flex gap-3 items-start">
                      <JerseyPreview pal={draft[side]} label={label} />
                      <div className="flex-1 space-y-1.5">
                        {JERSEY_SLOTS.map(({ key, label: slotLabel }) => (
                          <ColorField key={key} label={slotLabel} value={draft[side][key]} onChange={(v) => v && updateJersey(side, key, v)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {O6_ABBRS.has(draft.abbreviation) && (
                  <p className="mt-3 text-[10px] italic text-gray-600">
                    Original 6 note: saving here replaces the built-in classic jersey defaults for this team.
                  </p>
                )}
              </section>

              {/* Save bar */}
              <div className="sticky bottom-0 bg-[#f4f1ea] border-t-2 border-black py-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="bg-black text-yellow-400 font-black uppercase text-sm px-5 py-2 border-2 border-black disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving…' : `Save ${draft.abbreviation}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const original = rows.find((r) => r.abbreviation === selected);
                    setDraft(original ? JSON.parse(JSON.stringify(original)) : null);
                    setBanner(null);
                  }}
                  className="text-xs font-black uppercase border-2 border-black px-3 py-2 bg-white hover:bg-gray-100 cursor-pointer"
                >
                  Discard changes
                </button>
                {banner && (
                  <span className={`text-xs font-bold ${banner.ok ? 'text-emerald-700' : 'text-red-700'}`}>{banner.text}</span>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
