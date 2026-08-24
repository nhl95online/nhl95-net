"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Search, Download, Users, Plus, X,
  Star, Table, Sparkles, UserCheck,
  Check, HelpCircle, Layers, TrendingUp, ArrowRightLeft,
  BarChart2
} from 'lucide-react';

// =========================================================================
// 1. CONSTANTS & HELPER FUNCTIONS
// =========================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prdfunbzqsvqlyiwmuqp.supabase.co';
const PORTRAIT_BUCKET = "nhl%20players";
const BANNER_BUCKET = "nhl%20banners";

// Weight Index Table (0 to 15 -> 120 to 260 lbs)
const WEIGHT_LOOKUP = [120, 132, 140, 148, 156, 164, 172, 180, 188, 196, 204, 212, 220, 228, 236, 244, 252, 260];

export const calculateWeight = (idx: any): { lbs: number | string; indexText: string } => {
  if (idx === undefined || idx === null || idx === '') return { lbs: 'N/A', indexText: '' };
  const numericIdx = Number(idx);
  if (isNaN(numericIdx)) return { lbs: String(idx), indexText: '' };

  // If value is already in lbs (> 50)
  if (numericIdx > 50) {
    let closestIdx = 0;
    let minDiff = 999;
    WEIGHT_LOOKUP.forEach((w, i) => {
      const diff = Math.abs(w - numericIdx);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });
    return { lbs: numericIdx, indexText: `(${closestIdx})` };
  }

  const boundedIdx = Math.max(0, Math.min(WEIGHT_LOOKUP.length - 1, numericIdx));
  return { lbs: WEIGHT_LOOKUP[boundedIdx], indexText: `(${boundedIdx})` };
};

// Converts any rating number to standard 0 - 6 Scale level
export const getScaleLevel = (val: any): number => {
  const n = Number(val);
  if (isNaN(n) || n <= 0) return 0;
  if (n <= 6) return Math.round(n);
  if (n < 29) return 0;
  if (n <= 38) return 1;
  if (n <= 47) return 2;
  if (n <= 62) return 3;
  if (n <= 80) return 4;
  if (n <= 98) return 5;
  return 6;
};

// Heat-map styling for ratings
export const getHeatmapColor = (level: number) => {
  switch (level) {
    case 1: return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' }; // level 1
    case 2: return { bg: '#bbf7d0', text: '#166534', border: '#86efac' }; // level 2
    case 3: return { bg: '#86efac', text: '#14532d', border: '#4ade80' }; // level 3
    case 4: return { bg: '#4ade80', text: '#052e16', border: '#22c55e' }; // level 4
    case 5: return { bg: '#22c55e', text: '#ffffff', border: '#16a34a' }; // level 5
    case 6: return { bg: '#15803d', text: '#ffffff', border: '#166534' }; // level 6
    default: return { bg: '#ffffff', text: '#94a3b8', border: '#e2e8f0' }; // 0 / blank
  }
};

export const isGoalie = (pos: any): boolean => {
  const p = String(pos || '').trim().toUpperCase();
  return p === 'G' || p.includes('GOAL') || p.includes('GK');
};

export const parseJson = (val: any) => {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    let parsed = JSON.parse(val);
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch { }
    }
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

export const getRatingVal = (ratingsObj: any, ...aliases: string[]): number => {
  if (!ratingsObj) return 0;
  const r = typeof ratingsObj === 'string' ? parseJson(ratingsObj) : ratingsObj;
  if (!r || typeof r !== 'object') return 0;

  // 1. Direct check on raw keys
  for (const a of aliases) {
    if (r[a] !== undefined && r[a] !== null && r[a] !== '') {
      const num = Number(r[a]);
      if (!isNaN(num)) return num;
    }
  }

  // 2. Normalized key lookup (ignore case, spaces, underscores, hyphens)
  const normAliases = aliases.map((a) => a.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const [key, val] of Object.entries(r)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normAliases.includes(cleanKey)) {
      const num = Number(val);
      if (!isNaN(num)) return num;
    }
  }

  return 0;
};

export const getPlayerHandedness = (player: any): string => {
  if (!player) return 'L';
  const info = parseJson(player.player_info);
  const r = parseJson(player.ratings);
  const isG = isGoalie(player.pos || info?.pos);

  // Search through all candidate keys across player_info, player root, and ratings
  const sources = [info, player, r];

  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;

    for (const [key, val] of Object.entries(src)) {
      if (val === undefined || val === null || val === '') continue;
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (
        cleanKey === 'hand' ||
        cleanKey === 'shoots' ||
        cleanKey === 'handedness' ||
        cleanKey === 'handiness' ||
        cleanKey === 'catch' ||
        cleanKey === 'catches' ||
        cleanKey === 'shoot' ||
        cleanKey === 'shot' ||
        cleanKey === 'h' ||
        cleanKey === 'shothand' ||
        cleanKey === 'shootscatches' ||
        cleanKey === 'handdefault'
      ) {
        const strVal = String(val).trim().toUpperCase();

        // 0 = L, 1 = R
        if (strVal === '0' || strVal === 'L' || strVal.startsWith('LEFT') || strVal.startsWith('L-') || strVal.startsWith('LH')) {
          return 'L';
        }
        if (strVal === '1' || strVal === 'R' || strVal.startsWith('RIGHT') || strVal.startsWith('R-') || strVal.startsWith('RH')) {
          return 'R';
        }
        if (strVal.length > 0 && (strVal[0] === 'R' || strVal[0] === 'L')) {
          return strVal[0];
        }
      }
    }
  }

  return isG ? 'R' : 'L';
};

// Extract standardized ratings object with fallback across ratings and player_info
export const getPlayerRatingAttributes = (player: any) => {
  const r = parseJson(player?.ratings);
  const info = parseJson(player?.player_info);
  const isG = isGoalie(player?.pos || info?.pos);
  const combined = { ...info, ...r };

  if (isG) {
    return [
      { key: 'Agility', label: 'Agility', value: getScaleLevel(getRatingVal(combined, 'Agility', 'Agl', 'Agi', 'agl', 'agi', 'AGL', 'AGI', 'agility', 'agil')) },
      { key: 'Speed', label: 'Speed', value: getScaleLevel(getRatingVal(combined, 'Speed', 'Spd', 'spd', 'SPD', 'speed')) },
      { key: 'Off Aware', label: 'Off Aware', value: getScaleLevel(getRatingVal(combined, 'Off Aware', 'ofA', 'OfA', 'off_aware', 'Off_Aware', 'offaware', 'OFA', 'offense', 'off')) },
      { key: 'Def Aware', label: 'Def Aware', value: getScaleLevel(getRatingVal(combined, 'Def Aware', 'dfA', 'DfA', 'def_aware', 'Def_Aware', 'defaware', 'DFA', 'defense', 'def')) },
      { key: 'Puck Control', label: 'Puck Control', value: getScaleLevel(getRatingVal(combined, 'Puck Control', 'pkc', 'PkC', 'PKC', 'puck_control', 'puckcontrol', 'control', 'pc')) },
      { key: 'Stick Right', label: 'Stick Right', value: getScaleLevel(getRatingVal(combined, 'Stick Right', 'stR', 'StR', 'str', 'STR', 'stick_right', 'stickright', 'sr')) },
      { key: 'Stick Left', label: 'Stick Left', value: getScaleLevel(getRatingVal(combined, 'Stick Left', 'stL', 'StL', 'stl', 'STL', 'stick_left', 'stickleft', 'sl')) },
      { key: 'Glove Right', label: 'Glove Right', value: getScaleLevel(getRatingVal(combined, 'Glove Right', 'gvR', 'GvR', 'gvr', 'GVR', 'glove_right', 'gloveright', 'gr')) },
      { key: 'Glove Left', label: 'Glove Left', value: getScaleLevel(getRatingVal(combined, 'Glove Left', 'gvL', 'GvL', 'gvl', 'GVL', 'glove_left', 'gloveleft', 'gl')) },
    ];
  }

  return [
    { key: 'Agility', label: 'Agility', value: getScaleLevel(getRatingVal(combined, 'Agility', 'Agl', 'Agi', 'agl', 'agi', 'AGL', 'AGI', 'agility', 'agil', 'ag')) },
    { key: 'Speed', label: 'Speed', value: getScaleLevel(getRatingVal(combined, 'Speed', 'Spd', 'spd', 'SPD', 'speed', 'sp')) },
    { key: 'Off Aware', label: 'Off Aware', value: getScaleLevel(getRatingVal(combined, 'Off Aware', 'ofA', 'OfA', 'off_aware', 'Off_Aware', 'offaware', 'OFA', 'offense', 'off')) },
    { key: 'Def Aware', label: 'Def Aware', value: getScaleLevel(getRatingVal(combined, 'Def Aware', 'dfA', 'DfA', 'def_aware', 'Def_Aware', 'defaware', 'DFA', 'defense', 'def')) },
    { key: 'Shot Power', label: 'Shot Power', value: getScaleLevel(getRatingVal(combined, 'Shot Power', 'shPW', 'ShPW', 'shP', 'ShP', 'shp', 'SHP', 'shot_power', 'Shot_Power', 'power', 'pwr', 'sp')) },
    { key: 'Shot Accuracy', label: 'Shot Accuracy', value: getScaleLevel(getRatingVal(combined, 'Shot Accuracy', 'shA', 'ShA', 'sha', 'SHA', 'shot_accuracy', 'Shot_Accuracy', 'accuracy', 'acc', 'sa')) },
    { key: 'Stick Handling', label: 'Stick Handling', value: getScaleLevel(getRatingVal(combined, 'Stick Handling', 'stH', 'StH', 'sth', 'STH', 'st_h', 'ST_H', 'stick_handling', 'Stick_Handling', 'stickhandling', 'handling', 'puck_control', 'Puck Control', 'puckcontrol', 'pkc', 'PkC', 'PKC', 'puck_handling', 'Puck Handling', 'stick', 'Stick', 'control', 'Control', 'sh', 'SH', 'st', 'ST')) },
    { key: 'Passing', label: 'Passing', value: getScaleLevel(getRatingVal(combined, 'Passing', 'Pas', 'pas', 'pass', 'Pass', 'PAS', 'PASS', 'passing')) },
    { key: 'Checking', label: 'Checking', value: getScaleLevel(getRatingVal(combined, 'Checking', 'ChK', 'chk', 'CHK', 'check', 'Check', 'checking')) },
    { key: 'Aggression', label: 'Aggression', value: getScaleLevel(getRatingVal(combined, 'Aggression', 'Agr', 'agr', 'AGR', 'agg', 'Agg', 'roughness', 'Roughness', 'rgh', 'aggression')) },
  ];
};

// Calculate career average rating attributes across all recorded seasons
export const getCareerAverageRatingAttributes = (careerData: any[], fallbackPlayer: any) => {
  const records = careerData && careerData.length > 0 ? careerData : fallbackPlayer ? [fallbackPlayer] : [];
  if (records.length === 0) return [];

  const isG = records.some((p) => isGoalie(p?.pos || parseJson(p?.player_info)?.pos));

  if (isG) {
    const keys = [
      { key: 'Agility', label: 'Agility', aliases: ['Agility', 'Agl', 'Agi', 'agl', 'agi', 'AGL', 'AGI', 'agility', 'agil'] },
      { key: 'Speed', label: 'Speed', aliases: ['Speed', 'Spd', 'spd', 'SPD', 'speed'] },
      { key: 'Off Aware', label: 'Off Aware', aliases: ['Off Aware', 'ofA', 'OfA', 'off_aware', 'Off_Aware', 'offaware', 'OFA', 'offense', 'off'] },
      { key: 'Def Aware', label: 'Def Aware', aliases: ['Def Aware', 'dfA', 'DfA', 'def_aware', 'Def_Aware', 'defaware', 'DFA', 'defense', 'def'] },
      { key: 'Puck Control', label: 'Puck Control', aliases: ['Puck Control', 'pkc', 'PkC', 'PKC', 'puck_control', 'puckcontrol', 'control', 'pc'] },
      { key: 'Stick Right', label: 'Stick Right', aliases: ['Stick Right', 'stR', 'StR', 'str', 'STR', 'stick_right', 'stickright', 'sr'] },
      { key: 'Stick Left', label: 'Stick Left', aliases: ['Stick Left', 'stL', 'StL', 'stl', 'STL', 'stick_left', 'stickleft', 'sl'] },
      { key: 'Glove Right', label: 'Glove Right', aliases: ['Glove Right', 'gvR', 'GvR', 'gvr', 'GVR', 'glove_right', 'gloveright', 'gr'] },
      { key: 'Glove Left', label: 'Glove Left', aliases: ['Glove Left', 'gvL', 'GvL', 'gvl', 'GVL', 'glove_left', 'gloveleft', 'gl'] },
    ];

    return keys.map(({ key, label, aliases }) => {
      let rawSum = 0;
      let validCount = 0;
      records.forEach((row) => {
        const r = parseJson(row?.ratings);
        const info = parseJson(row?.player_info);
        const combined = { ...info, ...r };
        const val = getRatingVal(combined, ...aliases);
        if (val > 0) {
          rawSum += val;
          validCount += 1;
        }
      });

      const avgRaw = validCount > 0 ? rawSum / validCount : 0;
      return {
        key,
        label,
        value: getScaleLevel(avgRaw),
        rawValue: Math.round(avgRaw),
      };
    });
  }

  const keys = [
    { key: 'Agility', label: 'Agility', aliases: ['Agility', 'Agl', 'Agi', 'agl', 'agi', 'AGL', 'AGI', 'agility', 'agil', 'ag'] },
    { key: 'Speed', label: 'Speed', aliases: ['Speed', 'Spd', 'spd', 'SPD', 'speed', 'sp'] },
    { key: 'Off Aware', label: 'Off Aware', aliases: ['Off Aware', 'ofA', 'OfA', 'off_aware', 'Off_Aware', 'offaware', 'OFA', 'offense', 'off'] },
    { key: 'Def Aware', label: 'Def Aware', aliases: ['Def Aware', 'dfA', 'DfA', 'def_aware', 'Def_Aware', 'defaware', 'DFA', 'defense', 'def'] },
    { key: 'Shot Power', label: 'Shot Power', aliases: ['Shot Power', 'shPW', 'ShPW', 'shP', 'ShP', 'shp', 'SHP', 'shot_power', 'Shot_Power', 'power', 'pwr', 'sp'] },
    { key: 'Shot Accuracy', label: 'Shot Accuracy', aliases: ['Shot Accuracy', 'shA', 'ShA', 'sha', 'SHA', 'shot_accuracy', 'Shot_Accuracy', 'accuracy', 'acc', 'sa'] },
    { key: 'Stick Handling', label: 'Stick Handling', aliases: ['Stick Handling', 'stH', 'StH', 'sth', 'STH', 'st_h', 'ST_H', 'stick_handling', 'Stick_Handling', 'stickhandling', 'handling', 'puck_control', 'Puck Control', 'puckcontrol', 'pkc', 'PkC', 'PKC', 'puck_handling', 'Puck Handling', 'stick', 'Stick', 'control', 'Control', 'sh', 'SH', 'st', 'ST'] },
    { key: 'Passing', label: 'Passing', aliases: ['Passing', 'Pas', 'pas', 'pass', 'Pass', 'PAS', 'PASS', 'passing'] },
    { key: 'Checking', label: 'Checking', aliases: ['Checking', 'ChK', 'chk', 'CHK', 'check', 'Check', 'checking'] },
    { key: 'Aggression', label: 'Aggression', aliases: ['Aggression', 'Agr', 'agr', 'AGR', 'agg', 'Agg', 'roughness', 'Roughness', 'rgh', 'aggression'] },
  ];

  return keys.map(({ key, label, aliases }) => {
    let rawSum = 0;
    let validCount = 0;
    records.forEach((row) => {
      const r = parseJson(row?.ratings);
      const info = parseJson(row?.player_info);
      const combined = { ...info, ...r };
      const val = getRatingVal(combined, ...aliases);
      if (val > 0) {
        rawSum += val;
        validCount += 1;
      }
    });

    const avgRaw = validCount > 0 ? rawSum / validCount : 0;
    return {
      key,
      label,
      value: getScaleLevel(avgRaw),
      rawValue: Math.round(avgRaw),
    };
  });
};

// =========================================================================
// 2. SUBCOMPONENTS
// =========================================================================

// Visual Rating Matrix (1-6 scale with shaded boxes)
const RatingMatrix = ({
  ratings,
  showHeader = true,
  title = 'Ratings',
}: {
  ratings: Array<{ key: string; label: string; value: number }>;
  showHeader?: boolean;
  title?: string;
}) => {
  return (
    <div className="border-2 border-black bg-white overflow-hidden text-[9px] font-mono">
      {showHeader && (
        <div className="grid grid-cols-12 bg-black text-white font-black py-1 px-1.5 border-b border-black text-center">
          <span className="col-span-5 text-left uppercase tracking-wider pl-1">{title}</span>
          <span className="col-span-1">1</span>
          <span className="col-span-1">2</span>
          <span className="col-span-1">3</span>
          <span className="col-span-1">4</span>
          <span className="col-span-1">5</span>
          <span className="col-span-1">6</span>
          <span className="col-span-1 text-right pr-1">Sc</span>
        </div>
      )}
      <div className="divide-y divide-black/30">
        {ratings.map((item) => {
          const val = Math.max(0, Math.min(6, item.value));
          const color = getHeatmapColor(val);
          return (
            <div key={item.key} className="grid grid-cols-12 items-center py-0.5 px-1.5 hover:bg-emerald-50/50">
              <span className="col-span-5 font-bold truncate text-slate-800 text-[9px] pl-1">
                {item.label}
              </span>
              {[1, 2, 3, 4, 5, 6].map((num) => {
                const filled = num <= val;
                return (
                  <div key={num} className="col-span-1 flex items-center justify-center p-0.5">
                    <div
                      className={`w-3.5 h-3.5 border border-black/80 flex items-center justify-center text-[7px] font-black ${filled ? '' : 'bg-transparent'
                        }`}
                      style={{
                        backgroundColor: filled ? color.bg : 'transparent',
                        borderColor: filled ? '#15803d' : '#000000',
                      }}
                    >
                      {filled ? (
                        <div className="w-1.5 h-1.5 rounded-3xs bg-black/60" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
              <span className="col-span-1 font-mono font-black text-right pr-1 text-slate-900">
                {val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Player Portrait with Fallbacks
const PlayerPortrait = ({ name, url, className = "w-24 h-24" }: { name: string; url: string; className?: string }) => {
  const filename = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  const [imgSrc, setImgSrc] = useState(`${url}/${filename}.png`);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setImgSrc(`${url}/${filename}.png`);
  }, [name, url, filename]);

  if (failed || !name) {
    return (
      <div className={`${className} object-cover border-2 border-black bg-slate-200 flex flex-col items-center justify-center text-slate-500 font-mono shadow-inner`}>
        <UserCheck className="w-8 h-8 opacity-40" />
        <span className="text-[7px] font-bold uppercase mt-0.5 opacity-80">Photo</span>
      </div>
    );
  }

  return (
    <img
      key={name}
      src={imgSrc}
      alt={name}
      className={`${className} object-cover border-2 border-black bg-slate-100 shadow-sm`}
      onError={() => {
        if (imgSrc.endsWith('.png')) {
          setImgSrc(`${url}/${filename}.jpg`);
        } else {
          setFailed(true);
        }
      }}
    />
  );
};

const NHL_TEAM_ABBR_MAP: Record<string, string> = {
  'ANA': 'ANA', 'ANAHEIM': 'ANA', 'MIGHTY DUCKS OF ANAHEIM': 'ANA', 'ANAHEIM DUCKS': 'ANA',
  'ARI': 'ARI', 'ARIZONA': 'ARI', 'ARIZONA COYOTES': 'ARI', 'PHOENIX COYOTES': 'ARI', 'PHX': 'ARI',
  'BOS': 'BOS', 'BOSTON': 'BOS', 'BOSTON BRUINS': 'BOS',
  'BUF': 'BUF', 'BUFFALO': 'BUF', 'BUFFALO SABRES': 'BUF',
  'CAR': 'CAR', 'CAROLINA': 'CAR', 'CAROLINA HURRICANES': 'CAR',
  'CBJ': 'CBJ', 'COLUMBUS': 'CBJ', 'COLUMBUS BLUE JACKETS': 'CBJ', 'CLB': 'CBJ',
  'CGY': 'CGY', 'CALGARY': 'CGY', 'CALGARY FLAMES': 'CGY',
  'CHI': 'CHI', 'CHICAGO': 'CHI', 'CHICAGO BLACKHAWKS': 'CHI',
  'COL': 'COL', 'COLORADO': 'COL', 'COLORADO AVALANCHE': 'COL',
  'DAL': 'DAL', 'DALLAS': 'DAL', 'DALLAS STARS': 'DAL',
  'DET': 'DET', 'DETROIT': 'DET', 'DETROIT RED WINGS': 'DET', 'DTC': 'DET',
  'EDM': 'EDM', 'EDMONTON': 'EDM', 'EDMONTON OILERS': 'EDM',
  'FLA': 'FLA', 'FLORIDA': 'FLA', 'FLORIDA PANTHERS': 'FLA',
  'HFD': 'HFD', 'HARTFORD': 'HFD', 'HARTFORD WHALERS': 'HFD',
  'LA': 'LAK', 'LAK': 'LAK', 'LOS ANGELES': 'LAK', 'LOS ANGELES KINGS': 'LAK', 'LOS_ANGELES_KINGS': 'LAK',
  'MIN': 'MIN', 'MINNESOTA': 'MIN', 'MINNESOTA WILD': 'MIN', 'MINNESOTA NORTH STARS': 'MIN', 'MNS': 'MIN',
  'MTL': 'MTL', 'MONTREAL': 'MTL', 'CANADIENS': 'MTL', 'MONTREAL CANADIENS': 'MTL', 'MON': 'MTL',
  'NJD': 'NJD', 'NEW JERSEY': 'NJD', 'NEW JERSEY DEVILS': 'NJD', 'NJ': 'NJD',
  'NSH': 'NSH', 'NASHVILLE': 'NSH', 'NASHVILLE PREDATORS': 'NSH',
  'NYI': 'NYI', 'NEW YORK ISLANDERS': 'NYI', 'ISLANDERS': 'NYI',
  'NYR': 'NYR', 'NEW YORK RANGERS': 'NYR', 'RANGERS': 'NYR', 'NY': 'NYR',
  'OTT': 'OTT', 'OTTAWA': 'OTT', 'OTTAWA SENATORS': 'OTT',
  'PHI': 'PHI', 'PHILADELPHIA': 'PHI', 'PHILADELPHIA FLYERS': 'PHI',
  'PIT': 'PIT', 'PITTSBURGH': 'PIT', 'PITTSBURGH PENGUINS': 'PIT',
  'QUE': 'QUE', 'QUEBEC': 'QUE', 'QUEBEC NORDIQUES': 'QUE',
  'SEA': 'SEA', 'SEATTLE': 'SEA', 'SEATTLE KRAKEN': 'SEA',
  'SJ': 'SJS', 'SJS': 'SJS', 'SAN JOSE': 'SJS', 'SAN JOSE SHARKS': 'SJS', 'SAN_JOSE_SHARKS': 'SJS',
  'STL': 'STL', 'ST. LOUIS': 'STL', 'ST LOUIS': 'STL', 'ST. LOUIS BLUES': 'STL', 'ST LOUIS BLUES': 'STL',
  'TB': 'TBL', 'TBL': 'TBL', 'TAMPA': 'TBL', 'TAMPA BAY': 'TBL', 'TAMPA BAY LIGHTNING': 'TBL',
  'TOR': 'TOR', 'TORONTO': 'TOR', 'TORONTO MAPLE LEAFS': 'TOR',
  'UTA': 'UTA', 'UTAH': 'UTA', 'UTAH HOCKEY CLUB': 'UTA',
  'VAN': 'VAN', 'VANCOUVER': 'VAN', 'VANCOUVER CANUCKS': 'VAN',
  'VGK': 'VGK', 'VEGAS': 'VGK', 'VEGAS GOLDEN KNIGHTS': 'VGK',
  'WAS': 'WAS', 'WASHINGTON': 'WAS', 'WASHINGTON CAPITALS': 'WAS', 'WSH': 'WAS',
  'WPG': 'WPG', 'WINNIPEG': 'WPG', 'WINNIPEG JETS': 'WPG', 'WIN': 'WPG'
};

// Known NHL franchise era boundaries for automated range matching
const NHL_ERA_RANGES: Record<string, Array<{ start: number; end: number }>> = {
  ANA: [
    { start: 1993, end: 2006 }, // Mighty Ducks
    { start: 2006, end: 2014 }, // Wordmark
    { start: 2014, end: 2024 }, // Webbed D
    { start: 2024, end: 2030 }, // Orange
  ],
  ARI: [
    { start: 1996, end: 2003 }, // Kachina
    { start: 2003, end: 2021 }, // Howling Coyote
    { start: 2021, end: 2024 }, // Kachina Return
  ],
  BOS: [
    { start: 1924, end: 1948 },
    { start: 1949, end: 1995 },
    { start: 1995, end: 2007 },
    { start: 2007, end: 2030 },
  ],
  BUF: [
    { start: 1970, end: 1996 }, // Classic Crossed Sabres
    { start: 1996, end: 2006 }, // Goathead
    { start: 2006, end: 2010 }, // Buffaslug
    { start: 2010, end: 2030 }, // Modern Blue & Gold
  ],
  CAR: [
    { start: 1972, end: 1997 }, // Whalers
    { start: 1997, end: 2030 }, // Hurricanes
  ],
  CBJ: [
    { start: 2000, end: 2007 },
    { start: 2007, end: 2030 },
  ],
  CGY: [
    { start: 1972, end: 1980 }, // Atlanta Flames
    { start: 1980, end: 1994 }, // Classic
    { start: 1995, end: 2007 }, // Pedestal
    { start: 2008, end: 2030 }, // Modern
  ],
  CHI: [
    { start: 1926, end: 1955 },
    { start: 1955, end: 1999 },
    { start: 1999, end: 2030 },
  ],
  COL: [
    { start: 1972, end: 1995 }, // Nordiques
    { start: 1995, end: 2030 }, // Avalanche
  ],
  DAL: [
    { start: 1967, end: 1993 }, // North Stars
    { start: 1993, end: 2013 }, // Dallas Star
    { start: 2013, end: 2030 }, // Victory Green
  ],
  DET: [
    { start: 1926, end: 1932 },
    { start: 1932, end: 2030 }, // Winged Wheel
  ],
  EDM: [
    { start: 1972, end: 1996 }, // Classic
    { start: 1996, end: 2011 }, // Copper & Navy
    { start: 2011, end: 2030 }, // Royal Blue
  ],
  FLA: [
    { start: 1993, end: 2016 }, // Leaping Panther
    { start: 2016, end: 2030 }, // Shield
  ],
  HFD: [
    { start: 1979, end: 1997 }, // Whalers
  ],
  LAK: [
    { start: 1967, end: 1988 }, // Forum Blue & Gold Crown
    { start: 1988, end: 1998 }, // Chevy Silver & Black
    { start: 1998, end: 2011 }, // Crown Shield
    { start: 2011, end: 2030 }, // Home Plate
  ],
  MIN: [
    { start: 1967, end: 1993 }, // North Stars
    { start: 2000, end: 2030 }, // Wild
  ],
  MTL: [
    { start: 1909, end: 1917 },
    { start: 1917, end: 1924 },
    { start: 1924, end: 1935 },
    { start: 1924, end: 1937 },
    { start: 1924, end: 1938 },
    { start: 1917, end: 1935 },
    { start: 1921, end: 1935 },
    { start: 1925, end: 1935 },
    { start: 1925, end: 1937 },
    { start: 1925, end: 1938 },
    { start: 1927, end: 1938 },
    { start: 1935, end: 1947 },
    { start: 1938, end: 1947 },
    { start: 1947, end: 1956 },
    { start: 1956, end: 1999 },
    { start: 1909, end: 1955 },
    { start: 1955, end: 2030 },
  ],
  NJD: [
    { start: 1982, end: 1992 }, // Red & Green
    { start: 1992, end: 2030 }, // Red & Black
  ],
  NSH: [
    { start: 1998, end: 2011 },
    { start: 2011, end: 2030 },
  ],
  NYI: [
    { start: 1972, end: 1995 }, // Classic
    { start: 1995, end: 1997 }, // Fisherman
    { start: 1997, end: 2030 }, // Modern
  ],
  NYR: [
    { start: 1926, end: 1976 },
    { start: 1976, end: 1978 },
    { start: 1978, end: 2030 },
  ],
  OTT: [
    { start: 1992, end: 2007 }, // 2D Centurion
    { start: 2007, end: 2020 }, // 3D Centurion
    { start: 2020, end: 2030 }, // Modern 2D
  ],
  PHI: [
    { start: 1967, end: 2030 },
  ],
  PIT: [
    { start: 1967, end: 1992 }, // Skating Penguin
    { start: 1992, end: 2002 }, // Robo Penguin
    { start: 2002, end: 2016 }, // Vegas Gold
    { start: 2016, end: 2030 }, // Pittsburgh Gold
  ],
  QUE: [
    { start: 1972, end: 1995 }, // Nordiques
  ],
  SEA: [
    { start: 2021, end: 2030 },
  ],
  SJS: [
    { start: 1991, end: 2007 }, // Original Shark
    { start: 2007, end: 2030 }, // Modern Shark
  ],
  STL: [
    { start: 1967, end: 1984 },
    { start: 1984, end: 1998 },
    { start: 1998, end: 2030 },
  ],
  TBL: [
    { start: 1992, end: 2011 }, // Original Bolt
    { start: 2011, end: 2030 }, // Modern Bolt
  ],
  TOR: [
    { start: 1927, end: 1967 },
    { start: 1967, end: 2016 }, // Ballard Leaf
    { start: 2016, end: 2030 }, // Modern Classic
  ],
  UTA: [
    { start: 2024, end: 2030 },
  ],
  VAN: [
    { start: 1970, end: 1978 }, // Stick in Rink
    { start: 1978, end: 1997 }, // Flying Skate
    { start: 1997, end: 2007 }, // Orca Navy/Maroon
    { start: 2007, end: 2030 }, // Orca Blue/Green
  ],
  VGK: [
    { start: 2017, end: 2030 },
  ],
  WAS: [
    { start: 1974, end: 1995 }, // Classic Stars & Script
    { start: 1995, end: 2007 }, // Screaming Eagle
    { start: 2007, end: 2030 }, // Modern Red/Navy
  ],
  WPG: [
    { start: 1972, end: 1990 }, // Classic
    { start: 1990, end: 1996 }, // 90s
    { start: 2011, end: 2030 }, // RCAF Jet
  ],
};

// Global in-memory cache of storage logo files
let cachedStorageFiles: { bucket: string; name: string }[] | null = null;
let storageFetchPromise: Promise<{ bucket: string; name: string }[]> | null = null;

const fetchAllStorageLogos = async (): Promise<{ bucket: string; name: string }[]> => {
  if (cachedStorageFiles) return cachedStorageFiles;
  if (storageFetchPromise) return storageFetchPromise;

  storageFetchPromise = (async () => {
    const buckets = ['nhl_logos', 'nhl logos', 'logos', 'images for site'];
    const results: { bucket: string; name: string }[] = [];

    await Promise.allSettled(
      buckets.map(async (b) => {
        try {
          const { data, error } = await supabase.storage.from(b).list('', { limit: 1000 });
          if (data && !error) {
            data.forEach((item) => {
              if (item.name && item.name !== '.emptyFolderPlaceholder') {
                results.push({ bucket: b, name: item.name });
              }
            });
          }
        } catch (e) {
          // ignore bucket errors
        }
      })
    );

    cachedStorageFiles = results;
    return results;
  })();

  return storageFetchPromise;
};

// Team Logo Component looking strictly into buckets/nhl_logos with Year, Era & Range support
const TeamLogo = ({
  teamName,
  year,
  className = "w-6 h-6",
}: {
  teamName: string;
  year?: number | string;
  className?: string;
}) => {
  const cleanName = (teamName || '').trim();
  const upper = cleanName.toUpperCase();
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  const abbr = NHL_TEAM_ABBR_MAP[upper] || NHL_TEAM_ABBR_MAP[cleanName] || (upper.length <= 4 ? upper : slug);
  const yrStr = year ? String(year).trim() : '';
  const [bucketFiles, setBucketFiles] = useState<{ bucket: string; name: string }[]>(cachedStorageFiles || []);
  const [urlIdx, setUrlIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!cachedStorageFiles) {
      fetchAllStorageLogos().then((files) => {
        if (files && files.length > 0) {
          setBucketFiles([...files]);
        }
      });
    }
  }, []);

  const candidateUrls = useMemo(() => {
    if (!cleanName) return [];
    const urls: string[] = [];
    const base = 'https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public';

    // Parse potential year or range input
    let parsedYear: number | null = null;
    let rangeStart: number | null = null;
    let rangeEnd: number | null = null;

    if (yrStr && yrStr !== '----') {
      const matchRange = yrStr.match(/(\d{4})\s*[-_–]\s*(\d{4})/);
      if (matchRange) {
        rangeStart = parseInt(matchRange[1], 10);
        rangeEnd = parseInt(matchRange[2], 10);
      } else {
        const matchSingle = yrStr.match(/\d{4}/);
        if (matchSingle) {
          parsedYear = parseInt(matchSingle[0], 10);
        }
      }
    }

    const targetYear = parsedYear || rangeStart;
    const targetAbbrs = Array.from(new Set([abbr, upper, slug, cleanName].filter(Boolean)));

    // 1. Check dynamically fetched storage bucket files for ANY matching range or file in Supabase
    if (bucketFiles.length > 0) {
      for (const file of bucketFiles) {
        const fileName = file.name;
        const lowerName = fileName.toLowerCase();
        const baseName = fileName.replace(/\.[^/.]+$/, ''); // remove extension

        for (const t of targetAbbrs) {
          const tLower = t.toLowerCase();
          if (!lowerName.startsWith(tLower)) continue;

          // Check for range pattern in filename: e.g. MTL_1924_1935 or MTL_1924-1935 or MTL-1924-1935
          const rangeMatch = baseName.match(new RegExp(`^${t}[_ -]?(\\d{4})[_ –-](\\d{4})$`, 'i'));
          if (rangeMatch && targetYear) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            if (targetYear >= start && targetYear <= end) {
              urls.push(`${base}/${encodeURIComponent(file.bucket)}/${encodeURIComponent(fileName)}`);
            }
          }

          // Check for single year match in filename: e.g. MTL_1927 or MTL-1927 or MTL1927
          if (targetYear) {
            const yearMatch = baseName.match(new RegExp(`^${t}[_ -]?${targetYear}$`, 'i'));
            if (yearMatch) {
              urls.push(`${base}/${encodeURIComponent(file.bucket)}/${encodeURIComponent(fileName)}`);
            }
          }

          // Check for base franchise file: e.g. MTL.png
          if (baseName.toLowerCase() === tLower) {
            urls.push(`${base}/${encodeURIComponent(file.bucket)}/${encodeURIComponent(fileName)}`);
          }
        }
      }
    }

    // Helper to generate combinations across buckets and extensions
    const addVariant = (subpath: string) => {
      const clean = subpath.replace(/\.[^/.]+$/, '');
      const exts = ['.png', '.PNG', '.jpg', '.JPG', '.svg', '.webp'];
      const buckets = ['nhl_logos', 'nhl%20logos', 'logos', 'images%20for%20site'];
      for (const b of buckets) {
        for (const ext of exts) {
          urls.push(`${base}/${b}/${clean}${ext}`);
        }
      }
    };

    // 2. Direct explicit range checks
    if (rangeStart && rangeEnd && abbr) {
      addVariant(`${abbr}_${rangeStart}_${rangeEnd}`);
      addVariant(`${abbr}_${rangeStart}-${rangeEnd}`);
      addVariant(`${abbr}-${rangeStart}-${rangeEnd}`);
      addVariant(`${abbr.toLowerCase()}_${rangeStart}_${rangeEnd}`);
      addVariant(`${abbr}_${rangeEnd}`);
      addVariant(`${abbr}_${rangeStart}`);
    }

    // 3. Automated era-range matching based on single year
    if (targetYear && abbr && NHL_ERA_RANGES[abbr]) {
      const matchingEras = NHL_ERA_RANGES[abbr].filter(
        (era) => targetYear >= era.start && targetYear <= era.end
      );
      matchingEras.forEach((era) => {
        addVariant(`${abbr}_${era.start}_${era.end}`);
        addVariant(`${abbr}_${era.start}-${era.end}`);
        addVariant(`${abbr}-${era.start}-${era.end}`);
        addVariant(`${abbr.toLowerCase()}_${era.start}_${era.end}`);
      });
    }

    // 4. Year-specific historical logo
    if (yrStr && yrStr !== '----') {
      if (abbr) {
        addVariant(`${abbr}_${yrStr}`);
        addVariant(`${abbr}-${yrStr}`);
        addVariant(`${abbr}${yrStr}`);
        addVariant(`${abbr.toLowerCase()}_${yrStr}`);
      }
      if (slug) {
        addVariant(`${slug}_${yrStr}`);
        addVariant(`${slug}-${yrStr}`);
      }
      if (upper) addVariant(`${upper}_${yrStr}`);
    }

    // 5. Base franchise logos (fallback)
    if (abbr) {
      addVariant(`${abbr}`);
      addVariant(`${abbr.toLowerCase()}`);
    }
    if (upper) addVariant(`${upper}`);
    if (slug) addVariant(`${slug}`);
    if (cleanName) addVariant(`${cleanName}`);

    return Array.from(new Set(urls));
  }, [slug, cleanName, upper, abbr, yrStr, bucketFiles]);

  useEffect(() => {
    setUrlIdx(0);
    setFailed(false);
  }, [teamName, year, bucketFiles]);

  if (failed || candidateUrls.length === 0 || urlIdx >= candidateUrls.length) {
    return (
      <div className={`${className} bg-slate-100 border border-black/40 rounded flex items-center justify-center font-mono font-black text-[8px] text-slate-700 uppercase shrink-0 shadow-xs`}>
        {abbr || cleanName.slice(0, 3).toUpperCase() || 'NHL'}
      </div>
    );
  }

  return (
    <img
      src={candidateUrls[urlIdx]}
      alt={`${cleanName} ${yrStr || ''}`}
      className={`${className} object-contain shrink-0`}
      onError={() => {
        if (urlIdx + 1 < candidateUrls.length) {
          setUrlIdx((prev) => prev + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
};

// Career Year-by-Year Breakdown Table (with Green Heat-Map cells & Team Logo)
const CareerTable = ({
  careerRows,
  isGoaliePlayer,
  showTeam = true,
  onSelectSeason,
}: {
  careerRows: any[];
  isGoaliePlayer: boolean;
  showTeam?: boolean;
  onSelectSeason?: (row: any) => void;
}) => {
  if (!careerRows || careerRows.length === 0) {
    return (
      <div className="p-4 border-2 border-dashed border-black/50 bg-[#F5F2E6] text-center font-mono text-[9px] uppercase font-bold text-neutral-600">
        No Historical Career Breakdown Found
      </div>
    );
  }

  const sorted = [...careerRows].sort((a, b) => {
    const yrA = Number(a.player_info?.source_year || a.year || 0);
    const yrB = Number(b.player_info?.source_year || b.year || 0);
    return yrA - yrB;
  });

  return (
    <div className="border-2 border-black rounded overflow-x-auto bg-white">
      <table className="w-full text-center text-[8.5px] font-mono border-collapse uppercase min-w-[620px]">
        <thead>
          <tr className="bg-black text-white text-[8px] font-black border-b border-black">
            <th className="p-1 border-r border-neutral-700">Year</th>
            {showTeam && <th className="p-1 border-r border-neutral-700 text-left pl-2">Team</th>}
            <th className="p-1 border-r border-neutral-700">Pos</th>
            <th className="p-1 border-r border-neutral-700">JNo</th>
            <th className="p-1 border-r border-neutral-700">Wgt</th>
            <th className="p-1 border-r border-neutral-700">Agl</th>
            <th className="p-1 border-r border-neutral-700">Spd</th>
            <th className="p-1 border-r border-neutral-700">OfA</th>
            <th className="p-1 border-r border-neutral-700">DfA</th>
            {isGoaliePlayer ? (
              <>
                <th className="p-1 border-r border-neutral-700">PkC</th>
                <th className="p-1 border-r border-neutral-700">ChK</th>
                <th className="p-1 border-r border-neutral-700">H</th>
                <th className="p-1 border-r border-neutral-700 bg-emerald-900">StR</th>
                <th className="p-1 border-r border-neutral-700 bg-emerald-900">StL</th>
                <th className="p-1 border-r border-neutral-700 bg-emerald-900">GvR</th>
                <th className="p-1 border-r border-neutral-700 bg-emerald-900">GvL</th>
                <th className="p-1 border-r border-neutral-700">Pas</th>
                <th className="p-1 border-r border-neutral-700">Agr</th>
              </>
            ) : (
              <>
                <th className="p-1 border-r border-neutral-700">ShPW</th>
                <th className="p-1 border-r border-neutral-700">ChK</th>
                <th className="p-1 border-r border-neutral-700">H</th>
                <th className="p-1 border-r border-neutral-700 bg-emerald-900">StH</th>
                <th className="p-1 border-r border-neutral-700 bg-emerald-900">ShA</th>
                <th className="p-1 border-r border-neutral-700 bg-emerald-900">End</th>
                <th className="p-1 border-r border-neutral-700 bg-emerald-900">Rgh</th>
                <th className="p-1 border-r border-neutral-700">Pas</th>
                <th className="p-1 border-r border-neutral-700">Agr</th>
              </>
            )}
            <th className="p-1 font-black bg-neutral-900 text-amber-300">OVR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/40">
          {sorted.map((row, idx) => {
            const r = parseJson(row.ratings);
            const info = parseJson(row.player_info);
            const yr = info.source_year || row.year || '----';
            const pos = row.pos || info.pos || (isGoaliePlayer ? 'G' : 'F');
            const jNo = info.jersey_num || info.jersey || '??';
            const wgtCalc = calculateWeight(info.weight);
            const ovr = Number(r.Ovr ?? r.OVERALL ?? r.overall ?? row.ovr ?? 0);
            const hand = getPlayerHandedness(row);
            const teamName = info.source_team || row.team_default || 'NHL 95';
            const combined = { ...info, ...r };

            // Normalized 0-6 values with alias resolution
            const agl = getScaleLevel(getRatingVal(combined, 'Agility', 'Agl', 'Agi', 'agl', 'AGL', 'AGI', 'agility'));
            const spd = getScaleLevel(getRatingVal(combined, 'Speed', 'Spd', 'spd', 'SPD', 'speed'));
            const ofA = getScaleLevel(getRatingVal(combined, 'Off Aware', 'ofA', 'OfA', 'off_aware', 'Off_Aware', 'offaware', 'OFA', 'offense'));
            const dfA = getScaleLevel(getRatingVal(combined, 'Def Aware', 'dfA', 'DfA', 'def_aware', 'Def_Aware', 'defaware', 'DFA', 'defense'));
            const chk = getScaleLevel(getRatingVal(combined, 'Checking', 'ChK', 'chk', 'CHK', 'check', 'checking'));
            const pas = getScaleLevel(getRatingVal(combined, 'Passing', 'Pas', 'pas', 'pass', 'PAS', 'passing'));
            const agr = getScaleLevel(getRatingVal(combined, 'Aggression', 'Agr', 'agr', 'AGR', 'roughness', 'rgh', 'aggression'));

            // Conditional goalie vs skater ratings
            const pkcOrShpw = isGoaliePlayer
              ? getScaleLevel(getRatingVal(combined, 'Puck Control', 'pkc', 'PkC', 'PKC', 'puck_control', 'control'))
              : getScaleLevel(getRatingVal(combined, 'Shot Power', 'shPW', 'ShPW', 'shP', 'ShP', 'shp', 'SHP', 'shot_power', 'power', 'pwr', 'sp'));

            const sthOrStr = isGoaliePlayer
              ? getScaleLevel(getRatingVal(combined, 'Stick Right', 'stR', 'StR', 'str', 'STR', 'stick_right', 'sr'))
              : getScaleLevel(getRatingVal(combined, 'Stick Handling', 'stH', 'StH', 'sth', 'STH', 'st_h', 'ST_H', 'stick_handling', 'Stick_Handling', 'stickhandling', 'handling', 'puck_control', 'Puck Control', 'puckcontrol', 'pkc', 'PkC', 'PKC', 'puck_handling', 'Puck Handling', 'stick', 'Stick', 'control', 'Control', 'sh', 'SH', 'st', 'ST'));

            const shaOrStl = isGoaliePlayer
              ? getScaleLevel(getRatingVal(combined, 'Stick Left', 'stL', 'StL', 'stl', 'STL', 'stick_left', 'sl'))
              : getScaleLevel(getRatingVal(combined, 'Shot Accuracy', 'shA', 'ShA', 'sha', 'SHA', 'shot_accuracy', 'accuracy', 'acc', 'sa'));

            const endOrGvr = isGoaliePlayer
              ? getScaleLevel(getRatingVal(combined, 'Glove Right', 'gvR', 'GvR', 'gvr', 'GVR', 'glove_right', 'gr'))
              : getScaleLevel(getRatingVal(combined, 'Endurance', 'end', 'End', 'END', 'endurance'));

            const rghOrGvl = isGoaliePlayer
              ? getScaleLevel(getRatingVal(combined, 'Glove Left', 'gvL', 'GvL', 'gvl', 'GVL', 'glove_left', 'gl'))
              : getScaleLevel(getRatingVal(combined, 'Roughness', 'rgh', 'Rgh', 'RGH', 'Aggression', 'agr', 'roughness'));

            const renderHeatCell = (val: number) => {
              const style = getHeatmapColor(val);
              return (
                <td
                  className="p-1 border-r border-black/30 font-bold"
                  style={{ backgroundColor: style.bg, color: style.text }}
                >
                  {val}
                </td>
              );
            };

            return (
              <tr
                key={idx}
                onClick={() => onSelectSeason && onSelectSeason(row)}
                className={`hover:brightness-95 ${onSelectSeason ? 'cursor-pointer' : ''}`}
                title={onSelectSeason ? 'Click to inspect this season' : undefined}
              >
                <td className="p-1 font-bold border-r border-black/30 bg-slate-100">{yr}</td>
                {showTeam && (
                  <td className="p-1 border-r border-black/30 font-bold bg-slate-50 text-left pl-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 flex items-center justify-center bg-white border border-black/30 rounded-xs p-0.5 shrink-0">
                        <TeamLogo teamName={teamName} year={yr} className="max-w-full max-h-full" />
                      </div>
                      <span className="truncate max-w-[85px] text-[8px]">{teamName}</span>
                    </div>
                  </td>
                )}
                <td className="p-1 font-bold border-r border-black/30">{pos}</td>
                <td className="p-1 border-r border-black/30">{jNo}</td>
                <td className="p-1 border-r border-black/30">{wgtCalc.lbs}</td>
                {renderHeatCell(agl)}
                {renderHeatCell(spd)}
                {renderHeatCell(ofA)}
                {renderHeatCell(dfA)}
                {renderHeatCell(pkcOrShpw)}
                {renderHeatCell(chk)}
                <td className="p-1 border-r border-black/30 font-bold">{hand}</td>
                {renderHeatCell(sthOrStr)}
                {renderHeatCell(shaOrStl)}
                {renderHeatCell(endOrGvr)}
                {renderHeatCell(rghOrGvl)}
                {renderHeatCell(pas)}
                {renderHeatCell(agr)}
                <td className="p-1 font-black bg-slate-900 text-white">{ovr || 'N/A'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Career Trend Comparison Chart (Single or Multi-Player)
const MultiPlayerCareerTrendChart = ({
  playerDatasets,
  leagueAverages = {},
}: {
  playerDatasets: Array<{ name: string; color: string; data: Array<{ year: number; ovr: number }> }>;
  leagueAverages?: Record<string, number>;
}) => {
  const minOvr = 30;
  const maxOvr = 110;
  const width = 640;
  const height = 220;

  // Extract all available years across all datasets
  const allYears = useMemo(() => {
    const yearsSet = new Set<number>();
    playerDatasets.forEach((p) => {
      p.data.forEach((d) => {
        if (d.year && !isNaN(d.year)) yearsSet.add(Number(d.year));
      });
    });
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [playerDatasets]);

  if (allYears.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center border-2 border-dashed border-black/40 bg-[#F5F2E6] text-[10px] font-mono font-bold text-neutral-600 uppercase">
        No Historical Career Trend Data Available
      </div>
    );
  }

  const getY = (ovr: number) => {
    const clamped = Math.max(minOvr, Math.min(maxOvr, ovr));
    return height - 35 - ((clamped - minOvr) / (maxOvr - minOvr)) * (height - 65);
  };

  const getX = (year: number) => {
    if (allYears.length === 1) return width / 2;
    const idx = allYears.indexOf(year);
    if (idx === -1) return 50;
    return 55 + (idx / (allYears.length - 1)) * (width - 85);
  };

  // League average points
  const avgPoints = allYears.map((yr) => ({
    x: getX(yr),
    y: getY(leagueAverages[String(yr)] || 74),
    year: yr,
  }));

  return (
    <div className="p-3 bg-[#F5F2E6] border-2 border-black rounded-lg font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1 border-b border-black/40">
        <p className="text-[11px] font-black uppercase tracking-tight flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
          Career OVR Progression
        </p>
        <div className="flex items-center gap-3 text-[9px] font-bold">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-black" />
            <span className="text-neutral-600">Lg Avg</span>
          </div>
          {playerDatasets.map((p) => (
            <div key={p.name} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="truncate max-w-[100px]">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      <svg width="100%" height="200" viewBox={`0 0 ${width} ${height}`} className="bg-white border border-black overflow-visible">
        {/* Y Axis Gridlines */}
        {[30, 50, 70, 90, 110].map((val, i) => (
          <g key={i}>
            <text x="45" y={getY(val) + 4} textAnchor="end" fontSize="10" fontWeight="bold" fill="#64748b">
              {val}
            </text>
            <line x1="50" y1={getY(val)} x2={width - 20} y2={getY(val)} stroke="#e2e8f0" strokeDasharray="3 3" />
          </g>
        ))}

        {/* League Average Line */}
        {avgPoints.length > 1 && (
          <polyline
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="4 4"
            points={avgPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          />
        )}

        {/* Player Lines */}
        {playerDatasets.map((pDataset) => {
          const sorted = [...pDataset.data].sort((a, b) => a.year - b.year);
          const points = sorted.map((pt) => ({
            x: getX(pt.year),
            y: getY(pt.ovr),
            ovr: pt.ovr,
            year: pt.year,
          }));

          if (points.length === 0) return null;

          return (
            <g key={pDataset.name}>
              {points.length > 1 ? (
                <polyline
                  fill="none"
                  stroke={pDataset.color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                />
              ) : null}
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="5" fill={pDataset.color} stroke="#000" strokeWidth="1.5" />
                  <text
                    x={p.x}
                    y={p.y - 8}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="900"
                    fill={pDataset.color}
                  >
                    {p.ovr}
                  </text>
                </g>
              ))}
            </g>
          );
        })}

        {/* X Axis Labels (Years) */}
        {allYears.map((yr, idx) => (
          <text key={idx} x={getX(yr)} y={height - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#000">
            {String(yr).slice(-2)}'
          </text>
        ))}
      </svg>
    </div>
  );
};

// =========================================================================
// 3. RETRO HOCKEY TRADING CARD COMPONENT (RIGHT SIDE SPOTLIGHT)
// =========================================================================

const HockeyCardSpotlight = ({
  player,
  careerData = [],
  leagueAverages = {},
  onAddToCompare,
  isCompared = false,
}: {
  player: any;
  careerData: any[];
  leagueAverages: Record<string, number>;
  onAddToCompare?: (p: any) => void;
  isCompared?: boolean;
}) => {
  const [activeCardTab, setActiveCardTab] = useState<'matrix' | 'career' | 'trend'>('matrix');

  if (!player || !player.player_name) {
    return (
      <div className="h-[480px] flex flex-col items-center justify-center border-4 border-dashed border-black bg-[#F5F2E6] text-black uppercase rounded-xl p-6 text-center font-mono shadow-[5px_5px_0px_rgba(0,0,0,1)]">
        <Star className="w-12 h-12 text-amber-500 mb-3 animate-pulse" />
        <span className="text-base font-black tracking-tight">Select A Player</span>
        <p className="text-[11px] text-neutral-600 mt-2 lowercase tracking-normal max-w-[240px]">
          Click any player in the table to inspect their official Sega NHL 95 trading card and full career attributes.
        </p>
      </div>
    );
  }

  const info = parseJson(player.player_info);
  const rObj = parseJson(player.ratings);
  const isG = isGoalie(player.pos || info.pos);
  const ratings = getCareerAverageRatingAttributes(careerData, player);
  const wgt = calculateWeight(info.weight);
  const hand = getPlayerHandedness(player);
  const jersey = info.jersey_num || info.jersey || '??';
  const ovr = Number(rObj.Ovr || rObj.OVERALL || rObj.overall || 75);

  // Career Average OVR
  const careerOvrs = careerData.map((c) => {
    const cr = parseJson(c.ratings);
    return Number(cr.Ovr || cr.OVERALL || cr.overall || c.ovr || 0);
  }).filter((n) => n > 0);

  const ovrAvg = careerOvrs.length > 0
    ? (careerOvrs.reduce((a, b) => a + b, 0) / careerOvrs.length).toFixed(1)
    : ovr.toFixed(1);

  const trendData = careerData.map((c) => {
    const ci = parseJson(c.player_info);
    const cr = parseJson(c.ratings);
    return {
      year: Number(ci.source_year || c.year || 0),
      ovr: Number(cr.Ovr || cr.OVERALL || cr.overall || c.ovr || 0),
    };
  }).filter((c) => c.year > 0 && c.ovr > 0);

  return (
    <div className="relative w-full bg-[#F5F2E6] text-black p-3 sm:p-4 border-[3px] border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-xl lg:sticky lg:top-4 font-mono">

      {/* 1. Header Banner */}
      <div className="flex items-center justify-between bg-black text-white px-2.5 py-1.5 rounded-t-md mb-2.5 border border-black">
        <div className="flex items-center gap-1.5">
          <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-xs tracking-wider uppercase">
            {player.pos || (isG ? 'G' : 'SKATER')}
          </span>
          <h2 className="text-base sm:text-lg font-black uppercase italic tracking-tighter truncate max-w-[180px] sm:max-w-[220px]">
            {player.player_name}
          </h2>
        </div>
        <div className="bg-gradient-to-r from-amber-400 to-yellow-400 text-black px-2.5 py-0.5 font-black text-base rounded shadow-xs">
          OVR {ovr}
        </div>
      </div>

      {/* 2. Player Bio & Quick Meta Grid (Clean layout without separate banner holder) */}
      <div className="grid grid-cols-12 gap-2 mb-3 bg-white p-2.5 border-2 border-black rounded">
        <div className="col-span-4 flex flex-col items-center justify-center">
          <PlayerPortrait name={player.player_name} url={`${SUPABASE_URL}/storage/v1/object/public/${PORTRAIT_BUCKET}`} />
          <span className="text-[8px] font-black uppercase tracking-wider text-emerald-800 mt-1">
            Jersey #{jersey}
          </span>
        </div>
        <div className="col-span-8 flex flex-col justify-between text-[9px] uppercase font-bold py-0.5">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-slate-50 p-1.5 border border-black/30 rounded">
            <div>
              <span className="text-neutral-500 block text-[7.5px]">Position</span>
              <span className="font-black text-slate-900">{player.pos || (isG ? 'G' : 'F')}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[7.5px]">Shoots/Catch</span>
              <span className="font-black text-slate-900">{hand}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[7.5px]">Weight</span>
              <span className="font-black text-slate-900">{wgt.lbs} lbs {wgt.indexText}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[7.5px]">Career Avg</span>
              <span className="font-black text-emerald-700">{ovrAvg} OVR</span>
            </div>
            <div className="col-span-2 pt-1 border-t border-neutral-200 flex items-center justify-between">
              <div>
                <span className="text-neutral-500 block text-[7.5px]">Team</span>
                <span className="font-black text-slate-900 truncate block text-[9.5px]">
                  {player.team_default || player.player_info?.source_team || 'NHL 95'}
                </span>
              </div>
              <div className="w-7 h-7 flex items-center justify-center p-0.5 bg-slate-50 border border-black/30 rounded shrink-0">
                <TeamLogo teamName={player.team_default || player.player_info?.source_team || 'NHL 95'} year={player.player_info?.source_year || player.year} className="max-w-full max-h-full" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            {onAddToCompare && (
              <button
                onClick={() => onAddToCompare(player)}
                className={`flex-1 py-1 px-2 text-[9px] font-black uppercase border-2 border-black flex items-center justify-center gap-1 transition-all ${isCompared
                    ? 'bg-amber-400 text-black shadow-xs'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
                  }`}
              >
                {isCompared ? (
                  <>
                    <Check className="w-3 h-3" /> In Compare
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" /> Add To Compare
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>


      {/* 4. Card Section Switcher */}
      <div className="flex items-center gap-1 mb-2 border-b-2 border-black pb-1.5 text-[9px] font-black uppercase">
        <button
          onClick={() => setActiveCardTab('matrix')}
          className={`flex-1 py-1 border border-black rounded-xs flex items-center justify-center gap-1 ${activeCardTab === 'matrix' ? 'bg-black text-white' : 'bg-white hover:bg-slate-100 text-black'
            }`}
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          Ratings Matrix
        </button>
        <button
          onClick={() => setActiveCardTab('career')}
          className={`flex-1 py-1 border border-black rounded-xs flex items-center justify-center gap-1 ${activeCardTab === 'career' ? 'bg-black text-white' : 'bg-white hover:bg-slate-100 text-black'
            }`}
        >
          <Table className="w-3 h-3" />
          Career Table
        </button>
        <button
          onClick={() => setActiveCardTab('trend')}
          className={`flex-1 py-1 border border-black rounded-xs flex items-center justify-center gap-1 ${activeCardTab === 'trend' ? 'bg-black text-white' : 'bg-white hover:bg-slate-100 text-black'
            }`}
        >
          <BarChart2 className="w-3 h-3" />
          OVR Chart
        </button>
      </div>

      {/* 5. Card Body Views */}
      {activeCardTab === 'matrix' && (
        <div className="space-y-2">
          <RatingMatrix
            ratings={ratings}
            title={careerData && careerData.length > 1 ? `Ratings (${careerData.length}-Yr Avg)` : 'Ratings'}
          />
          {/* Scale Legend Box */}
          <div className="bg-black/90 text-white p-2 rounded border border-black text-[8px]">
            <div className="flex justify-between items-center font-bold text-amber-300 border-b border-neutral-700 pb-1 mb-1">
              <span>Sega NHL 95 Scale (0 - 6)</span>
              <span>1 = 29-38 &bull; 6 = 99</span>
            </div>
            <div className="grid grid-cols-7 text-center font-mono gap-1 text-[7.5px] text-neutral-300">
              <div><b className="text-white">0:</b> 0-29</div>
              <div><b className="text-white">1:</b> 29-38</div>
              <div><b className="text-white">2:</b> 39-47</div>
              <div><b className="text-white">3:</b> 48-62</div>
              <div><b className="text-white">4:</b> 63-80</div>
              <div><b className="text-white">5:</b> 81-98</div>
              <div><b className="text-white">6:</b> 99</div>
            </div>
          </div>
        </div>
      )}

      {activeCardTab === 'career' && (
        <div>
          <CareerTable careerRows={careerData.length > 0 ? careerData : [player]} isGoaliePlayer={isG} />
        </div>
      )}

      {activeCardTab === 'trend' && (
        <div>
          <MultiPlayerCareerTrendChart
            playerDatasets={[
              {
                name: player.player_name,
                color: '#16a34a',
                data: trendData.length > 0 ? trendData : [{ year: Number(player.player_info?.source_year || 1995), ovr }],
              },
            ]}
            leagueAverages={leagueAverages}
          />
        </div>
      )}

    </div>
  );
};

// =========================================================================
// 4. SEARCHABLE COMBOPICKER & MULTI-PLAYER CAREER COMPARISON VIEW
// =========================================================================

// Searchable Autocomplete Picker for Compare Slots
const CompareSlotPicker = ({
  slotIdx,
  currentName,
  slotColor,
  allPlayersList,
  onSelectPlayer,
  onRemovePlayer,
}: {
  slotIdx: number;
  currentName: string;
  slotColor: string;
  allPlayersList: any[];
  onSelectPlayer: (name: string) => void;
  onRemovePlayer: (name: string) => void;
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Instant search across all loaded master players + query fallback
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim().toLowerCase();

    const map = new Map<string, any>();
    if (allPlayersList && allPlayersList.length > 0) {
      const matches = allPlayersList.filter((p) =>
        !trimmed || p.player_name?.toLowerCase().includes(trimmed)
      );
      matches.forEach((p) => {
        if (p.player_name && !map.has(p.player_name.toLowerCase())) {
          map.set(p.player_name.toLowerCase(), p);
        }
      });
      setSearchResults(Array.from(map.values()).slice(0, 80));
    } else {
      let cancelled = false;
      async function searchDB() {
        setSearching(true);
        try {
          let queryBuilder = supabase
            .from('league_player_database')
            .select('player_id, player_name, pos, team_default, ratings, player_info')
            .limit(60);

          if (trimmed) {
            queryBuilder = queryBuilder.ilike('player_name', `%${trimmed}%`);
          }

          const { data, error } = await queryBuilder;
          if (error) throw error;

          if (!cancelled && data) {
            data.forEach((p) => {
              if (p.player_name && !map.has(p.player_name.toLowerCase())) {
                map.set(p.player_name.toLowerCase(), p);
              }
            });
            setSearchResults(Array.from(map.values()));
          }
        } catch (e) {
          console.error(e);
        } finally {
          if (!cancelled) setSearching(false);
        }
      }
      searchDB();
      return () => { cancelled = true; };
    }
  }, [query, isOpen, allPlayersList]);

  return (
    <div
      ref={wrapperRef}
      className="bg-white border-2 border-black p-2.5 rounded relative flex flex-col justify-between shadow-xs"
      style={{ borderTopWidth: '4px', borderTopColor: slotColor }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-black uppercase" style={{ color: slotColor }}>
          Player Slot {slotIdx + 1}
        </span>
        {currentName && (
          <button
            onClick={() => {
              onRemovePlayer(currentName);
              setQuery('');
            }}
            className="text-neutral-400 hover:text-red-600 font-bold text-[9px] flex items-center gap-0.5"
            title="Remove player"
          >
            <X className="w-3.5 h-3.5" /> Remove
          </button>
        )}
      </div>

      {currentName ? (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-600/60 p-1.5 rounded text-[10px] font-black uppercase text-emerald-950">
          <span className="truncate">{currentName}</span>
          <button
            onClick={() => {
              setIsOpen(true);
              setQuery('');
            }}
            className="bg-black text-white hover:bg-neutral-800 text-[8px] font-mono px-2 py-0.5 rounded uppercase ml-2 shrink-0"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="SEARCH ALL PLAYERS IN DB..."
              value={query}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              className="w-full bg-[#F5F2E6] border border-black p-1.5 pl-6 text-[9.5px] uppercase font-bold text-black rounded-xs outline-hidden focus:ring-1 focus:ring-black"
            />
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-1.5 pointer-events-none" />
          </div>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-white border-2 border-black rounded shadow-lg divide-y divide-neutral-200">
              {searching && (
                <div className="p-2 text-center text-[9px] font-bold text-neutral-500 uppercase">
                  Searching database...
                </div>
              )}
              {!searching && searchResults.length === 0 && (
                <div className="p-3 text-center text-[9px] font-bold text-neutral-500 uppercase">
                  No players found
                </div>
              )}
              {searchResults.map((p) => {
                const ovr = p.ratings?.Ovr || p.ratings?.OVERALL || '';
                return (
                  <div
                    key={p.player_id || p.player_name}
                    onClick={() => {
                      onSelectPlayer(p.player_name);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="p-1.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-[9px] font-mono transition-colors"
                  >
                    <div className="truncate">
                      <span className="font-black text-black">{p.player_name}</span>
                      <span className="text-neutral-500 ml-1.5 text-[8px] uppercase">
                        {p.pos || 'F'} &bull; {p.team_default || 'NHL 95'}
                      </span>
                    </div>
                    {ovr && (
                      <span className="bg-black text-amber-300 px-1 py-0.2 rounded-2xs text-[8px] font-black shrink-0 ml-1">
                        {ovr}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CompareView = ({
  allPlayersList = [],
  comparedPlayerNames,
  onRemovePlayer,
  onAddPlayerName,
  onClearAll,
}: {
  allPlayersList?: any[];
  comparedPlayerNames: string[];
  onRemovePlayer: (name: string) => void;
  onAddPlayerName: (name: string, slotIdx: number) => void;
  onClearAll: () => void;
}) => {
  const [careerRecordsMap, setCareerRecordsMap] = useState<Record<string, any[]>>({});

  // Sync full career records for all currently compared players across all seasons in DB
  useEffect(() => {
    if (comparedPlayerNames.length === 0) return;
    const map: Record<string, any[]> = {};
    comparedPlayerNames.forEach((name) => {
      const local = allPlayersList.filter((p) => p.player_name?.toLowerCase() === name.toLowerCase());
      map[name] = local;
    });
    setCareerRecordsMap(map);
  }, [comparedPlayerNames, allPlayersList]);

  // Prepare datasets for multi-player trend chart
  const playerColors = ['#16a34a', '#2563eb', '#d97706'];
  const chartDatasets = useMemo(() => {
    return comparedPlayerNames.map((name, idx) => {
      const records = (careerRecordsMap[name] && careerRecordsMap[name].length > 0)
        ? careerRecordsMap[name]
        : allPlayersList.filter((p) => p.player_name?.toLowerCase() === name.toLowerCase());

      const trendData = records.map((c) => {
        const ci = parseJson(c.player_info);
        const cr = parseJson(c.ratings);
        return {
          year: Number(ci.source_year || c.year || 0),
          ovr: Number(cr.Ovr || cr.OVERALL || cr.overall || c.ovr || 0),
        };
      }).filter((c) => c.year > 0 && c.ovr > 0);

      return {
        name,
        color: playerColors[idx % playerColors.length],
        data: trendData,
      };
    });
  }, [comparedPlayerNames, careerRecordsMap, allPlayersList]);

  return (
    <div className="space-y-6 font-mono text-[10px]">

      {/* 1. Compare Controls / Searchable Slots Bar */}
      <div className="bg-[#F5F2E6] border-[3px] border-black p-3 sm:p-4 rounded-xl shadow-[5px_5px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b-2 border-black pb-2">
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-700" />
              Multi-Player Career Comparison (2 - 3 Players)
            </h2>
            <p className="text-[10px] text-neutral-600 mt-0.5 lowercase tracking-normal">
              Compare ratings matrices, career year-by-year trajectories, and head-to-head advantages side-by-side with full access to all players in the database.
            </p>
          </div>
          {comparedPlayerNames.length > 0 && (
            <button
              onClick={onClearAll}
              className="bg-black text-white hover:bg-red-700 px-3 py-1.5 uppercase font-bold text-[9px] rounded flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>

        {/* 3 Interactive Searchable Comparison Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((slotIdx) => {
            const currentName = comparedPlayerNames[slotIdx] || '';
            const slotColor = playerColors[slotIdx];

            return (
              <CompareSlotPicker
                key={slotIdx}
                slotIdx={slotIdx}
                currentName={currentName}
                slotColor={slotColor}
                allPlayersList={allPlayersList}
                onSelectPlayer={(name) => onAddPlayerName(name, slotIdx)}
                onRemovePlayer={(name) => onRemovePlayer(name)}
              />
            );
          })}
        </div>
      </div>

      {comparedPlayerNames.length === 0 ? (
        <div className="p-12 border-4 border-dashed border-black rounded-xl text-center bg-[#F5F2E6] shadow-[5px_5px_0px_rgba(0,0,0,1)]">
          <ArrowRightLeft className="w-12 h-12 mx-auto text-emerald-700 mb-3 animate-bounce" />
          <h3 className="text-lg font-black uppercase tracking-tight">No Players Selected For Comparison</h3>
          <p className="text-neutral-600 text-xs mt-2 max-w-md mx-auto lowercase tracking-normal">
            Type any player name in the search boxes above, or click "+ VS" on any player card in the Player Database to begin side-by-side career comparison.
          </p>
        </div>
      ) : (
        <>
          {/* 2. Side-by-Side Player Rating Matrix Cards (Top Row of Reference Image) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {comparedPlayerNames.map((name, idx) => {
              const records = (careerRecordsMap[name] && careerRecordsMap[name].length > 0)
                ? careerRecordsMap[name]
                : allPlayersList.filter((p) => p.player_name?.toLowerCase() === name.toLowerCase());

              const latest = records[records.length - 1] || records[0];
              const slotColor = playerColors[idx % playerColors.length];

              if (!latest) return null;

              const info = parseJson(latest.player_info);
              const rObj = parseJson(latest.ratings);
              const isG = isGoalie(latest.pos || info.pos);
              const ratings = getCareerAverageRatingAttributes(records, latest);
              const wgt = calculateWeight(info.weight);
              const hand = getPlayerHandedness(latest);
              const ovr = Number(rObj.Ovr || rObj.OVERALL || rObj.overall || latest.ovr || 75);

              const ovrList = records.map((r) => {
                const ro = parseJson(r.ratings);
                return Number(ro.Ovr || ro.OVERALL || ro.overall || r.ovr || 0);
              }).filter((n) => n > 0);

              const ovrAvg = ovrList.length > 0
                ? (ovrList.reduce((a, b) => a + b, 0) / ovrList.length).toFixed(2)
                : ovr.toFixed(2);

              return (
                <div
                  key={name}
                  className="bg-[#F5F2E6] border-[3px] border-black rounded-xl p-3 shadow-[5px_5px_0px_rgba(0,0,0,1)] flex flex-col justify-between"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between bg-black text-white p-1.5 rounded-t-md mb-2 border border-black">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[8px] font-black px-1 py-0.5 rounded-xs" style={{ backgroundColor: slotColor }}>
                        P{idx + 1}
                      </span>
                      <h3 className="font-black text-sm uppercase tracking-tight truncate">{name}</h3>
                    </div>
                    <span className="bg-amber-400 text-black px-1.5 py-0.5 text-xs font-black rounded">
                      {ovr}
                    </span>
                  </div>

                  {/* Rating Matrix & Meta */}
                  <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-7">
                      <RatingMatrix ratings={ratings} />
                    </div>
                    <div className="col-span-5 bg-white border-2 border-black p-2 rounded flex flex-col justify-between text-[8.5px] uppercase font-bold">
                      <div>
                        <span className="text-neutral-500 block text-[7px]">Position</span>
                        <span className="font-black text-slate-900">{latest.pos || (isG ? 'G' : 'F')}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[7px]">Shoots/Catch</span>
                        <span className="font-black text-slate-900">{hand}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[7px]">Weight</span>
                        <span className="font-black text-slate-900">{wgt.lbs} lbs {wgt.indexText}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[7px]">OvrAvg</span>
                        <span className="font-black text-emerald-700">{ovrAvg}</span>
                      </div>
                      <div className="pt-1 border-t border-neutral-300 flex items-center justify-between">
                        <div>
                          <span className="text-neutral-500 block text-[7px]">Current Team</span>
                          <span className="font-black truncate block text-slate-900 text-[8.5px]">
                            {latest.team_default || latest.player_info?.source_team || 'NHL 95'}
                          </span>
                        </div>
                        <div className="w-6 h-6 flex items-center justify-center p-0.5 bg-slate-50 border border-black/30 rounded shrink-0 ml-1">
                          <TeamLogo teamName={latest.team_default || latest.player_info?.source_team || 'NHL 95'} year={latest.player_info?.source_year || latest.year} className="max-w-full max-h-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* 3. Multi-Player Career Progression Overlay Chart */}
          <div className="bg-[#F5F2E6] border-[3px] border-black p-4 rounded-xl shadow-[5px_5px_0px_rgba(0,0,0,1)]">
            <MultiPlayerCareerTrendChart playerDatasets={chartDatasets} />
          </div>

          {/* 4. Side-by-Side Career Year-by-Year Breakdown Tables (Bottom Row of Reference Image) */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-1.5">
              <Table className="w-4 h-4 text-emerald-700" />
              Career Year-by-Year Ratings Breakdown
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {comparedPlayerNames.map((name, idx) => {
                const records = careerRecordsMap[name] || allPlayersList.filter((p) => p.player_name === name);
                const isG = records.some((r) => isGoalie(r.pos));
                const slotColor = playerColors[idx % playerColors.length];

                return (
                  <div key={name} className="bg-[#F5F2E6] border-[3px] border-black p-3 rounded-xl shadow-[5px_5px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center justify-between mb-2 font-black uppercase text-xs">
                      <span className="flex items-center gap-1.5" style={{ color: slotColor }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slotColor }} />
                        {name}
                      </span>
                      <span className="text-[9px] text-neutral-600 font-normal">
                        ({records.length} Recorded Seasons)
                      </span>
                    </div>
                    <CareerTable careerRows={records} isGoaliePlayer={isG} />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
};

// =========================================================================
// 5. MAIN PAGE COMPONENT
// =========================================================================

interface PlayerGroup {
  player_name: string;
  pos: string;
  primary_team: string;
  seasons: any[];
  start_year: number;
  end_year: number;
  best_ovr: number;
  avg_ovr: number;
  latest_record: any;
}

export default function PlayersPage() {
  const [activeTab, setActiveTab] = useState<'database' | 'compare'>('database');
  const [playerGroups, setPlayerGroups] = useState<PlayerGroup[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [selectedCareerData, setSelectedCareerData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [leagueAverages, setLeagueAverages] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<{ column: 'player_name' | 'pos' | 'team' | 'years' | 'ovr'; asc: boolean }>({ column: 'player_name', asc: true });
  const [totalGroupCount, setTotalGroupCount] = useState(0);
  const [allMasterPlayers, setAllMasterPlayers] = useState<any[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [showScaleGuide, setShowScaleGuide] = useState(false);
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());

  // Compare Tab State
  const [comparedPlayers, setComparedPlayers] = useState<string[]>([]);

  const LOGO_URL = "https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/images%20for%20site/NHL95.net_banner.png";

  // 1. Parallel Batch Ingestion of ALL Database Records (Pulling 100% of 9500+ rows)
  useEffect(() => {
    async function loadAllDatabaseRecords() {
      setLoading(true);
      try {
        // Query exact row count from Supabase
        const { count } = await supabase
          .from('league_player_database')
          .select('player_id', { count: 'exact', head: true });

        const totalCount = count && count > 0 ? count : 12000;
        const pageSize = 1000;
        const chunkRanges: { from: number; to: number }[] = [];

        // Build chunks up to totalCount + safety margin
        for (let from = 0; from < totalCount + pageSize; from += pageSize) {
          chunkRanges.push({ from, to: from + pageSize - 1 });
        }

        // Fetch all chunks in parallel without stopping early
        const responses = await Promise.all(
          chunkRanges.map((range) =>
            supabase
              .from('league_player_database')
              .select('player_id, player_name, pos, team_default, ratings, player_info')
              .range(range.from, range.to)
          )
        );

        let all: any[] = [];
        responses.forEach(({ data, error }) => {
          if (data && !error && data.length > 0) {
            all = all.concat(data);
          }
        });

        setAllMasterPlayers(all);
        setLoadedCount(all.length);

        // Calculate available teams, years, and league averages across all records
        const tSet = new Set<string>();
        const ySet = new Set<string>();
        const avgs: Record<string, { sum: number; count: number }> = {};

        all.forEach((p) => {
          if (p.team_default) tSet.add(p.team_default);
          const info = parseJson(p.player_info);
          const r = parseJson(p.ratings);
          const yr = info?.source_year || (p as any).year;
          const ovr = Number(r?.Ovr || r?.OVERALL || r?.overall || 0);

          if (yr) {
            ySet.add(String(yr));
            if (ovr > 0) {
              if (!avgs[yr]) avgs[yr] = { sum: 0, count: 0 };
              avgs[yr].sum += ovr;
              avgs[yr].count += 1;
            }
          }
        });

        setAvailableTeams(Array.from(tSet).sort());
        const sortedYears = Array.from(ySet).sort((a, b) => Number(b) - Number(a));
        setAvailableYears(sortedYears.length > 0 ? sortedYears : ['1995', '1994', '1993', '1992', '1991']);

        const finalAvgs: Record<string, number> = {};
        Object.keys(avgs).forEach((y) => (finalAvgs[y] = Math.round(avgs[y].sum / avgs[y].count)));
        setLeagueAverages(finalAvgs);
      } catch (err) {
        console.error('Error loading full database:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllDatabaseRecords();
  }, []);

  // 2. Instant Filtering & Career Grouping across ALL 9,500+ Players
  useEffect(() => {
    if (allMasterPlayers.length === 0) return;

    const s = search.trim().toLowerCase();

    const filtered = allMasterPlayers.filter((p) => {
      // 1. Name search
      if (s && !p.player_name?.toLowerCase().includes(s)) {
        return false;
      }

      // 2. Year filter
      if (year) {
        const info = parseJson(p.player_info);
        const pYear = String(info?.source_year || (p as any).year || '');
        if (pYear !== String(year)) return false;
      }

      // 3. Team filter
      if (teamFilter !== 'ALL') {
        const info = parseJson(p.player_info);
        const team = p.team_default || info?.source_team;
        if (team !== teamFilter) return false;
      }

      // 4. Position filter
      if (posFilter !== 'ALL') {
        const info = parseJson(p.player_info);
        const pos = String(p.pos || info?.pos || '').toUpperCase();
        if (posFilter === 'G' && !pos.includes('G')) return false;
        if (posFilter === 'D' && !pos.includes('D')) return false;
        if (posFilter === 'F') {
          if (pos.includes('D') || pos.includes('G')) return false;
        } else if (['C', 'LW', 'RW'].includes(posFilter)) {
          if (!pos.includes(posFilter)) return false;
        }
      }

      return true;
    });

    // Group filtered records by Player Name
    const map = new Map<string, any[]>();
    filtered.forEach((rec) => {
      const name = rec.player_name || 'Unknown Player';
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name)!.push(rec);
    });

    // Build PlayerGroup structures
    const groups: PlayerGroup[] = [];
    map.forEach((records, name) => {
      const sortedSeasons = [...records].sort((a, b) => {
        const infoA = parseJson(a.player_info);
        const infoB = parseJson(b.player_info);
        const yrA = Number(infoA?.source_year || a.year || 0);
        const yrB = Number(infoB?.source_year || b.year || 0);
        return yrA - yrB;
      });

      const latest = sortedSeasons[sortedSeasons.length - 1];
      const latestInfo = parseJson(latest?.player_info);
      const yearsList = sortedSeasons
        .map((s) => {
          const sInfo = parseJson(s.player_info);
          return Number(sInfo?.source_year || s.year || 0);
        })
        .filter((y) => y > 0);

      const ovrsList = sortedSeasons
        .map((s) => {
          const sRatings = parseJson(s.ratings);
          return Number(sRatings?.Ovr || sRatings?.OVERALL || sRatings?.overall || s.ovr || 0);
        })
        .filter((o) => o > 0);

      const bestOvr = ovrsList.length > 0 ? Math.max(...ovrsList) : 75;
      const avgOvr = ovrsList.length > 0
        ? Math.round((ovrsList.reduce((a, b) => a + b, 0) / ovrsList.length) * 10) / 10
        : bestOvr;

      groups.push({
        player_name: name,
        pos: latest?.pos || latestInfo?.pos || (sortedSeasons.some((s) => isGoalie(s.pos || parseJson(s.player_info)?.pos)) ? 'G' : 'F'),
        primary_team: latest?.team_default || latestInfo?.source_team || 'NHL 95',
        seasons: sortedSeasons,
        start_year: yearsList.length > 0 ? Math.min(...yearsList) : 1995,
        end_year: yearsList.length > 0 ? Math.max(...yearsList) : 1995,
        best_ovr: bestOvr,
        avg_ovr: avgOvr,
        latest_record: latest,
      });
    });

    // Sort player groups
    groups.sort((a, b) => {
      if (sort.column === 'player_name') {
        return sort.asc ? a.player_name.localeCompare(b.player_name) : b.player_name.localeCompare(a.player_name);
      }
      if (sort.column === 'pos') {
        return sort.asc ? a.pos.localeCompare(b.pos) : b.pos.localeCompare(a.pos);
      }
      if (sort.column === 'team') {
        return sort.asc ? a.primary_team.localeCompare(b.primary_team) : b.primary_team.localeCompare(a.primary_team);
      }
      if (sort.column === 'years') {
        const spanA = a.seasons.length;
        const spanB = b.seasons.length;
        return sort.asc ? spanA - spanB : spanB - spanA;
      }
      if (sort.column === 'ovr') {
        return sort.asc ? a.best_ovr - b.best_ovr : b.best_ovr - a.best_ovr;
      }
      return 0;
    });

    setTotalGroupCount(groups.length);
    const paginated = groups.slice(page * 30, page * 30 + 30);
    setPlayerGroups(paginated);

    if (paginated.length > 0) {
      setSelected((prev: any) => {
        if (prev && groups.some((g) => g.player_name.toLowerCase() === prev.player_name?.toLowerCase())) {
          return prev;
        }
        return paginated[0].latest_record;
      });
      setSelectedCareerData((prev: any[]) => {
        if (prev && prev.length > 0) return prev;
        return paginated[0].seasons;
      });
    } else {
      setSelected(null);
      setSelectedCareerData([]);
    }
  }, [allMasterPlayers, search, year, posFilter, teamFilter, sort, page]);

  // 3. Select Player Group & Fetch Complete Career
  const handleSelectGroup = async (group: PlayerGroup) => {
    setSelected(group.latest_record);
    setSelectedCareerData(group.seasons);

    try {
      const { data } = await supabase
        .from('league_player_database')
        .select('*')
        .ilike('player_name', group.player_name);

      if (data && data.length > 0) {
        const sorted = data.sort((a, b) => {
          const yrA = Number(a.player_info?.source_year || a.year || 0);
          const yrB = Number(b.player_info?.source_year || b.year || 0);
          return yrA - yrB;
        });
        setSelectedCareerData(sorted);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectSpecificSeason = (record: any, allSeasons: any[]) => {
    setSelected(record);
    setSelectedCareerData(allSeasons);
  };

  // Expand / Collapse group toggles
  const toggleExpand = (playerName: string) => {
    setExpandedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(playerName)) next.delete(playerName);
      else next.add(playerName);
      return next;
    });
  };

  const handleExpandAll = () => {
    const allNames = playerGroups.map((g) => g.player_name);
    setExpandedPlayers(new Set(allNames));
  };

  const handleCollapseAll = () => {
    setExpandedPlayers(new Set());
  };

  const handleSort = (col: 'player_name' | 'pos' | 'team' | 'years' | 'ovr') => {
    setSort((prev) => ({ column: col, asc: prev.column === col ? !prev.asc : true }));
  };

  // CSV Export for grouped view
  const downloadCSV = () => {
    const headers = ['Player,Pos,Team,SeasonsCount,CareerSpan,BestOvr,AvgOvr'];
    const rows = playerGroups.map(
      (g) =>
        `"${g.player_name}",${g.pos},"${g.primary_team}",${g.seasons.length},"${g.start_year}-${g.end_year}",${g.best_ovr},${g.avg_ovr}`
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nhl95_grouped_players.csv';
    a.click();
  };

  // Toggle Compare
  const toggleComparePlayer = (p: any) => {
    const name = typeof p === 'string' ? p : p?.player_name;
    if (!name) return;

    setComparedPlayers((prev) => {
      if (prev.includes(name)) {
        return prev.filter((item) => item !== name);
      }
      if (prev.length >= 3) {
        return [prev[1], prev[2], name];
      }
      return [...prev, name];
    });
  };

  const handleAddPlayerName = (name: string, slotIdx: number) => {
    setComparedPlayers((prev) => {
      const next = [...prev];
      if (slotIdx < next.length) {
        next[slotIdx] = name;
      } else {
        next.push(name);
      }
      return Array.from(new Set(next)).slice(0, 3);
    });
  };

  const handleRemoveComparePlayer = (name: string) => {
    setComparedPlayers((prev) => prev.filter((p) => p !== name));
  };

  return (
    <div className="p-2 sm:p-4 max-w-7xl mx-auto space-y-4 font-mono bg-[#E5E0D5] min-h-screen text-[10px]">

      {/* Top Header Banner with Official NHL95 Logo & Navigation Tabs */}
      <div className="bg-[#F5F2E6] border-[3px] border-black p-3 sm:p-4 rounded-xl shadow-[5px_5px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-4">

        {/* Left: NHL95 Official Logo + Title */}
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className="bg-black p-1.5 rounded-md border border-black shadow-xs shrink-0">
            <img
              src={LOGO_URL}
              alt="NHL 95 Logo"
              className="h-10 sm:h-12 md:h-14 object-contain block"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-slate-950 flex items-center gap-2">
              NHL 95 Player Database
            </h1>
            <p className="text-[10px] text-neutral-600 uppercase font-bold tracking-wider">
              Grouped Career Records & Interactive Spotlight Suite
            </p>
          </div>
        </div>

        {/* Right: View Switcher Tabs */}
        <div className="flex items-center gap-2 font-black uppercase text-xs w-full md:w-auto justify-end">
          <button
            onClick={() => setActiveTab('database')}
            className={`py-2 px-3 sm:px-4 rounded border-2 border-black flex items-center gap-1.5 transition-all ${activeTab === 'database'
                ? 'bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-white hover:bg-slate-100 text-black'
              }`}
          >
            <Table className="w-4 h-4 text-emerald-400" />
            Player Database
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`py-2 px-3 sm:px-4 rounded border-2 border-black flex items-center gap-1.5 transition-all ${activeTab === 'compare'
                ? 'bg-black text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-white hover:bg-slate-100 text-black'
              }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            Compare
            {comparedPlayers.length > 0 && (
              <span className="bg-amber-400 text-black font-black text-[9px] px-1.5 py-0.2 rounded-full ml-1">
                {comparedPlayers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowScaleGuide(!showScaleGuide)}
            className="p-2 border-2 border-black rounded bg-white hover:bg-slate-100"
            title="Rating Scale Guide"
          >
            <HelpCircle className="w-4 h-4 text-neutral-700" />
          </button>
        </div>
      </div>

      {/* Rating Scale Guide Dropdown Modal / Drawer */}
      {showScaleGuide && (
        <div className="bg-white border-2 border-black p-3 rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-2">
          <div className="flex items-center justify-between border-b border-black pb-1.5">
            <h3 className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5 text-emerald-800">
              <Sparkles className="w-3.5 h-3.5" />
              Sega Genesis NHL 95 Attribute Conversion Scale
            </h3>
            <button onClick={() => setShowScaleGuide(false)} className="text-neutral-500 hover:text-black">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-center text-[9px]">
            <div className="p-1.5 border border-black bg-slate-50 rounded">
              <span className="font-black block text-slate-900">Scale 0</span>
              <span className="text-neutral-600 block">Rating: 0 - 29</span>
              <span className="text-neutral-500 block text-[8px]">StH: 0</span>
            </div>
            <div className="p-1.5 border border-black bg-emerald-50 rounded">
              <span className="font-black block text-emerald-800">Scale 1</span>
              <span className="text-neutral-600 block">Rating: 29 - 38</span>
              <span className="text-neutral-500 block text-[8px]">StH: 1 - 2</span>
            </div>
            <div className="p-1.5 border border-black bg-emerald-100 rounded">
              <span className="font-black block text-emerald-800">Scale 2</span>
              <span className="text-neutral-600 block">Rating: 39 - 47</span>
              <span className="text-neutral-500 block text-[8px]">StH: 3 - 5</span>
            </div>
            <div className="p-1.5 border border-black bg-emerald-200 rounded">
              <span className="font-black block text-emerald-900">Scale 3</span>
              <span className="text-neutral-600 block">Rating: 48 - 62</span>
              <span className="text-neutral-500 block text-[8px]">StH: 6 - 8</span>
            </div>
            <div className="p-1.5 border border-black bg-emerald-300 rounded">
              <span className="font-black block text-emerald-950">Scale 4</span>
              <span className="text-neutral-700 block">Rating: 63 - 80</span>
              <span className="text-neutral-600 block text-[8px]">StH: 9 - 11</span>
            </div>
            <div className="p-1.5 border border-black bg-emerald-400 rounded">
              <span className="font-black block text-white">Scale 5</span>
              <span className="text-neutral-900 block font-bold">Rating: 81 - 98</span>
              <span className="text-neutral-800 block text-[8px]">StH: 12 - 14</span>
            </div>
            <div className="p-1.5 border border-black bg-emerald-600 text-white rounded">
              <span className="font-black block">Scale 6</span>
              <span className="block font-bold">Rating: 99</span>
              <span className="block text-[8px] opacity-90">StH: 15</span>
            </div>
          </div>
        </div>
      )}

      {/* Active Tab View */}
      {activeTab === 'database' ? (
        <div className="grid grid-cols-12 gap-4">

          {/* Left Column: Search, Filters & Grouped Players Table */}
          <div className="col-span-12 lg:col-span-7 space-y-2.5">

            {/* Filter Bar */}
            <div className="bg-[#F5F2E6] border-2 border-black p-2.5 rounded-lg shadow-xs space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                <div className="sm:col-span-6 relative">
                  <input
                    className="w-full bg-white border-2 border-black p-1.5 pl-7 text-[10px] uppercase text-black rounded-xs focus:ring-1 focus:ring-black outline-hidden"
                    placeholder="SEARCH PLAYER NAME..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                  />
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-2.5 pointer-events-none" />
                </div>

                <select
                  className="sm:col-span-3 bg-white border-2 border-black p-1.5 text-[10px] uppercase text-black rounded-xs"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">ALL YEARS</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <select
                  className="sm:col-span-3 bg-white border-2 border-black p-1.5 text-[10px] uppercase text-black rounded-xs"
                  value={posFilter}
                  onChange={(e) => {
                    setPosFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="ALL">ALL POSITIONS</option>
                  <option value="F">FORWARDS (F)</option>
                  <option value="D">DEFENSE (D)</option>
                  <option value="G">GOALIES (G)</option>
                  <option value="C">CENTERS (C)</option>
                  <option value="LW">LEFT WING (LW)</option>
                  <option value="RW">RIGHT WING (RW)</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-black/20 text-[9px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-neutral-600">Team:</span>
                  <select
                    className="bg-white border border-black p-1 text-[9px] uppercase text-black rounded-xs max-w-[140px]"
                    value={teamFilter}
                    onChange={(e) => {
                      setTeamFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="ALL">ALL TEAMS</option>
                    {availableTeams.map((tm) => (
                      <option key={tm} value={tm}>
                        {tm}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-600">
                    {totalGroupCount} Players Grouped {loadedCount > 0 ? `(${loadedCount.toLocaleString()} Total DB Records)` : ''}
                  </span>
                  <button
                    onClick={downloadCSV}
                    className="bg-black text-white hover:bg-emerald-700 px-2.5 py-1 uppercase font-black text-[9px] rounded-xs flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3" /> CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Pagination & Group Expand/Collapse Controls */}
            <div className="flex flex-wrap justify-between items-center text-xs text-black border-y-2 border-black py-1.5 bg-[#F5F2E6] px-2 rounded gap-2">
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="hover:text-emerald-700 font-black cursor-pointer disabled:opacity-30 flex items-center gap-0.5 text-[9px] uppercase"
                >
                  ◀ PREV
                </button>
                <span className="font-black text-[9.5px]">
                  PAGE {page + 1} OF {Math.max(1, Math.ceil(totalGroupCount / 30))}
                </span>
                <button
                  disabled={(page + 1) * 30 >= totalGroupCount}
                  onClick={() => setPage(page + 1)}
                  className="hover:text-emerald-700 font-black cursor-pointer disabled:opacity-30 flex items-center gap-0.5 text-[9px] uppercase"
                >
                  NEXT ▶
                </button>
              </div>

              {/* Expand / Collapse All */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExpandAll}
                  className="bg-white border border-black hover:bg-emerald-50 px-2 py-0.5 rounded text-[8px] font-black uppercase"
                >
                  Expand All Careers
                </button>
                <button
                  onClick={handleCollapseAll}
                  className="bg-white border border-black hover:bg-slate-100 px-2 py-0.5 rounded text-[8px] font-black uppercase"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* Grouped Players Table */}
            <div className="bg-[#F5F2E6] border-2 border-black rounded overflow-x-auto shadow-xs">
              <table className="w-full text-left text-[9px] uppercase text-black min-w-[440px]">
                <thead className="bg-black text-white text-[8.5px] font-black">
                  <tr>
                    <th className="p-1.5 w-8 text-center">CAREER</th>
                    <th className="p-1.5 cursor-pointer hover:bg-neutral-800" onClick={() => handleSort('player_name')}>
                      PLAYER {sort.column === 'player_name' ? (sort.asc ? '▲' : '▼') : '↕'}
                    </th>
                    <th className="p-1.5 cursor-pointer hover:bg-neutral-800" onClick={() => handleSort('pos')}>
                      POS {sort.column === 'pos' ? (sort.asc ? '▲' : '▼') : '↕'}
                    </th>
                    <th className="p-1.5 cursor-pointer hover:bg-neutral-800" onClick={() => handleSort('team')}>
                      TEAM {sort.column === 'team' ? (sort.asc ? '▲' : '▼') : '↕'}
                    </th>
                    <th className="p-1.5 cursor-pointer hover:bg-neutral-800" onClick={() => handleSort('years')}>
                      CAREER SPAN {sort.column === 'years' ? (sort.asc ? '▲' : '▼') : '↕'}
                    </th>
                    <th className="p-1.5 cursor-pointer hover:bg-neutral-800" onClick={() => handleSort('ovr')}>
                      OVR (PEAK / AVG) {sort.column === 'ovr' ? (sort.asc ? '▲' : '▼') : '↕'}
                    </th>
                    <th className="p-1.5 text-center">COMPARE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/30 bg-white font-mono">
                  {playerGroups.map((group) => {
                    const isSelected = selected && selected.player_name === group.player_name;
                    const isExpanded = expandedPlayers.has(group.player_name);
                    const isComp = comparedPlayers.includes(group.player_name);
                    const isG = isGoalie(group.pos);

                    return (
                      <React.Fragment key={group.player_name}>
                        {/* Main Group Header Row */}
                        <tr
                          onClick={() => handleSelectGroup(group)}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-amber-100 font-black' : 'hover:bg-slate-100'
                            }`}
                        >
                          {/* Expand/Collapse Button */}
                          <td className="p-1.5 text-center" onClick={(e) => { e.stopPropagation(); toggleExpand(group.player_name); }}>
                            <button
                              type="button"
                              className={`p-1 px-1.5 text-[8.5px] font-black rounded border border-black flex items-center justify-center transition-all ${isExpanded
                                  ? 'bg-emerald-700 text-white shadow-xs'
                                  : 'bg-white hover:bg-emerald-100 text-black'
                                }`}
                              title={isExpanded ? 'Collapse career breakdown' : 'Expand career breakdown'}
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          </td>

                          {/* Player Name */}
                          <td className="p-1.5 font-bold text-slate-900 truncate max-w-[140px]">
                            <div className="flex items-center gap-1.5">
                              <span>{group.player_name}</span>
                              <span className="text-[7.5px] bg-slate-200 px-1 py-0.2 rounded text-neutral-700 font-mono font-bold">
                                {group.seasons.length} yr{group.seasons.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          </td>

                          {/* Pos */}
                          <td className="p-1.5 font-bold text-emerald-800">{group.pos}</td>

                          {/* Primary Team */}
                          <td className="p-1.5 truncate max-w-[130px] text-neutral-700">
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                <TeamLogo teamName={group.primary_team} year={group.end_year} className="max-w-full max-h-full" />
                              </div>
                              <span className="truncate">{group.primary_team}</span>
                            </div>
                          </td>

                          {/* Career Span */}
                          <td className="p-1.5 font-mono text-neutral-800">
                            {group.start_year === group.end_year ? group.start_year : `${group.start_year} - ${group.end_year}`}
                          </td>

                          {/* Peak / Avg OVR */}
                          <td className="p-1.5 font-black text-slate-950">
                            <span className="bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded-2xs text-[9px] mr-1">
                              {group.best_ovr}
                            </span>
                            <span className="text-neutral-500 text-[8px] font-normal">
                              (Avg: {group.avg_ovr})
                            </span>
                          </td>

                          {/* Compare Button */}
                          <td className="p-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleComparePlayer(group.player_name)}
                              className={`p-1 px-1.5 text-[8px] font-black uppercase rounded border border-black ${isComp
                                  ? 'bg-amber-400 text-black shadow-xs'
                                  : 'bg-slate-100 hover:bg-emerald-600 hover:text-white'
                                }`}
                              title={isComp ? 'Remove from compare' : 'Add to compare'}
                            >
                              {isComp ? <Check className="w-2.5 h-2.5" /> : '+ VS'}
                            </button>
                          </td>
                        </tr>

                        {/* Collapsible Nested Career Table for this Player */}
                        {isExpanded && (
                          <tr className="bg-emerald-50/40 border-y-2 border-emerald-700/60">
                            <td colSpan={7} className="p-2 sm:p-3">
                              <div className="bg-white border-2 border-black rounded p-3 shadow-xs space-y-2.5">
                                {/* Team Logo & Career Meta Header */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-2.5">
                                  <div className="flex items-center gap-3.5">
                                    {/* Prominent Larger Team Logo Box */}
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white border-2 border-black rounded-lg p-2 flex items-center justify-center shrink-0 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                                      <TeamLogo teamName={group.primary_team} year={group.end_year} className="w-12 h-12 sm:w-16 sm:h-16" />
                                    </div>
                                    <div>
                                      <div className="text-[13px] sm:text-base font-black uppercase text-slate-950 flex items-center gap-2">
                                        <span>{group.player_name}</span>
                                        <span className="text-emerald-700 font-bold">&bull; {group.primary_team}</span>
                                      </div>
                                      <div className="text-[9.5px] text-neutral-700 uppercase font-bold mt-1">
                                        {group.seasons.length} Recorded Seasons ({group.start_year} - {group.end_year}) &bull; Peak OVR: <span className="text-black font-black bg-amber-300 px-1.5 py-0.5 rounded-2xs">{group.best_ovr}</span> &bull; Career Avg: <span className="text-emerald-800 font-black">{group.avg_ovr}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[8px] text-neutral-700 uppercase font-black bg-[#F5F2E6] px-2.5 py-1 rounded border border-black/30 shadow-2xs">
                                    Click any row to load season card
                                  </span>
                                </div>

                                <CareerTable
                                  careerRows={group.seasons}
                                  isGoaliePlayer={isG}
                                  showTeam={true}
                                  onSelectSeason={(row) => handleSelectSpecificSeason(row, group.seasons)}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-neutral-700 font-black uppercase text-xs animate-pulse">
                        <span className="inline-block animate-bounce mr-2">🏒</span>
                        Searching NHL95 Database...
                      </td>
                    </tr>
                  ) : playerGroups.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-neutral-500 font-bold uppercase">
                        No players found matching current filters
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

          </div>

          {/* Right Column: Retro Hockey Card Spotlight */}
          <div className="col-span-12 lg:col-span-5">
            <HockeyCardSpotlight
              player={selected}
              careerData={selectedCareerData}
              leagueAverages={leagueAverages}
              onAddToCompare={toggleComparePlayer}
              isCompared={selected && comparedPlayers.includes(selected.player_name)}
            />
          </div>

        </div>
      ) : (
        /* Compare Players Tab View */
        <CompareView
          allPlayersList={allMasterPlayers}
          comparedPlayerNames={comparedPlayers}
          onRemovePlayer={handleRemoveComparePlayer}
          onAddPlayerName={handleAddPlayerName}
          onClearAll={() => setComparedPlayers([])}
        />
      )}

    </div>
  );
}