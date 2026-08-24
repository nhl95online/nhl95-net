"use client";

import React, { useState, useEffect, useMemo } from 'react';
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

// Extract standardized ratings object
export const getPlayerRatingAttributes = (player: any) => {
  const r = player?.ratings || {};
  const isG = isGoalie(player?.pos);

  if (isG) {
    return [
      { key: 'Agility', label: 'Agility', value: getScaleLevel(r.Agility ?? r.agl ?? r.Agl ?? 0) },
      { key: 'Speed', label: 'Speed', value: getScaleLevel(r.Speed ?? r.spd ?? r.Spd ?? 0) },
      { key: 'Off Aware', label: 'Off Aware', value: getScaleLevel(r['Off Aware'] ?? r.ofA ?? r.OfA ?? r.off_aware ?? 0) },
      { key: 'Def Aware', label: 'Def Aware', value: getScaleLevel(r['Def Aware'] ?? r.dfA ?? r.DfA ?? r.def_aware ?? 0) },
      { key: 'Puck Control', label: 'Puck Control', value: getScaleLevel(r['Puck Control'] ?? r.pkc ?? r.PkC ?? r.puck_control ?? 0) },
      { key: 'Stick Right', label: 'Stick Right', value: getScaleLevel(r['Stick Right'] ?? r.stR ?? r.StR ?? r.stick_right ?? 0) },
      { key: 'Stick Left', label: 'Stick Left', value: getScaleLevel(r['Stick Left'] ?? r.stL ?? r.StL ?? r.stick_left ?? 0) },
      { key: 'Glove Right', label: 'Glove Right', value: getScaleLevel(r['Glove Right'] ?? r.gvR ?? r.GvR ?? r.glove_right ?? 0) },
      { key: 'Glove Left', label: 'Glove Left', value: getScaleLevel(r['Glove Left'] ?? r.gvL ?? r.GvL ?? r.glove_left ?? 0) },
    ];
  }

  return [
    { key: 'Agility', label: 'Agility', value: getScaleLevel(r.Agility ?? r.agl ?? r.Agl ?? 0) },
    { key: 'Speed', label: 'Speed', value: getScaleLevel(r.Speed ?? r.spd ?? r.Spd ?? 0) },
    { key: 'Off Aware', label: 'Off Aware', value: getScaleLevel(r['Off Aware'] ?? r.ofA ?? r.OfA ?? r.off_aware ?? 0) },
    { key: 'Def Aware', label: 'Def Aware', value: getScaleLevel(r['Def Aware'] ?? r.dfA ?? r.DfA ?? r.def_aware ?? 0) },
    { key: 'Shot Power', label: 'Shot Power', value: getScaleLevel(r['Shot Power'] ?? r.shPW ?? r.ShPW ?? r.power ?? r.pwr ?? 0) },
    { key: 'Shot Accuracy', label: 'Shot Accuracy', value: getScaleLevel(r['Shot Accuracy'] ?? r.shA ?? r.ShA ?? r.acc ?? 0) },
    { key: 'Stick Handling', label: 'Stick Handling', value: getScaleLevel(r['Stick Handling'] ?? r.stH ?? r.StH ?? r['Puck Control'] ?? r.pkc ?? 0) },
    { key: 'Passing', label: 'Passing', value: getScaleLevel(r.Passing ?? r.pas ?? r.Pas ?? r.pass ?? 0) },
    { key: 'Checking', label: 'Checking', value: getScaleLevel(r.Checking ?? r.chK ?? r.ChK ?? r.chk ?? 0) },
    { key: 'Aggression', label: 'Aggression', value: getScaleLevel(r.Aggression ?? r.agr ?? r.Agr ?? r.Roughness ?? r.rgh ?? 0) },
  ];
};

// =========================================================================
// 2. SUBCOMPONENTS
// =========================================================================

// Visual Rating Matrix (1-6 scale with shaded boxes)
const RatingMatrix = ({ ratings, showHeader = true }: { ratings: Array<{ key: string; label: string; value: number }>; showHeader?: boolean }) => {
  return (
    <div className="border-2 border-black bg-white overflow-hidden text-[9px] font-mono">
      {showHeader && (
        <div className="grid grid-cols-12 bg-black text-white font-black py-1 px-1.5 border-b border-black text-center">
          <span className="col-span-5 text-left uppercase tracking-wider pl-1">Ratings</span>
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

// Career Year-by-Year Breakdown Table (with Green Heat-Map cells)
const CareerTable = ({ careerRows, isGoaliePlayer }: { careerRows: any[]; isGoaliePlayer: boolean }) => {
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
      <table className="w-full text-center text-[8.5px] font-mono border-collapse uppercase min-w-[580px]">
        <thead>
          <tr className="bg-black text-white text-[8px] font-black border-b border-black">
            <th className="p-1 border-r border-neutral-700">Year</th>
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
            const r = row.ratings || {};
            const info = row.player_info || {};
            const yr = info.source_year || row.year || '----';
            const pos = row.pos || info.pos || (isGoaliePlayer ? 'G' : 'F');
            const jNo = info.jersey_num || info.jersey || '??';
            const wgtCalc = calculateWeight(info.weight);
            const ovr = Number(r.Ovr ?? r.OVERALL ?? r.overall ?? row.ovr ?? 0);
            const hand = info.hand || info.shoots || (isGoaliePlayer ? 'R' : 'L');

            // Normalized 0-6 values
            const agl = getScaleLevel(r.Agility ?? r.agl);
            const spd = getScaleLevel(r.Speed ?? r.spd);
            const ofA = getScaleLevel(r['Off Aware'] ?? r.ofA);
            const dfA = getScaleLevel(r['Def Aware'] ?? r.dfA);
            const chk = getScaleLevel(r.Checking ?? r.chK);
            const pas = getScaleLevel(r.Passing ?? r.pas);
            const agr = getScaleLevel(r.Aggression ?? r.agr);

            // Conditional goalie vs skater ratings
            const pkcOrShpw = isGoaliePlayer
              ? getScaleLevel(r['Puck Control'] ?? r.pkc)
              : getScaleLevel(r['Shot Power'] ?? r.shPW);

            const sthOrStr = isGoaliePlayer
              ? getScaleLevel(r['Stick Right'] ?? r.stR)
              : getScaleLevel(r['Stick Handling'] ?? r.stH);

            const shaOrStl = isGoaliePlayer
              ? getScaleLevel(r['Stick Left'] ?? r.stL)
              : getScaleLevel(r['Shot Accuracy'] ?? r.shA);

            const endOrGvr = isGoaliePlayer
              ? getScaleLevel(r['Glove Right'] ?? r.gvR)
              : getScaleLevel(r.Endurance ?? r.end);

            const rghOrGvl = isGoaliePlayer
              ? getScaleLevel(r['Glove Left'] ?? r.gvL)
              : getScaleLevel(r.Roughness ?? r.rgh);

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
              <tr key={idx} className="hover:brightness-95">
                <td className="p-1 font-bold border-r border-black/30 bg-slate-100">{yr}</td>
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

  if (!player) {
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

  const isG = isGoalie(player.pos);
  const ratings = getPlayerRatingAttributes(player);
  const wgt = calculateWeight(player.player_info?.weight);
  const hand = player.player_info?.hand || player.player_info?.shoots || (isG ? 'R' : 'L');
  const jersey = player.player_info?.jersey_num || player.player_info?.jersey || '??';
  const ovr = Number(player.ratings?.Ovr || player.ratings?.OVERALL || 75);

  // Career Average OVR
  const careerOvrs = careerData.map((c) => Number(c.ratings?.Ovr || c.ovr || 0)).filter((n) => n > 0);
  const ovrAvg = careerOvrs.length > 0
    ? (careerOvrs.reduce((a, b) => a + b, 0) / careerOvrs.length).toFixed(1)
    : ovr.toFixed(1);

  const teamBannerSlug = (player.player_info?.source_team || player.team_default || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');

  const trendData = careerData.map((c) => ({
    year: Number(c.player_info?.source_year || c.year || 0),
    ovr: Number(c.ratings?.Ovr || c.ovr || 0),
  })).filter((c) => c.year > 0 && c.ovr > 0);

  return (
    <div className="relative w-full bg-[#F5F2E6] text-black p-3 sm:p-4 border-[3px] border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-xl lg:sticky lg:top-4 font-mono">

      {/* 1. Header Banner */}
      <div className="flex items-center justify-between bg-black text-white px-2.5 py-1.5 rounded-t-md mb-2 border border-black">
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

      {/* 2. Team Banner Strip */}
      <div className="bg-slate-200 border-2 border-black h-16 sm:h-20 mb-3 overflow-hidden rounded relative">
        <img
          src={`${SUPABASE_URL}/storage/v1/object/public/${BANNER_BUCKET}/${teamBannerSlug}.png`}
          alt={player.team_default || 'Team'}
          className="w-full h-full object-cover block"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute bottom-1 right-2 bg-black/80 text-white font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded shadow">
          {player.team_default || player.player_info?.source_team || 'NHL 95'}
        </div>
      </div>

      {/* 3. Player Bio & Quick Meta Grid */}
      <div className="grid grid-cols-12 gap-2 mb-3 bg-white p-2 border-2 border-black rounded">
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
          <RatingMatrix ratings={ratings} />
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
// 4. MULTI-PLAYER CAREER COMPARISON VIEW (2 - 3 PLAYERS)
// =========================================================================

const CompareView = ({
  allPlayersList,
  comparedPlayerNames,
  onRemovePlayer,
  onAddPlayerName,
  onClearAll,
}: {
  allPlayersList: any[];
  comparedPlayerNames: string[];
  onRemovePlayer: (name: string) => void;
  onAddPlayerName: (name: string, slotIdx: number) => void;
  onClearAll: () => void;
}) => {
  const [careerRecordsMap, setCareerRecordsMap] = useState<Record<string, any[]>>({});

  // Fetch full career records for all currently compared players
  useEffect(() => {
    async function fetchCompareHistories() {
      if (comparedPlayerNames.length === 0) return;
      try {
        const { data } = await supabase
          .from('league_player_database')
          .select('*')
          .in('player_name', comparedPlayerNames);

        if (data) {
          const map: Record<string, any[]> = {};
          comparedPlayerNames.forEach((name) => {
            map[name] = data.filter((p) => p.player_name?.toLowerCase() === name.toLowerCase());
          });
          setCareerRecordsMap(map);
        }
      } catch (err) {
        console.error('Error loading compare histories:', err);
      }
    }
    fetchCompareHistories();
  }, [comparedPlayerNames]);

  // Unique list of player names for selector dropdowns
  const playerNamesOptions = useMemo(() => {
    const names = Array.from(new Set(allPlayersList.map((p) => p.player_name).filter(Boolean))).sort();
    return names;
  }, [allPlayersList]);

  // Prepare datasets for multi-player trend chart
  const playerColors = ['#16a34a', '#2563eb', '#d97706'];
  const chartDatasets = useMemo(() => {
    return comparedPlayerNames.map((name, idx) => {
      const records = careerRecordsMap[name] || allPlayersList.filter((p) => p.player_name === name);
      const trendData = records.map((c) => ({
        year: Number(c.player_info?.source_year || c.year || 0),
        ovr: Number(c.ratings?.Ovr || c.ovr || 0),
      })).filter((c) => c.year > 0 && c.ovr > 0);

      return {
        name,
        color: playerColors[idx % playerColors.length],
        data: trendData,
      };
    });
  }, [comparedPlayerNames, careerRecordsMap, allPlayersList]);

  return (
    <div className="space-y-6 font-mono text-[10px]">

      {/* 1. Compare Controls / Slots Bar */}
      <div className="bg-[#F5F2E6] border-[3px] border-black p-3 sm:p-4 rounded-xl shadow-[5px_5px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b-2 border-black pb-2">
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-700" />
              Multi-Player Career Comparison (2 - 3 Players)
            </h2>
            <p className="text-[10px] text-neutral-600 mt-0.5 lowercase tracking-normal">
              Compare ratings matrices, career year-by-year trajectories, and head-to-head advantages side-by-side.
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

        {/* 3 Comparison Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((slotIdx) => {
            const currentName = comparedPlayerNames[slotIdx] || '';
            const slotColor = playerColors[slotIdx];

            return (
              <div
                key={slotIdx}
                className="bg-white border-2 border-black p-2.5 rounded relative flex flex-col justify-between shadow-xs"
                style={{ borderTopWidth: '4px', borderTopColor: slotColor }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black uppercase" style={{ color: slotColor }}>
                    Player Slot {slotIdx + 1}
                  </span>
                  {currentName && (
                    <button
                      onClick={() => onRemovePlayer(currentName)}
                      className="text-neutral-400 hover:text-red-600"
                      title="Remove player"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={currentName}
                  onChange={(e) => {
                    if (e.target.value) {
                      onAddPlayerName(e.target.value, slotIdx);
                    } else if (currentName) {
                      onRemovePlayer(currentName);
                    }
                  }}
                  className="bg-[#F5F2E6] border border-black p-1.5 text-[10px] uppercase font-bold text-black w-full rounded-xs"
                >
                  <option value="">-- SELECT PLAYER --</option>
                  {playerNamesOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {comparedPlayerNames.length === 0 ? (
        <div className="p-12 border-4 border-dashed border-black rounded-xl text-center bg-[#F5F2E6] shadow-[5px_5px_0px_rgba(0,0,0,1)]">
          <ArrowRightLeft className="w-12 h-12 mx-auto text-emerald-700 mb-3 animate-bounce" />
          <h3 className="text-lg font-black uppercase tracking-tight">No Players Selected For Comparison</h3>
          <p className="text-neutral-600 text-xs mt-2 max-w-md mx-auto lowercase tracking-normal">
            Choose 2 or 3 players from the selectors above, or click "+ VS" on any player card in the Player Database to begin side-by-side career comparison.
          </p>
        </div>
      ) : (
        <>
          {/* 2. Side-by-Side Player Rating Matrix Cards (Top Row of Reference Image) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {comparedPlayerNames.map((name, idx) => {
              const records = careerRecordsMap[name] || allPlayersList.filter((p) => p.player_name === name);
              const latest = records[records.length - 1] || records[0];
              const slotColor = playerColors[idx % playerColors.length];

              if (!latest) return null;

              const isG = isGoalie(latest.pos);
              const ratings = getPlayerRatingAttributes(latest);
              const wgt = calculateWeight(latest.player_info?.weight);
              const hand = latest.player_info?.hand || latest.player_info?.shoots || (isG ? 'R' : 'L');
              const ovr = Number(latest.ratings?.Ovr || 75);

              const ovrList = records.map((r) => Number(r.ratings?.Ovr || 0)).filter((n) => n > 0);
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
                      <div className="pt-1 border-t border-neutral-300">
                        <span className="text-neutral-500 block text-[7px]">Current Team</span>
                        <span className="font-black truncate block text-slate-900">
                          {latest.team_default || latest.player_info?.source_team || 'NHL 95'}
                        </span>
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

export default function PlayersPage() {
  const [activeTab, setActiveTab] = useState<'database' | 'compare'>('database');
  const [players, setPlayers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [selectedCareerData, setSelectedCareerData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [leagueAverages, setLeagueAverages] = useState<Record<string, number>>({});
  const [sort, setSort] = useState({ column: 'player_name', asc: true });
  const [totalCount, setTotalCount] = useState(0);
  const [allMasterPlayers, setAllMasterPlayers] = useState<any[]>([]);
  const [showScaleGuide, setShowScaleGuide] = useState(false);

  // Compare Tab State
  const [comparedPlayers, setComparedPlayers] = useState<string[]>([]);

  const years = Array.from({ length: 2026 - 1909 + 1 }, (_, i) => 1909 + i);

  // 1. Initial Load & Master List Fetch
  useEffect(() => {
    async function loadMasterList() {
      try {
        const { data } = await supabase
          .from('league_player_database')
          .select('player_id, player_name, pos, team_default, ratings, player_info');

        if (data) {
          setAllMasterPlayers(data);
          // Calculate league averages
          const avgs: Record<string, { sum: number; count: number }> = {};
          data.forEach((p) => {
            const yr = p.player_info?.source_year;
            const ovr = Number(p.ratings?.Ovr || 0);
            if (yr && ovr > 0) {
              if (!avgs[yr]) avgs[yr] = { sum: 0, count: 0 };
              avgs[yr].sum += ovr;
              avgs[yr].count += 1;
            }
          });
          const finalAvgs: Record<string, number> = {};
          Object.keys(avgs).forEach((y) => (finalAvgs[y] = Math.round(avgs[y].sum / avgs[y].count)));
          setLeagueAverages(finalAvgs);
        }
      } catch (err) {
        console.error('Error fetching master players:', err);
      }
    }
    loadMasterList();
  }, []);

  // 2. Fetch Filtered Players for Table
  useEffect(() => {
    fetchPlayers();
  }, [page, sort, year, posFilter, teamFilter]);

  const fetchPlayers = async (s = search, y = year, pos = posFilter, team = teamFilter, pg = page) => {
    let query = supabase.from('league_player_database').select('*');
    if (s) query = query.ilike('player_name', `%${s}%`);
    if (y) query = query.eq('player_info->>source_year', y);
    if (pos !== 'ALL') {
      if (pos === 'G') query = query.ilike('pos', '%G%');
      else if (pos === 'D') query = query.or('pos.ilike.%D%,pos.ilike.%LD%,pos.ilike.%RD%');
      else if (pos === 'F') query = query.or('pos.ilike.%F%,pos.ilike.%C%,pos.ilike.%LW%,pos.ilike.%RW%');
      else query = query.eq('pos', pos);
    }
    if (team !== 'ALL') {
      query = query.eq('team_default', team);
    }

    const { data } = await query;
    let processedData = [...(data || [])];

    processedData.sort((a, b) => {
      let valA =
        sort.column === 'Ovr'
          ? Number(a.ratings?.Ovr || 0)
          : sort.column === 'Year'
            ? Number(a.player_info?.source_year || 0)
            : String(a[sort.column] || '');
      let valB =
        sort.column === 'Ovr'
          ? Number(b.ratings?.Ovr || 0)
          : sort.column === 'Year'
            ? Number(b.player_info?.source_year || 0)
            : String(b[sort.column] || '');
      return sort.asc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    setTotalCount(processedData.length);
    setPlayers(processedData.slice(pg * 50, pg * 50 + 50));

    // If no player is selected, auto-select first
    if (!selected && processedData.length > 0) {
      handleSelectPlayer(processedData[0]);
    }
  };

  // 3. Fetch Full Career History on Player Select
  const handleSelectPlayer = async (playerItem: any) => {
    setSelected(playerItem);
    if (!playerItem?.player_name) return;

    try {
      const { data } = await supabase
        .from('league_player_database')
        .select('*')
        .ilike('player_name', playerItem.player_name);

      if (data && data.length > 0) {
        setSelectedCareerData(data);
      } else {
        setSelectedCareerData([playerItem]);
      }
    } catch (err) {
      console.error('Error fetching player career:', err);
      setSelectedCareerData([playerItem]);
    }
  };

  const handleSort = (col: string) => {
    setSort((prev) => ({ column: col, asc: prev.column === col ? !prev.asc : true }));
  };

  // CSV Export
  const downloadCSV = () => {
    const headers = ['Player,Pos,Team,Year,Ovr,Agility,Speed,OffAware,DefAware'];
    const rows = players.map(
      (p) =>
        `"${p.player_name}",${p.pos},"${p.team_default}",${p.player_info?.source_year || ''},${p.ratings?.Ovr || ''},${p.ratings?.Agility || ''},${p.ratings?.Speed || ''},${p.ratings?.['Off Aware'] || ''},${p.ratings?.['Def Aware'] || ''}`
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nhl95_player_database.csv';
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

  // Unique Teams List for Filter
  const availableTeams = useMemo(() => {
    const tSet = new Set<string>();
    allMasterPlayers.forEach((p) => {
      if (p.team_default) tSet.add(p.team_default);
    });
    return Array.from(tSet).sort();
  }, [allMasterPlayers]);

  return (
    <div className="p-2 sm:p-4 max-w-7xl mx-auto space-y-4 font-mono bg-[#E5E0D5] min-h-screen text-[10px]">

      {/* Top Header & Navigation Tabs */}
      <div className="bg-[#F5F2E6] border-[3px] border-black p-3 rounded-xl shadow-[5px_5px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-black text-white p-2 rounded border border-black shadow-xs">
            <Layers className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 flex items-center gap-2">
              NHL 95 Player Database
            </h1>
            <p className="text-[10px] text-neutral-600 uppercase font-bold tracking-wider">
              Official Historical Player Ratings & Career Spotlight Suite
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 font-black uppercase text-xs">
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

          {/* Left Column: Search, Filters & Players Table */}
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
                      fetchPlayers(e.target.value, year, posFilter, teamFilter, 0);
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
                  {years.map((y) => (
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
                    {totalCount} Players Found
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

            {/* Pagination Controls */}
            <div className="flex justify-between items-center text-xs text-black border-y-2 border-black py-1.5 bg-[#F5F2E6] px-2 rounded">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="hover:text-emerald-700 font-black cursor-pointer disabled:opacity-30 flex items-center gap-1"
              >
                ◀ PREV
              </button>
              <span className="font-black text-[10px]">
                PAGE {page + 1} OF {Math.max(1, Math.ceil(totalCount / 50))}
              </span>
              <button
                disabled={(page + 1) * 50 >= totalCount}
                onClick={() => setPage(page + 1)}
                className="hover:text-emerald-700 font-black cursor-pointer disabled:opacity-30 flex items-center gap-1"
              >
                NEXT ▶
              </button>
            </div>

            {/* Table */}
            <div className="bg-[#F5F2E6] border-2 border-black rounded overflow-x-auto shadow-xs">
              <table className="w-full text-left text-[9px] uppercase text-black min-w-[360px]">
                <thead className="bg-black text-white text-[8.5px] font-black">
                  <tr>
                    <th className="p-1.5 cursor-pointer hover:bg-neutral-800" onClick={() => handleSort('player_name')}>
                      PLAYER {sort.column === 'player_name' ? (sort.asc ? '▲' : '▼') : '↕'}
                    </th>
                    <th className="p-1.5">POS</th>
                    <th className="p-1.5">TEAM</th>
                    <th className="p-1.5 cursor-pointer hover:bg-neutral-800" onClick={() => handleSort('Year')}>
                      YEAR {sort.column === 'Year' ? (sort.asc ? '▲' : '▼') : '↕'}
                    </th>
                    <th className="p-1.5 cursor-pointer hover:bg-neutral-800" onClick={() => handleSort('Ovr')}>
                      OVR {sort.column === 'Ovr' ? (sort.asc ? '▲' : '▼') : '↕'}
                    </th>
                    <th className="p-1.5 text-center">COMPARE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/30 bg-white font-mono">
                  {players.map((p) => {
                    const isSelected = selected && selected.player_id === p.player_id;
                    const isComp = comparedPlayers.includes(p.player_name);
                    const ovrVal = p.ratings?.Ovr || p.ratings?.OVERALL || 'N/A';

                    return (
                      <tr
                        key={p.player_id || `${p.player_name}_${p.player_info?.source_year}`}
                        onClick={() => handleSelectPlayer(p)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-amber-100 font-black' : 'hover:bg-slate-100'
                          }`}
                      >
                        <td className="p-1.5 font-bold text-slate-900 truncate max-w-[140px]">
                          {p.player_name}
                        </td>
                        <td className="p-1.5 font-bold text-emerald-800">{p.pos || 'F'}</td>
                        <td className="p-1.5 truncate max-w-[100px] text-neutral-700">{p.team_default}</td>
                        <td className="p-1.5">{p.player_info?.source_year || '----'}</td>
                        <td className="p-1.5 font-black text-slate-950">{ovrVal}</td>
                        <td className="p-1.5 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleComparePlayer(p);
                            }}
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
                    );
                  })}
                  {players.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-500 font-bold uppercase">
                        No players found matching current filters
                      </td>
                    </tr>
                  )}
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