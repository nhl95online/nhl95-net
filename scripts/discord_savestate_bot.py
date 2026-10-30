# -*- coding: utf-8 -*-
"""
NHL95.net Live Discord Save State Ingestion Bot
===============================================
Listens in real time for Genesis Plus GX / RetroArch save states (.state, .state1-9, .sav)
dropped into Discord channels, parses the binary game state, posts all game/player/scoring/
penalty stats to Supabase, updates the schedule/playoff bracket & standings, reacts with ✅,
and replies with the official WN95HL Retro Boxscore embed.

Usage:
  python scripts/discord_savestate_bot.py
  python scripts/discord_savestate_bot.py --backfill-hours 48
  python scripts/discord_savestate_bot.py --channel-ids 1234567890,0987654321
"""

import os
import io
import re
import sys
import json
import math
import asyncio
import argparse
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional, Tuple

import discord

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# --- PATHS & ENV LOADING ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEASONS_DIR = os.path.join(BASE_DIR, "lib", "seasons")


def load_dotenv_files():
    """Loads environment variables from .env.local and .env if not already set in OS env."""
    for env_name in [".env.local", ".env"]:
        env_path = os.path.join(BASE_DIR, env_name)
        if os.path.isfile(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for raw_line in f:
                        line = raw_line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k and k not in os.environ:
                            os.environ[k] = v
            except Exception as e:
                print(f"Warning: Could not read {env_name}: {e}")


load_dotenv_files()

DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://prdfunbzqsvqlyiwmuqp.supabase.co").rstrip("/")
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    or ""
)
DISCORD_BOXSCORE_WEBHOOK_URL = os.getenv("DISCORD_BOXSCORE_WEBHOOK_URL") or os.getenv("DISCORD_WEBHOOK_URL") or ""
DISCORD_WATCH_CHANNELS_ENV = os.getenv("DISCORD_SAVESTATE_CHANNELS", "")

# --- CONSTANTS & MAPS (Matching lib/seasons/index.ts & lib/parsers/savestate.ts) ---

GOAL_TYPE_DICT: Dict[int, Tuple[str, str]] = {
    0: ("Home", "SH2"),
    1: ("Home", "SH"),
    2: ("Home", "EV"),
    3: ("Home", "PP"),
    4: ("Home", "PP2"),
    128: ("Away", "SH2"),
    129: ("Away", "SH"),
    130: ("Away", "EV"),
    131: ("Away", "PP"),
    132: ("Away", "PP2"),
}

PENALTY_DICT: Dict[int, Tuple[str, str]] = {
    18: ("Home", "Boarding"),
    22: ("Home", "Charging"),
    24: ("Home", "Slashing"),
    26: ("Home", "Roughing"),
    28: ("Home", "Cross-Checking"),
    30: ("Home", "Hooking"),
    32: ("Home", "Tripping"),
    34: ("Home", "Interference"),
    36: ("Home", "Holding"),
    38: ("Home", "Fighting"),
    146: ("Away", "Boarding"),
    150: ("Away", "Charging"),
    152: ("Away", "Slashing"),
    154: ("Away", "Roughing"),
    156: ("Away", "Cross-Checking"),
    158: ("Away", "Hooking"),
    160: ("Away", "Tripping"),
    162: ("Away", "Interference"),
    164: ("Away", "Holding"),
    166: ("Away", "Fighting"),
}

TEAM_CITY_ALIASES: Dict[str, str] = {
    "AUT": "AUTOBAHN", "BAR": "BARRIE", "BAY": "BAYTOWN", "BFC": "BETTY FORD", "DHG": "DEVIN HILL",
    "GRH": "GRAND RIVER", "HAM": "HAMILTON", "HIG": "HIGHLAND", "ING": "INGLEWOOD", "ITA": "ITALY",
    "KAR": "KAROLINA", "MHA": "MARYHILL", "MHT": "MINHATTRICK", "MGG": "MINNESOTA", "NBK": "NORTH BAY",
    "OCW": "ORANGE COUNTY", "PIT": "PITTSBURGH", "PRO": "PROVIDENCE", "RIC": "RICHFIELD", "ROC": "ROCKFORD",
    "SHS": "SOUTH HILLS", "SVF": "SUGAR VALLEY", "SUM": "SUMTER", "TAI": "TAIPEI", "TEG": "TEGUCIGALPA",
    "TBP": "THUNDER BAY", "VHV": "VALHALLA", "WDY": "WOODLYNNE", "ETI": "EASTER ISLAND",
    "BOS": "BOSTON", "CHI": "CHICAGO", "DTC": "DETROIT", "MTL": "MONTREAL", "NYR": "NEW YORK", "TOR": "TORONTO",
    "DET": "DETROIT", "NY": "NEW YORK", "DEVN HILL": "DEVIN HILL", "RICHMOND": "RICHFIELD", "RFD": "RICHFIELD",
}

W_LEAGUE_COACH_MAP: Dict[str, Dict[str, Any]] = {
    "AUT": {"coach_id": 2, "coach_name": "Autobahn", "city": "AUTOBAHN"},
    "BAR": {"coach_id": 65, "coach_name": "Dasri", "city": "BARRIE"},
    "BAY": {"coach_id": 49, "coach_name": "Jer_33", "city": "BAYTOWN"},
    "BFC": {"coach_id": 58, "coach_name": "Krav1", "city": "BETTY FORD"},
    "DHG": {"coach_id": 67, "coach_name": "vancecookcobxin", "city": "DEVIN HILL"},
    "GRH": {"coach_id": 25, "coach_name": "Moses Bogart", "city": "GRAND RIVER"},
    "HAM": {"coach_id": 37, "coach_name": "Derek Sutton", "city": "HAMILTON"},
    "HIG": {"coach_id": 9, "coach_name": "wolf_of_highland", "city": "HIGHLAND"},
    "ING": {"coach_id": 50, "coach_name": "Don Don", "city": "INGLEWOOD"},
    "ITA": {"coach_id": 14, "coach_name": "Marcus Vick EBC", "city": "ITALY"},
    "KAR": {"coach_id": 39, "coach_name": "MattyA", "city": "KAROLINA"},
    "MHA": {"coach_id": 54, "coach_name": "red", "city": "MARYHILL"},
    "MHT": {"coach_id": 13, "coach_name": "segathon", "city": "MINHATTRICK"},
    "MGG": {"coach_id": 12, "coach_name": "gaelicgopher", "city": "MINNESOTA"},
    "NBK": {"coach_id": 26, "coach_name": "Unholy Grail", "city": "NORTH BAY"},
    "OCW": {"coach_id": 51, "coach_name": "MNYoda84", "city": "ORANGE COUNTY"},
    "PIT": {"coach_id": 17, "coach_name": "Adolf Oliver Nipples", "city": "PITTSBURGH"},
    "PRO": {"coach_id": 30, "coach_name": "Lloyd10Xmas", "city": "PROVIDENCE"},
    "RIC": {"coach_id": 19, "coach_name": "bclinton_666", "city": "RICHFIELD"},
    "ROC": {"coach_id": 66, "coach_name": "The Villain CTJ", "city": "ROCKFORD"},
    "SHS": {"coach_id": 60, "coach_name": "marylandmike.", "city": "SOUTH HILLS"},
    "SVF": {"coach_id": 20, "coach_name": "Chalkitup7777", "city": "SUGAR VALLEY"},
    "SUM": {"coach_id": 21, "coach_name": "Pink Elephants", "city": "SUMTER"},
    "TAI": {"coach_id": 28, "coach_name": "NathanMB", "city": "TAIPEI"},
    "TEG": {"coach_id": 24, "coach_name": "Ticklepuss", "city": "TEGUCIGALPA"},
    "TBP": {"coach_id": 29, "coach_name": "shawnbell", "city": "THUNDER BAY"},
    "VHV": {"coach_id": 15, "coach_name": "UltraMagnus", "city": "VALHALLA"},
    "WDY": {"coach_id": 63, "coach_name": "NewJerseyKiller", "city": "WOODLYNNE"},
    "ETI": {"coach_id": 18, "coach_name": "LHX", "city": "EASTER ISLAND"},
}


def load_season_configs() -> Dict[int, Dict[str, Any]]:
    """Loads W-League (40 & 38) and O-League (39) JSON configs from lib/seasons/."""
    configs: Dict[int, Dict[str, Any]] = {}
    w_path = os.path.join(SEASONS_DIR, "w_season.json")
    o_path = os.path.join(SEASONS_DIR, "o_season.json")

    if os.path.isfile(w_path):
        with open(w_path, "r", encoding="utf-8") as f:
            w_cfg = json.load(f)
            configs[40] = w_cfg
            w17_cfg = dict(w_cfg)
            w17_cfg["seasonId"] = 38
            w17_cfg["seasonName"] = "W League - Season 17 Playoffs (W17 / Season 38)"
            w17_cfg["leagueCode"] = "W17"
            configs[38] = w17_cfg

    if os.path.isfile(o_path):
        with open(o_path, "r", encoding="utf-8") as f:
            configs[39] = json.load(f)

    return configs


SEASON_CONFIGS = load_season_configs()


def get_season_config(season_id: int) -> Dict[str, Any]:
    s_id = int(season_id)
    if s_id in SEASON_CONFIGS:
        return SEASON_CONFIGS[s_id]
    if s_id == 39 or (54 <= s_id <= 65):
        base_o = dict(SEASON_CONFIGS.get(39, {}))
        o_num = 1 if s_id == 39 else (s_id - 52)
        base_o["seasonId"] = s_id
        base_o["leagueCode"] = f"O{o_num:02d}"
        base_o["seasonName"] = f"Original 6 - Season {o_num} ({1926 + o_num})"
        return base_o
    base_w = dict(SEASON_CONFIGS.get(40, {}))
    w_num = (s_id - 22) if 40 <= s_id <= 53 else s_id
    base_w["seasonId"] = s_id
    base_w["leagueCode"] = get_league_code(s_id)
    base_w["seasonName"] = f"W League - Season {w_num}"
    return base_w


def get_league_code(season_id: int) -> str:
    s_id = int(season_id)
    mapping = {
        1: "W01", 2: "W02", 3: "W03", 4: "W04", 6: "W05", 9: "W06", 11: "W07", 14: "W08",
        18: "W09", 22: "W10", 24: "W11", 28: "W12", 31: "W13", 33: "W14", 35: "W15", 37: "W16",
        38: "W17", 39: "O01", 40: "W18", 41: "W19", 42: "W20", 43: "W21", 44: "W22", 45: "W23",
        46: "W24", 47: "W25", 48: "W26", 49: "W27", 50: "W28", 51: "W29", 52: "W30", 53: "W31",
        54: "O02", 55: "O03", 56: "O04",
    }
    return mapping.get(s_id, f"W{s_id:02d}")


YEAR_TO_SEASON_ID: Dict[int, int] = {
    # W-League Years (1995 - 2026+)
    1995: 1, 1996: 2, 1997: 3, 1998: 4, 1999: 6, 2000: 9, 2001: 11, 2002: 14,
    2003: 18, 2004: 22, 2005: 24, 2006: 28, 2007: 31, 2008: 33, 2009: 35, 2010: 37,
    2011: 38, 2012: 38, 2013: 40, 2014: 41, 2015: 42, 2016: 43, 2017: 44, 2018: 45,
    2019: 46, 2020: 47, 2021: 48, 2022: 49, 2023: 50, 2024: 51, 2025: 52, 2026: 53,
    # Original 6 (O-League) Years (1927+)
    1927: 39, 1928: 54, 1929: 55, 1930: 56, 1931: 57, 1932: 58, 1933: 59, 1934: 60,
    # Vintage / Golden Era
    1917: 20, 1980: 16,
}

SEASON_ID_TO_YEAR: Dict[int, int] = {v: k for k, v in YEAR_TO_SEASON_ID.items() if k != 2011}


def resolve_season_id_from_year(year: int) -> int:
    """Resolves a 4-digit channel year (e.g. 2014 -> 41 [W19], 1927 -> 39 [O01]) via DB + known map."""
    try:
        leagues_rows = supabase.select("leagues", {"select": "*", "order": "league_id.desc"})
        for row in leagues_rows or []:
            l_id = row.get("league_id") or row.get("id") or row.get("season_id")
            l_name = str(row.get("league_name") or row.get("name") or row.get("season_name") or "")
            l_year = row.get("year")
            if l_id is not None:
                if (l_year is not None and int(l_year) == year) or str(year) in l_name:
                    return int(l_id)
    except Exception:
        pass

    if year in YEAR_TO_SEASON_ID:
        return YEAR_TO_SEASON_ID[year]
    if 1927 <= year <= 1967:
        return 39 if year == 1927 else (54 + (year - 1928))
    if year >= 2013:
        return 40 + (year - 2013)
    return 40


def format_time(seconds: int) -> str:
    m = int(seconds) // 60
    s = int(seconds) % 60
    return f"{m}:{s:02d}"


def parse_time_to_day_fraction(time_str: str) -> str:
    if not time_str:
        return "0"
    parts = str(time_str).split(":")
    minutes = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 0
    seconds = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
    total_fraction = (minutes + seconds / 60.0) / 24.0
    return str(total_fraction)


def parse_toi_seconds(toi_val: Any) -> int:
    if isinstance(toi_val, (int, float)):
        return 0 if math.isnan(toi_val) else int(toi_val)
    if isinstance(toi_val, str):
        trimmed = toi_val.strip()
        if not trimmed or trimmed in ("-", "--", "0:00", "00:00"):
            return 0
        if ":" in trimmed:
            parts = [int(p) if p.isdigit() else 0 for p in trimmed.split(":")]
            if len(parts) == 3:
                return parts[0] * 3600 + parts[1] * 60 + parts[2]
            return parts[0] * 60 + (parts[1] if len(parts) > 1 else 0)
        try:
            return int(float(trimmed))
        except ValueError:
            return 0
    return 0


# =====================================================================
# 1. BINARY SAVE STATE PARSER (100% Parity with lib/parsers/savestate.ts)
# =====================================================================

def parse_save_state_bytes(buffer: bytes, config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if len(buffer) < 52000:
        raise ValueError(f"Invalid save state: file size too small ({len(buffer)} bytes, minimum 52KB expected).")

    if config is None:
        config = get_season_config(40)

    raw_team_codes = config.get("teamCodes", {})
    team_codes: Dict[int, str] = {int(k): str(v) for k, v in raw_team_codes.items()}
    team_pos_counts: Dict[str, Dict[str, int]] = config.get("teamPositionCounts", {})
    default_pos = config.get("defaultPositionCounts", {"goalies": 2, "forwards": 5, "defensemen": 3})
    goalie_dict: Dict[str, List[str]] = config.get("goalies", {})
    skater_dict: Dict[str, List[str]] = config.get("skaters", {})

    offset = 32
    if buffer[48980 + offset] > 30 and buffer[48980] <= 30:
        offset = 0

    d = buffer

    # 1. Away Team General Stats
    awayGoals = d[50682 + offset]
    awayPPGoals = d[50672 + offset]
    awayPPTries = d[50674 + offset]
    awayPPTimeSec = d[51522 + offset] + d[51523 + offset] * 256
    awayPPShots = d[51524 + offset]
    awaySHGoals = d[51526 + offset]
    awayBreakGoals = d[51530 + offset]
    awayBreakTries = d[51528 + offset]
    awayOneTimerGoals = d[51534 + offset]
    awayOneTimerTries = d[51532 + offset]
    awayPenShotGoals = d[51538 + offset]
    awayPenShotTries = d[51536 + offset]
    awayFaceoffWins = d[50684 + offset]
    awayChecks = d[50686 + offset]
    awayPenalties = d[50676 + offset]
    awayPIM = d[50678 + offset]
    awayAttackZoneTimeSec = d[50680 + offset] + d[50681 + offset] * 256
    awayPassComps = d[50690 + offset]
    awayPassTries = d[50688 + offset]
    if awayPassTries < awayPassComps:
        awayPassTries += 256
    awayGoalsP1 = d[51506 + offset]
    awayGoalsP2 = d[51508 + offset]
    awayGoalsP3 = d[51510 + offset]
    awayGoalsOT = d[51512 + offset]
    awayShotsP1 = d[51514 + offset]
    awayShotsP2 = d[51516 + offset]
    awayShotsP3 = d[51518 + offset]
    awayShotsOT = d[51520 + offset]

    awayTeamCodeByte = d[48982 + offset]
    awayTeamCode = team_codes.get(awayTeamCodeByte, f"TM_{awayTeamCodeByte}")
    awayShots = awayShotsP1 + awayShotsP2 + awayShotsP3 + awayShotsOT
    awayShootPct = round(awayGoals / awayShots, 3) if awayShots > 0 else 0

    # 2. Home Team General Stats
    homeGoals = d[49812 + offset]
    homePPGoals = d[49802 + offset]
    homePPTries = d[49804 + offset]
    homePPTimeSec = d[50652 + offset] + d[50653 + offset] * 256
    homePPShots = d[50654 + offset]
    homeSHGoals = d[50656 + offset]
    homeBreakGoals = d[50660 + offset]
    homeBreakTries = d[50658 + offset]
    homeOneTimerGoals = d[50664 + offset]
    homeOneTimerTries = d[50662 + offset]
    homePenShotGoals = d[50668 + offset]
    homePenShotTries = d[50666 + offset]
    homeFaceoffWins = d[49814 + offset]
    homeChecks = d[49816 + offset]
    homePenalties = d[49806 + offset]
    homePIM = d[49808 + offset]
    homeAttackZoneTimeSec = d[49810 + offset] + d[49811 + offset] * 256
    homePassComps = d[49820 + offset]
    homePassTries = d[49818 + offset]
    if homePassTries < homePassComps:
        homePassTries += 256
    homeGoalsP1 = d[50636 + offset]
    homeGoalsP2 = d[50638 + offset]
    homeGoalsP3 = d[50640 + offset]
    homeGoalsOT = d[50642 + offset]
    homeShotsP1 = d[50644 + offset]
    homeShotsP2 = d[50646 + offset]
    homeShotsP3 = d[50648 + offset]
    homeShotsOT = d[50650 + offset]

    homeTeamCodeByte = d[48980 + offset]
    homeTeamCode = team_codes.get(homeTeamCodeByte, f"TM_{homeTeamCodeByte}")
    homeShots = homeShotsP1 + homeShotsP2 + homeShotsP3 + homeShotsOT
    homeShootPct = round(homeGoals / homeShots, 3) if homeShots > 0 else 0

    # 3. Roster Info & Player Names
    awayGCount = team_pos_counts.get(awayTeamCode, {}).get("goalies", default_pos.get("goalies", 2))
    awayFCount = team_pos_counts.get(awayTeamCode, {}).get("forwards", default_pos.get("forwards", 5))
    awayDCount = team_pos_counts.get(awayTeamCode, {}).get("defensemen", default_pos.get("defensemen", 3))

    homeGCount = team_pos_counts.get(homeTeamCode, {}).get("goalies", default_pos.get("goalies", 2))
    homeFCount = team_pos_counts.get(homeTeamCode, {}).get("forwards", default_pos.get("forwards", 5))
    homeDCount = team_pos_counts.get(homeTeamCode, {}).get("defensemen", default_pos.get("defensemen", 3))

    awayGoalieNames = goalie_dict.get(awayTeamCode, ["Goalie 1", "Goalie 2"])
    awaySkaterNames = skater_dict.get(
        awayTeamCode,
        ["Forward 1", "Forward 2", "Forward 3", "Forward 4", "Forward 5", "Forward 6", "Defense 1", "Defense 2", "Defense 3", "Defense 4"],
    )

    awayPlayers: List[Dict[str, str]] = []
    for i in range(awayGCount):
        name = awayGoalieNames[i] if i < len(awayGoalieNames) and awayGoalieNames[i] else f"Goalie {i + 1}"
        awayPlayers.append({"name": name, "pos": "G"})
    for i in range(awayFCount):
        name = awaySkaterNames[i] if i < len(awaySkaterNames) and awaySkaterNames[i] else f"Forward {i + 1}"
        awayPlayers.append({"name": name, "pos": "F"})
    for i in range(awayDCount):
        idx = awayFCount + i
        name = awaySkaterNames[idx] if idx < len(awaySkaterNames) and awaySkaterNames[idx] else f"Defense {i + 1}"
        awayPlayers.append({"name": name, "pos": "D"})

    homeGoalieNames = goalie_dict.get(homeTeamCode, ["Goalie 1", "Goalie 2"])
    homeSkaterNames = skater_dict.get(
        homeTeamCode,
        ["Forward 1", "Forward 2", "Forward 3", "Forward 4", "Forward 5", "Forward 6", "Defense 1", "Defense 2", "Defense 3", "Defense 4"],
    )

    homePlayers: List[Dict[str, str]] = []
    for i in range(homeGCount):
        name = homeGoalieNames[i] if i < len(homeGoalieNames) and homeGoalieNames[i] else f"Goalie {i + 1}"
        homePlayers.append({"name": name, "pos": "G"})
    for i in range(homeFCount):
        name = homeSkaterNames[i] if i < len(homeSkaterNames) and homeSkaterNames[i] else f"Forward {i + 1}"
        homePlayers.append({"name": name, "pos": "F"})
    for i in range(homeDCount):
        idx = homeFCount + i
        name = homeSkaterNames[idx] if idx < len(homeSkaterNames) and homeSkaterNames[idx] else f"Defense {i + 1}"
        homePlayers.append({"name": name, "pos": "D"})

    # 4. Scoring Summary
    numGoals = d[49196 + offset] // 6
    startGoalByte = 49198 + offset
    parsedGoals: List[Dict[str, Any]] = []

    for i in range(numGoals):
        b1 = d[startGoalByte + 1 + i * 6]
        if b1 < 64:
            perFactor = 0
        elif b1 < 128:
            perFactor = 64
        elif b1 < 192:
            perFactor = 128
        else:
            perFactor = 192

        periodNum = (perFactor // 64) + 1
        secondsNum = (b1 - perFactor) * 256 + d[startGoalByte + i * 6]
        typeCode = d[startGoalByte + 3 + i * 6]
        side, status = GOAL_TYPE_DICT.get(typeCode, ("Away" if typeCode >= 128 else "Home", "EV"))
        goalTeam = homeTeamCode if side == "Home" else awayTeamCode

        scorerSlot = d[startGoalByte + 2 + i * 6]
        assist1Slot = d[startGoalByte + 5 + i * 6]
        assist2Slot = d[startGoalByte + 4 + i * 6]

        rosterList = homePlayers if side == "Home" else awayPlayers
        scorer = rosterList[scorerSlot]["name"] if scorerSlot < len(rosterList) else f"Player #{scorerSlot + 1}"
        assist1 = "--" if assist1Slot == 255 else (rosterList[assist1Slot]["name"] if assist1Slot < len(rosterList) else f"Player #{assist1Slot + 1}")
        assist2 = "--" if assist2Slot == 255 else (rosterList[assist2Slot]["name"] if assist2Slot < len(rosterList) else f"Player #{assist2Slot + 1}")

        parsedGoals.append({
            "goalNum": i + 1,
            "period": periodNum,
            "time": format_time(secondsNum),
            "seconds": secondsNum,
            "team": goalTeam,
            "side": side,
            "scorer": scorer,
            "assist1": assist1,
            "assist2": assist2,
            "type": status,
        })

    # 5. Penalty Summary
    numPens = d[49558 + offset] // 4
    startPenByte = 49560 + offset
    parsedPenalties: List[Dict[str, Any]] = []

    for i in range(numPens):
        b1 = d[startPenByte + 1 + i * 4]
        if b1 < 64:
            perFactor = 0
        elif b1 < 128:
            perFactor = 64
        elif b1 < 192:
            perFactor = 128
        else:
            perFactor = 192

        periodNum = (perFactor // 64) + 1
        secondsNum = (b1 - perFactor) * 256 + d[startPenByte + i * 4]
        penCode = d[startPenByte + 3 + i * 4]
        side, penType = PENALTY_DICT.get(penCode, ("Away" if penCode >= 146 else "Home", "Penalty"))
        penTeam = homeTeamCode if side == "Home" else awayTeamCode
        playerSlot = d[startPenByte + 2 + i * 4]
        rosterList = homePlayers if side == "Home" else awayPlayers
        player = rosterList[playerSlot]["name"] if playerSlot < len(rosterList) else f"Player #{playerSlot + 1}"

        parsedPenalties.append({
            "penNum": i + 1,
            "period": periodNum,
            "time": format_time(secondsNum),
            "seconds": secondsNum,
            "team": penTeam,
            "side": side,
            "player": player,
            "type": penType,
        })

    # 6. Game Length & OT
    hasOT = bool(
        awayGoalsOT > 0
        or awayShotsOT > 0
        or homeGoalsOT > 0
        or homeShotsOT > 0
        or (len(parsedPenalties) > 0 and parsedPenalties[-1]["period"] == 4)
    )

    gameLengthSec = 900
    if hasOT:
        if homeGoals == awayGoals:
            gameLengthSec = 1200
        else:
            otLength = parsedGoals[-1]["seconds"] if len(parsedGoals) > 0 else 0
            gameLengthSec = 900 + otLength

    # 7. Away Player & Goalie Extraction
    awayTotalSlots = awayGCount + awayFCount + awayDCount
    awayRawPlayerStats: List[Dict[str, Any]] = []
    awaySwapVal = 1
    awayStartByte = 50852 + offset

    for i in range(awayTotalSlots):
        goals = d[awayStartByte + 0 + i + awaySwapVal]
        assists = d[awayStartByte + 26 + i + awaySwapVal]
        shots = d[awayStartByte + 52 + i + awaySwapVal]
        checks = d[awayStartByte + 104 + i + awaySwapVal]
        pim = d[awayStartByte + 78 + i + awaySwapVal]
        rawToi = d[awayStartByte + 130 + 1 + i * 2] * 256 + d[awayStartByte + 130 + i * 2]
        toi = min(rawToi, gameLengthSec)

        awayRawPlayerStats.append({
            "name": awayPlayers[i]["name"] if i < len(awayPlayers) else f"Away Player {i + 1}",
            "pos": awayPlayers[i]["pos"] if i < len(awayPlayers) else "F",
            "goals": goals,
            "assists": assists,
            "points": goals + assists,
            "shots": shots,
            "checks": checks,
            "pim": pim,
            "toi": toi,
        })
        awaySwapVal *= -1

    # 8. Home Player & Goalie Extraction
    homeTotalSlots = homeGCount + homeFCount + homeDCount
    homeRawPlayerStats: List[Dict[str, Any]] = []
    homeSwapVal = 1
    homeStartByte = 49982 + offset

    for i in range(homeTotalSlots):
        goals = d[homeStartByte + 0 + i + homeSwapVal]
        assists = d[homeStartByte + 26 + i + homeSwapVal]
        shots = d[homeStartByte + 52 + i + homeSwapVal]
        checks = d[homeStartByte + 104 + i + homeSwapVal]
        pim = d[homeStartByte + 78 + i + homeSwapVal]
        rawToi = d[homeStartByte + 130 + 1 + i * 2] * 256 + d[homeStartByte + 130 + i * 2]
        toi = min(rawToi, gameLengthSec)

        homeRawPlayerStats.append({
            "name": homePlayers[i]["name"] if i < len(homePlayers) else f"Home Player {i + 1}",
            "pos": homePlayers[i]["pos"] if i < len(homePlayers) else "F",
            "goals": goals,
            "assists": assists,
            "points": goals + assists,
            "shots": shots,
            "checks": checks,
            "pim": pim,
            "toi": toi,
        })
        homeSwapVal *= -1

    # 9. Format Away Goalies & Skaters
    awayRecGoalieIdx = 0 if (awayRawPlayerStats[0]["toi"] if len(awayRawPlayerStats) > 0 else 0) >= (awayRawPlayerStats[1]["toi"] if len(awayRawPlayerStats) > 1 else 0) else 1
    awayGoalies: List[Dict[str, Any]] = []
    for i in range(awayGCount):
        if i >= len(awayRawPlayerStats):
            continue
        gRaw = awayRawPlayerStats[i]
        gName = gRaw["name"]
        gGoals = sum(1 for g in parsedGoals if g["scorer"] == gName)
        isRec = awayRecGoalieIdx == i

        w = 1 if (isRec and awayGoals > homeGoals) else 0
        l = 1 if (isRec and awayGoals < homeGoals and not hasOT) else 0
        t = 1 if (isRec and awayGoals == homeGoals) else 0
        otl = 1 if (isRec and awayGoals < homeGoals and hasOT) else 0

        ga = gRaw["goals"]
        assists = gRaw["assists"]
        shots = gRaw["shots"]
        saves = shots - ga if shots >= ga else 0
        savePct = round((shots - ga) / shots, 3) if shots > 0 else 0
        so = 1 if (ga == 0 and isRec and shots > 0) else 0

        if not gName or gName == "--":
            continue

        awayGoalies.append({
            "name": gName,
            "pos": "G",
            "team": awayTeamCode,
            "side": "Away",
            "goals": gGoals,
            "assists": assists,
            "points": gGoals + assists,
            "so": so,
            "ga": ga,
            "saves": saves,
            "shots": shots,
            "savePct": savePct,
            "w": w,
            "l": l,
            "t": t,
            "otl": otl,
            "toi": format_time(gRaw["toi"]),
            "toiSeconds": gRaw["toi"],
        })

    awaySkaters: List[Dict[str, Any]] = []
    for i in range(awayGCount, awayTotalSlots):
        if i >= len(awayRawPlayerStats):
            continue
        sRaw = awayRawPlayerStats[i]
        sName = sRaw["name"]
        ppp = 0
        shp = 0
        for goal in parsedGoals:
            if goal["scorer"] == sName or goal["assist1"] == sName or goal["assist2"] == sName:
                if str(goal["type"]).startswith("PP"):
                    ppp += 1
                if str(goal["type"]).startswith("SH"):
                    shp += 1

        if not sName or sName == "--":
            continue

        awaySkaters.append({
            "name": sName,
            "pos": sRaw["pos"],
            "team": awayTeamCode,
            "side": "Away",
            "goals": sRaw["goals"],
            "assists": sRaw["assists"],
            "points": sRaw["points"],
            "sog": sRaw["shots"],
            "checks": sRaw["checks"],
            "pim": sRaw["pim"],
            "ppp": ppp,
            "shp": shp,
            "toi": format_time(sRaw["toi"]),
            "toiSeconds": sRaw["toi"],
        })

    # 10. Format Home Goalies & Skaters
    homeRecGoalieIdx = 0 if (homeRawPlayerStats[0]["toi"] if len(homeRawPlayerStats) > 0 else 0) >= (homeRawPlayerStats[1]["toi"] if len(homeRawPlayerStats) > 1 else 0) else 1
    homeGoalies: List[Dict[str, Any]] = []
    for i in range(homeGCount):
        if i >= len(homeRawPlayerStats):
            continue
        gRaw = homeRawPlayerStats[i]
        gName = gRaw["name"]
        gGoals = sum(1 for g in parsedGoals if g["scorer"] == gName)
        isRec = homeRecGoalieIdx == i

        w = 1 if (isRec and homeGoals > awayGoals) else 0
        l = 1 if (isRec and homeGoals < awayGoals and not hasOT) else 0
        t = 1 if (isRec and homeGoals == awayGoals) else 0
        otl = 1 if (isRec and homeGoals < awayGoals and hasOT) else 0

        ga = gRaw["goals"]
        assists = gRaw["assists"]
        shots = gRaw["shots"]
        saves = shots - ga if shots >= ga else 0
        savePct = round((shots - ga) / shots, 3) if shots > 0 else 0
        so = 1 if (ga == 0 and isRec and shots > 0) else 0

        if not gName or gName == "--":
            continue

        homeGoalies.append({
            "name": gName,
            "pos": "G",
            "team": homeTeamCode,
            "side": "Home",
            "goals": gGoals,
            "assists": assists,
            "points": gGoals + assists,
            "so": so,
            "ga": ga,
            "saves": saves,
            "shots": shots,
            "savePct": savePct,
            "w": w,
            "l": l,
            "t": t,
            "otl": otl,
            "toi": format_time(gRaw["toi"]),
            "toiSeconds": gRaw["toi"],
        })

    homeSkaters: List[Dict[str, Any]] = []
    for i in range(homeGCount, homeTotalSlots):
        if i >= len(homeRawPlayerStats):
            continue
        sRaw = homeRawPlayerStats[i]
        sName = sRaw["name"]
        ppp = 0
        shp = 0
        for goal in parsedGoals:
            if goal["scorer"] == sName or goal["assist1"] == sName or goal["assist2"] == sName:
                if str(goal["type"]).startswith("PP"):
                    ppp += 1
                if str(goal["type"]).startswith("SH"):
                    shp += 1

        if not sName or sName == "--":
            continue

        homeSkaters.append({
            "name": sName,
            "pos": sRaw["pos"],
            "team": homeTeamCode,
            "side": "Home",
            "goals": sRaw["goals"],
            "assists": sRaw["assists"],
            "points": sRaw["points"],
            "sog": sRaw["shots"],
            "checks": sRaw["checks"],
            "pim": sRaw["pim"],
            "ppp": ppp,
            "shp": shp,
            "toi": format_time(sRaw["toi"]),
            "toiSeconds": sRaw["toi"],
        })

    homeTeamStats = {
        "teamCode": homeTeamCode,
        "goals": homeGoals,
        "shots": homeShots,
        "shootingPct": homeShootPct,
        "ppGoals": homePPGoals,
        "ppTries": homePPTries,
        "ppTime": format_time(homePPTimeSec),
        "ppShots": homePPShots,
        "shGoals": homeSHGoals,
        "breakawayGoals": homeBreakGoals,
        "breakawayTries": homeBreakTries,
        "oneTimerGoals": homeOneTimerGoals,
        "oneTimerTries": homeOneTimerTries,
        "penaltyShotGoals": homePenShotGoals,
        "penaltyShotTries": homePenShotTries,
        "faceoffWins": homeFaceoffWins,
        "checks": homeChecks,
        "penalties": homePenalties,
        "pim": homePIM,
        "attackZoneTime": format_time(homeAttackZoneTimeSec if awayAttackZoneTimeSec else 0),
        "passComps": homePassComps,
        "passTries": homePassTries,
        "goalsP1": homeGoalsP1,
        "goalsP2": homeGoalsP2,
        "goalsP3": homeGoalsP3,
        "goalsOT": homeGoalsOT,
        "shotsP1": homeShotsP1,
        "shotsP2": homeShotsP2,
        "shotsP3": homeShotsP3,
        "shotsOT": homeShotsOT,
    }

    awayTeamStats = {
        "teamCode": awayTeamCode,
        "goals": awayGoals,
        "shots": awayShots,
        "shootingPct": awayShootPct,
        "ppGoals": awayPPGoals,
        "ppTries": awayPPTries,
        "ppTime": format_time(awayPPTimeSec),
        "ppShots": awayPPShots,
        "shGoals": awaySHGoals,
        "breakawayGoals": awayBreakGoals,
        "breakawayTries": awayBreakTries,
        "oneTimerGoals": awayOneTimerGoals,
        "oneTimerTries": awayOneTimerTries,
        "penaltyShotGoals": awayPenShotGoals,
        "penaltyShotTries": awayPenShotTries,
        "faceoffWins": awayFaceoffWins,
        "checks": awayChecks,
        "penalties": awayPenalties,
        "pim": awayPIM,
        "attackZoneTime": format_time(awayAttackZoneTimeSec),
        "passComps": awayPassComps,
        "passTries": awayPassTries,
        "goalsP1": awayGoalsP1,
        "goalsP2": awayGoalsP2,
        "goalsP3": awayGoalsP3,
        "goalsOT": awayGoalsOT,
        "shotsP1": awayShotsP1,
        "shotsP2": awayShotsP2,
        "shotsP3": awayShotsP3,
        "shotsOT": awayShotsOT,
    }

    awayGoalies.sort(key=lambda g: g.get("toiSeconds", 0), reverse=True)
    homeGoalies.sort(key=lambda g: g.get("toiSeconds", 0), reverse=True)
    awaySkaters.sort(
        key=lambda s: (
            s.get("points", 0),
            s.get("goals", 0),
            s.get("sog", 0),
            s.get("checks", 0),
            s.get("pim", 0),
            s.get("toiSeconds", 0),
        ),
        reverse=True,
    )
    homeSkaters.sort(
        key=lambda s: (
            s.get("points", 0),
            s.get("goals", 0),
            s.get("sog", 0),
            s.get("checks", 0),
            s.get("pim", 0),
            s.get("toiSeconds", 0),
        ),
        reverse=True,
    )

    return {
        "matchup": f"{awayTeamCode} @ {homeTeamCode}",
        "homeTeam": homeTeamStats,
        "awayTeam": awayTeamStats,
        "homeTeamByte": homeTeamCodeByte,
        "awayTeamByte": awayTeamCodeByte,
        "isOT": hasOT,
        "gameLength": format_time(gameLengthSec),
        "totalFaceoffs": awayFaceoffWins + homeFaceoffWins,
        "goals": parsedGoals,
        "penalties": parsedPenalties,
        "homeGoalies": homeGoalies,
        "awayGoalies": awayGoalies,
        "homeSkaters": homeSkaters,
        "awaySkaters": awaySkaters,
    }


# =====================================================================
# 2. SUPABASE REST CLIENT HELPER (Zero extra pip dependencies needed)
# =====================================================================

class SupabaseRestClient:
    def __init__(self, url: str, key: str):
        self.base_url = f"{url.rstrip('/')}/rest/v1"
        self.key = key
        self.anon_fallback_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

    def _headers(self, prefer: Optional[str] = None, override_key: Optional[str] = None) -> Dict[str, str]:
        k = override_key or self.key
        h = {
            "apikey": k,
            "Authorization": f"Bearer {k}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if prefer:
            h["Prefer"] = prefer
        return h

    def _urlopen(self, url: str, method: str = "GET", data: Optional[bytes] = None, prefer: Optional[str] = None) -> str:
        req = urllib.request.Request(url, data=data, headers=self._headers(prefer), method=method)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return resp.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            if e.code == 401 and self.anon_fallback_key and self.key != self.anon_fallback_key:
                self.key = self.anon_fallback_key
                req2 = urllib.request.Request(url, data=data, headers=self._headers(prefer, self.anon_fallback_key), method=method)
                with urllib.request.urlopen(req2, timeout=15) as resp2:
                    return resp2.read().decode("utf-8")
            raise

    def select(self, table: str, params: Dict[str, str]) -> List[Dict[str, Any]]:
        query = urllib.parse.urlencode(params, safe="(),.*")
        url = f"{self.base_url}/{table}?{query}"
        body = self._urlopen(url, method="GET")
        return json.loads(body) if body else []

    def insert(self, table: str, payload: Any, upsert: bool = False, on_conflict: Optional[str] = None) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/{table}"
        if on_conflict:
            url += f"?on_conflict={urllib.parse.quote(on_conflict)}"
        prefer = "return=representation"
        if upsert:
            prefer = "resolution=merge-duplicates,return=representation"
        data = json.dumps(payload).encode("utf-8")
        body = self._urlopen(url, method="POST", data=data, prefer=prefer)
        return json.loads(body) if body else []

    def update(self, table: str, filters: Dict[str, str], payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        query = urllib.parse.urlencode(filters, safe="(),.*")
        url = f"{self.base_url}/{table}?{query}"
        data = json.dumps(payload).encode("utf-8")
        body = self._urlopen(url, method="PATCH", data=data, prefer="return=representation")
        return json.loads(body) if body else []

    def delete(self, table: str, filters: Dict[str, str]) -> None:
        query = urllib.parse.urlencode(filters, safe="(),.*")
        url = f"{self.base_url}/{table}?{query}"
        self._urlopen(url, method="DELETE")

    def rpc(self, fn_name: str, payload: Dict[str, Any]) -> Any:
        url = f"{self.base_url}/rpc/{fn_name}"
        data = json.dumps(payload).encode("utf-8")
        body = self._urlopen(url, method="POST", data=data)
        return json.loads(body) if body else None


supabase = SupabaseRestClient(SUPABASE_URL, SUPABASE_KEY)


# =====================================================================
# 3. TEAM MATCHING, STANDINGS RECALCULATION & BOXSCORE EMBED BUILDER
# =====================================================================

def match_team_from_list(code: str, teams_list: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not code:
        return None
    clean_code = code.strip().upper()
    alias = TEAM_CITY_ALIASES.get(clean_code, clean_code).upper()
    known = W_LEAGUE_COACH_MAP.get(clean_code)

    if teams_list:
        # 1. Exact Abbreviation Match
        for t in teams_list:
            if (t.get("abbreviation") or "").strip().upper() == clean_code:
                return t

        # 2. Exact Team Name Match
        for t in teams_list:
            name = (t.get("team_name") or "").strip().upper()
            if name == alias or name == clean_code:
                return t
            if clean_code == "RIC" and name in ("RICHFIELD", "RICHMOND"):
                return t
            if clean_code == "MHT" and name in ("MANOTICK", "MHT"):
                return t

        # 3. Exact Coach ID Match
        if known and known.get("coach_id"):
            for t in teams_list:
                if int(t.get("coach_id") or 0) == int(known["coach_id"]):
                    return t

        # 4. Exact Coach Name Match
        if known and known.get("coach_name"):
            for t in teams_list:
                lc = t.get("league_coaches")
                c_name = ""
                if isinstance(lc, dict):
                    c_name = (lc.get("coach_name") or "").strip().lower()
                elif isinstance(lc, list) and lc:
                    c_name = (lc[0].get("coach_name") or "").strip().lower()
                if c_name == known["coach_name"].lower():
                    return t

        # 5. Contains / Word Boundary Match
        for t in teams_list:
            name = (t.get("team_name") or "").strip().upper()
            if alias in name:
                return t
            if clean_code == "RIC" and ("RICHFIELD" in name or "RICHMOND" in name):
                return t
            if clean_code == "MHT" and "MANOTICK" in name:
                return t

    if known:
        return {
            "team_id": 0,
            "team_name": known["city"],
            "abbreviation": clean_code,
            "coach_id": known["coach_id"],
            "league_coaches": {"coach_id": known["coach_id"], "coach_name": known["coach_name"]},
        }
    return None


def calculate_three_stars(game: Dict[str, Any], away_code: str, home_code: str) -> List[Dict[str, Any]]:
    candidates: List[Dict[str, Any]] = []
    away_goals = int(game.get("awayTeam", {}).get("goals") or 0)
    home_goals = int(game.get("homeTeam", {}).get("goals") or 0)
    away_won = away_goals > home_goals
    home_won = home_goals > away_goals

    for g in game.get("awayGoalies", []):
        ga = int(g.get("ga") or 0)
        sv = int(g.get("saves") or 0)
        sh = int(g.get("shots") or (sv + ga))
        sv_pct = sv / sh if sh > 0 else 0
        if sh == 0 and ga == 0:
            continue
        score = (sv * 0.3) + (4.5 if away_won else 0) - (ga * 1.2)
        if ga == 0 and sh >= 4:
            score += 5.0
        if sv_pct >= 0.85:
            score += 2.0
        summary = f"{sv} SV on {sh} SH ({sv_pct * 100:.1f}%){' [WIN]' if away_won else ''}{' [SO]' if ga == 0 and sh > 0 else ''}"
        candidates.append({"name": g["name"], "team": away_code, "pos": "G", "summary": summary, "score": score})

    for g in game.get("homeGoalies", []):
        ga = int(g.get("ga") or 0)
        sv = int(g.get("saves") or 0)
        sh = int(g.get("shots") or (sv + ga))
        sv_pct = sv / sh if sh > 0 else 0
        if sh == 0 and ga == 0:
            continue
        score = (sv * 0.3) + (4.5 if home_won else 0) - (ga * 1.2)
        if ga == 0 and sh >= 4:
            score += 5.0
        if sv_pct >= 0.85:
            score += 2.0
        summary = f"{sv} SV on {sh} SH ({sv_pct * 100:.1f}%){' [WIN]' if home_won else ''}{' [SO]' if ga == 0 and sh > 0 else ''}"
        candidates.append({"name": g["name"], "team": home_code, "pos": "G", "summary": summary, "score": score})

    for side_skaters, team_code, team_won in [
        (game.get("awaySkaters", []), away_code, away_won),
        (game.get("homeSkaters", []), home_code, home_won),
    ]:
        for s in side_skaters:
            g = int(s.get("goals") or 0)
            a = int(s.get("assists") or 0)
            pts = g + a
            sog = int(s.get("sog") or 0)
            chk = int(s.get("checks") or 0)
            ppp = int(s.get("ppp") or 0)
            shp = int(s.get("shp") or 0)
            score = (g * 4.0) + (a * 2.5) + (sog * 0.25) + (chk * 0.15) + (ppp * 0.5) + (shp * 1.0) + (1.5 if team_won and pts > 0 else 0)
            if pts == 0 and sog < 4 and chk < 4:
                continue
            stat_parts = []
            if g > 0:
                stat_parts.append(f"{g}G")
            if a > 0:
                stat_parts.append(f"{a}A")
            if pts > 0:
                stat_parts.append(f"({pts} PTS)")
            if sog > 0:
                stat_parts.append(f"{sog} SOG")
            if chk > 2:
                stat_parts.append(f"{chk} CHK")
            candidates.append({
                "name": s["name"],
                "team": team_code,
                "pos": s.get("pos", "F"),
                "summary": ", ".join(stat_parts) if stat_parts else f"{sog} SOG",
                "score": score,
            })

    candidates.sort(key=lambda x: x["score"], reverse=True)
    return [{"star": idx + 1, **c} for idx, c in enumerate(candidates[:3])]


_IMAGE_CACHE: Dict[str, Any] = {}


def _fetch_pil_image(url: str) -> Any:
    """Downloads and caches an image from Supabase Storage for the Pillow boxscore renderer."""
    if not url:
        return None
    if url in _IMAGE_CACHE:
        return _IMAGE_CACHE[url].copy() if _IMAGE_CACHE[url] is not None else None
    try:
        from PIL import Image
        req = urllib.request.Request(url, headers={"User-Agent": "NHL95Bot/1.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            img = Image.open(io.BytesIO(resp.read())).convert("RGBA")
            _IMAGE_CACHE[url] = img
            return img.copy()
    except Exception:
        _IMAGE_CACHE[url] = None
        return None


def render_retro_boxscore_png(
    game: Dict[str, Any],
    away_team: Dict[str, Any],
    home_team: Dict[str, Any],
) -> Optional[bytes]:
    """
    Renders the exact 1024x447 black/green/white WN95HL Retro Boxscore graphic
    matching media_1793219027818_50255068.png and returns PNG bytes.
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return None

    W, H = 1024, 447
    img = Image.new("RGB", (W, H), (0, 0, 0))
    draw = ImageDraw.Draw(img)

    WHITE = (255, 255, 255)
    GREEN = (0, 255, 0)
    LINE_GRAY = (160, 160, 160)
    BLUE_RING = (0, 162, 232)

    def load_font(size: int, bold: bool = False):
        candidates = (
            [
                "C:/Windows/Fonts/verdanab.ttf",
                "C:/Windows/Fonts/tahomabd.ttf",
                "C:/Windows/Fonts/arialbd.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            ]
            if bold
            else [
                "C:/Windows/Fonts/verdana.ttf",
                "C:/Windows/Fonts/tahoma.ttf",
                "C:/Windows/Fonts/arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            ]
        )
        for path in candidates:
            if os.path.isfile(path):
                try:
                    return ImageFont.truetype(path, size)
                except Exception:
                    pass
        return ImageFont.load_default()

    f_score = load_font(35, False)
    f_title = load_font(10, False)
    f_hdr = load_font(10, False)
    f_row = load_font(10, False)
    f_per_hdr = load_font(10, False)
    f_per_val = load_font(10, False)

    away_code = (game["awayTeam"].get("teamCode") or away_team.get("abbreviation") or "AWY").upper()
    home_code = (game["homeTeam"].get("teamCode") or home_team.get("abbreviation") or "HOM").upper()
    orig6 = {"BOS", "CHI", "DET", "DTC", "MTL", "NYR", "TOR"}
    is_o6 = away_code in orig6 or home_code in orig6

    TEAM_BANNER_FILENAMES = {
        "AUT": "autobahn_autobahn.png", "BAR": "barrie_dolts.png", "BAY": "baytown_thunder.png",
        "BFC": "betty_ford_clinic.png", "DHG": "devin_hill_goblins.png", "ETI": "easter_island_stoneheads.png",
        "GRH": "grand_river_herons.png", "HAM": "hamilton_mustangs.png", "HIG": "highland_wolf.png",
        "ING": "inglewood_monstars.png", "ITA": "italy_ebc.png", "KAR": "karolina_kaos.png",
        "MGG": "minnesota_golden_gophers.png", "MHA": "maryhill_alumni.png", "MHT": "minhattrick_swayzes.png",
        "NBK": "north_bay_knights.png", "OCW": "orange_county_weststars.png", "PIT": "pitt_intramurals.png",
        "PRO": "providence_sea_bass.png", "RIC": "richfield_oracles.png", "ROC": "rockford_villains.png",
        "SHS": "south_hills_shindigaz.png", "SUM": "sumter_trash.png", "SVF": "sugar_valley_firebirds.png",
        "TAI": "taipei_typhoons.png", "TBP": "thunder_bay_pike.png", "TEG": "tegucigalpa_ticklepuss.png",
        "VHV": "valhalla_vikings.png", "WDY": "woodlynne_rats.png",
        "BOS": "boston_bruins.png", "CHI": "chicago_black_hawks.png", "DET": "detroit_cougars.png",
        "DTC": "detroit_cougars.png", "MTL": "montreal_canadiens.png", "NYR": "new_york_rangers.png",
        "TOR": "toronto_maple_leafs1.png",
    }

    TEAM_SMALL_LOGO_URLS = {
        "AUT": f"{SUPABASE_URL}/storage/v1/object/public/teams/Autobahn%20Autobahn%20Logo.png",
        "BAR": f"{SUPABASE_URL}/storage/v1/object/public/teams/Barrie%20Dolts%20Logo.png",
        "BAY": f"{SUPABASE_URL}/storage/v1/object/public/teams/Baytown%20Thunder%20Logo.png",
        "BFC": f"{SUPABASE_URL}/storage/v1/object/public/teams/Betty%20Ford%20Clinic%20Logo.png",
        "DHG": f"{SUPABASE_URL}/storage/v1/object/public/teams/Devin%20Hill%20Goblins%20Logo.png",
        "ETI": f"{SUPABASE_URL}/storage/v1/object/public/teams/Easter%20Island%20Stone%20Heads%20Logo.png",
        "GRH": f"{SUPABASE_URL}/storage/v1/object/public/teams/Grand%20River%20Herons%20Logo.png",
        "HAM": f"{SUPABASE_URL}/storage/v1/object/public/teams/hamilton_mustangs.png",
        "HIG": f"{SUPABASE_URL}/storage/v1/object/public/teams/Highland%20Wolf%20Logo.png",
        "ING": f"{SUPABASE_URL}/storage/v1/object/public/teams/Inglewood%20Monstars%20Logo%20S3.png",
        "ITA": f"{SUPABASE_URL}/storage/v1/object/public/teams/Italy%20EBC%20Logo%20S12.png",
        "KAR": f"{SUPABASE_URL}/storage/v1/object/public/teams/Karolina%20Kaos%20Logo.png",
        "MGG": f"{SUPABASE_URL}/storage/v1/object/public/teams/Minnesota%20Golden%20Gophers%20Logo.png",
        "MHA": f"{SUPABASE_URL}/storage/v1/object/public/teams/Maryhill%20Alumni%20Logo.png",
        "MHT": f"{SUPABASE_URL}/storage/v1/object/public/teams/Minhattrick%20Swayzes%20Logo%20S13.png",
        "NBK": f"{SUPABASE_URL}/storage/v1/object/public/teams/North%20Bay%20Knights%20Logo.png",
        "OCW": f"{SUPABASE_URL}/storage/v1/object/public/teams/Orange%20County%20Weststars%20Logo.png",
        "PIT": f"{SUPABASE_URL}/storage/v1/object/public/teams/Pitt%20Intramurals%20Logo.png",
        "PRO": f"{SUPABASE_URL}/storage/v1/object/public/teams/Providence%20Sea%20Bass%20Logo.png",
        "RIC": f"{SUPABASE_URL}/storage/v1/object/public/teams/Richfield%20Oracles%20Logo.png",
        "ROC": f"{SUPABASE_URL}/storage/v1/object/public/teams/Rockford%20Villains%20Logo.png",
        "SHS": f"{SUPABASE_URL}/storage/v1/object/public/teams/South%20Hills%20Shindigaz%20Logo.png",
        "SUM": f"{SUPABASE_URL}/storage/v1/object/public/teams/Sumter%20Trash%20Logo.png",
        "SVF": f"{SUPABASE_URL}/storage/v1/object/public/teams/Sugar%20Valley%20Firebirds%20Logo%20S3.png",
        "TAI": f"{SUPABASE_URL}/storage/v1/object/public/teams/Taipei%20Typhoons%20Logo.png",
        "TBP": f"{SUPABASE_URL}/storage/v1/object/public/teams/Thunder%20Bay%20Pike%20Logo.png",
        "TEG": f"{SUPABASE_URL}/storage/v1/object/public/teams/Tegucigalpa%20Ticklepuss%20Logo.png",
        "VHV": f"{SUPABASE_URL}/storage/v1/object/public/teams/Valhalla%20Vikings%20Logo.png",
        "WDY": f"{SUPABASE_URL}/storage/v1/object/public/teams/Woodlynne%20Rats%20Logo.png",
        "BOS": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/boston_bruins%201927.png",
        "CHI": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/chicago_black_hawks%201927.png",
        "DET": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/detroit_cougars%201927.png",
        "DTC": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/detroit_cougars%201927.png",
        "MTL": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/montreal_canadiens%201927.png",
        "NYR": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/new_york_rangers%201927.png",
        "TOR": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/toronto_maple_leafs%201927.png",
    }

    def get_banner(code: str, team_obj: Optional[Dict[str, Any]] = None):
        urls = []
        bf = (team_obj or {}).get("banner_filename") or TEAM_BANNER_FILENAMES.get(code)
        if bf:
            bf_clean = str(bf).strip()
            bucket = "nhl%20banners" if code in orig6 else "banners"
            urls.append(f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{urllib.parse.quote(bf_clean)}")
        c = "DET" if code == "DTC" else code
        urls.extend(
            [f"{SUPABASE_URL}/storage/v1/object/public/nhl%20banners/{c}.png", f"{SUPABASE_URL}/storage/v1/object/public/banners/{code}.png"]
            if code in orig6
            else [f"{SUPABASE_URL}/storage/v1/object/public/banners/{code}.png", f"{SUPABASE_URL}/storage/v1/object/public/nhl%20banners/{c}.png"]
        )
        for u in urls:
            im = _fetch_pil_image(u)
            if im is not None:
                return im
        return None

    def get_small_logo(team_obj: Dict[str, Any], code: str):
        urls = []
        if team_obj.get("logo_url"):
            urls.append(str(team_obj["logo_url"]).strip())
        if code in TEAM_SMALL_LOGO_URLS:
            urls.append(TEAM_SMALL_LOGO_URLS[code])
        urls.append(f"{SUPABASE_URL}/storage/v1/object/public/logos/{code}.png")
        for u in urls:
            im = _fetch_pil_image(u)
            if im is not None:
                return im
        return None

    def fmt_sv_pct(val: Any) -> str:
        try:
            v = float(val)
        except Exception:
            return ".000"
        if v <= 0:
            return ".000"
        if v >= 0.9995:
            return "1.000"
        return f".{round(v * 1000):03d}"

    def fit_text(txt: str, max_px: int) -> str:
        s = str(txt or "").strip()
        if not s:
            return ""
        try:
            if draw.textlength(s, font=f_row) <= max_px:
                return s
            while len(s) > 1 and draw.textlength(s, font=f_row) > max_px:
                s = s[:-1]
            return s.rstrip()
        except Exception:
            return s[:17]

    def draw_team_panel(y_top: int, code: str, score: int, goalies: List[Dict[str, Any]], skaters: List[Dict[str, Any]]):
        # Wide Team Banner + Neon Green Score
        banner = get_banner(code)
        if banner is not None:
            banner = banner.resize((162, 33))
            img.paste(banner, (5, y_top + 6), banner)
        else:
            draw.text((8, y_top + 10), code, fill=WHITE, font=load_font(22, True))

        draw.text((228, y_top + 22), str(score), fill=GREEN, font=f_score, anchor="mm")

        # Goalies Table
        gy = y_top + 55
        g_cols = [
            ("Goalies", 5, "la"),
            ("G", 123, "ma"),
            ("A", 137, "ma"),
            ("PTS", 156, "ma"),
            ("SO", 181, "ma"),
            ("GA", 202, "ma"),
            ("SV", 223, "ma"),
            ("SH", 242, "ma"),
            ("SV%", 270, "ma"),
            ("TOI", 317, "ma"),
        ]
        for lbl, cx, anc in g_cols:
            draw.text((cx, gy), lbl, fill=WHITE, font=f_hdr, anchor=anc)
        draw.line([(5, gy + 13), (338, gy + 13)], fill=LINE_GRAY, width=1)

        ry = gy + 19
        for g in (goalies or [])[:2]:
            sv_str = fmt_sv_pct(g.get("savePct", 0))
            vals = [
                (fit_text(g.get("name") or "", 110), 5, "la"),
                (str(g.get("goals", 0)), 123, "ma"),
                (str(g.get("assists", 0)), 137, "ma"),
                (str(int(g.get("goals", 0)) + int(g.get("assists", 0))), 156, "ma"),
                (str(g.get("so", 0)), 181, "ma"),
                (str(g.get("ga", 0)), 202, "ma"),
                (str(g.get("saves", 0)), 223, "ma"),
                (str(g.get("shots", 0)), 242, "ma"),
                (sv_str, 270, "ma"),
                (str(g.get("toi") or "0:00"), 317, "ma"),
            ]
            for val, cx, anc in vals:
                draw.text((cx, ry), val, fill=WHITE, font=f_row, anchor=anc)
            ry += 12

        # Players Table
        py = y_top + 109
        p_cols = [
            ("Players", 5, "la"),
            ("G", 123, "ma"),
            ("A", 137, "ma"),
            ("PTS", 156, "ma"),
            ("SOG", 180, "ma"),
            ("CHK", 206, "ma"),
            ("PIM", 232, "ma"),
            ("PPP", 256, "ma"),
            ("SHP", 281, "ma"),
            ("TOI", 317, "ma"),
        ]
        for lbl, cx, anc in p_cols:
            draw.text((cx, py), lbl, fill=WHITE, font=f_hdr, anchor=anc)
        draw.line([(5, py + 13), (338, py + 13)], fill=LINE_GRAY, width=1)

        ry = py + 19
        for s in (skaters or [])[:8]:
            vals = [
                (fit_text(s.get("name") or "", 110), 5, "la"),
                (str(s.get("goals", 0)), 123, "ma"),
                (str(s.get("assists", 0)), 137, "ma"),
                (str(s.get("points", 0)), 156, "ma"),
                (str(s.get("sog", 0)), 180, "ma"),
                (str(s.get("checks", 0)), 206, "ma"),
                (str(s.get("pim", 0)), 232, "ma"),
                (str(s.get("ppp", 0)), 256, "ma"),
                (str(s.get("shp", 0)), 281, "ma"),
                (str(s.get("toi") or "0:00"), 317, "ma"),
            ]
            for val, cx, anc in vals:
                draw.text((cx, ry), val, fill=WHITE, font=f_row, anchor=anc)
            ry += 12

    draw_team_panel(8, away_code, int(game["awayTeam"].get("goals") or 0), game.get("awayGoalies", []), game.get("awaySkaters", []))
    draw_team_panel(226, home_code, int(game["homeTeam"].get("goals") or 0), game.get("homeGoalies", []), game.get("homeSkaters", []))

    # --- CENTER COLUMN ---
    cx_mid = 436
    # Circular League Badge
    badge_r = 38
    badge_cy = 46
    draw.ellipse([(cx_mid - badge_r - 2, badge_cy - badge_r - 2), (cx_mid + badge_r + 2, badge_cy + badge_r + 2)], fill=BLUE_RING)
    draw.ellipse([(cx_mid - badge_r, badge_cy - badge_r), (cx_mid + badge_r, badge_cy + badge_r)], fill=WHITE)
    league_logo_url = f"{SUPABASE_URL}/storage/v1/object/public/images%20for%20site/{'Original%206.png' if is_o6 else 'WN95HL.png'}"
    l_img = _fetch_pil_image(league_logo_url)
    if l_img is not None:
        l_img.thumbnail((68, 68))
        img.paste(l_img, (cx_mid - l_img.width // 2, badge_cy - l_img.height // 2), l_img)

    # Period Score Table
    pt_y = 98
    col_xs = [355, 382, 409, 435, 460, 485, 517]
    per_hdrs = ["", "1rst", "2nd", "3rd", "OT", "Total"]
    for idx, h_lbl in enumerate(per_hdrs):
        if h_lbl:
            mid_x = (col_xs[idx] + col_xs[idx + 1]) // 2
            draw.text((mid_x, pt_y), h_lbl, fill=WHITE, font=f_per_hdr, anchor="ma")

    at = game["awayTeam"]
    ht = game["homeTeam"]
    per_rows = [
        (away_code, [at.get("goalsP1", 0), at.get("goalsP2", 0), at.get("goalsP3", 0), at.get("goalsOT", 0), at.get("goals", 0)]),
        (home_code, [ht.get("goalsP1", 0), ht.get("goalsP2", 0), ht.get("goalsP3", 0), ht.get("goalsOT", 0), ht.get("goals", 0)]),
    ]
    for r_idx, (t_code, p_vals) in enumerate(per_rows):
        ry1 = pt_y + 13 + r_idx * 12
        ry2 = ry1 + 12
        for c_idx in range(6):
            x1, x2 = col_xs[c_idx], col_xs[c_idx + 1]
            draw.rectangle([(x1, ry1), (x2, ry2)], outline=LINE_GRAY, width=1)
            mx = (x1 + x2) // 2
            my = (ry1 + ry2) // 2
            if c_idx == 0:
                draw.text((mx, my), t_code, fill=GREEN, font=f_per_val, anchor="mm")
            else:
                draw.text((mx, my), str(p_vals[c_idx - 1]), fill=WHITE, font=f_per_val, anchor="mm")

    # Games Stats Header + Logos
    gs_y = 148
    a_logo = get_small_logo(away_team, away_code)
    h_logo = get_small_logo(home_team, home_code)
    if a_logo is not None:
        a_logo.thumbnail((22, 22))
        img.paste(a_logo, (382 - a_logo.width // 2, gs_y - 6), a_logo)
    draw.text((cx_mid, gs_y + 5), "Games Stats", fill=WHITE, font=f_title, anchor="mm")
    if h_logo is not None:
        h_logo.thumbnail((22, 22))
        img.paste(h_logo, (490 - h_logo.width // 2, gs_y - 6), h_logo)

    total_fo = int(at.get("faceoffWins") or 0) + int(ht.get("faceoffWins") or 0)
    a_sh_pct = f"{round((int(at.get('goals') or 0) / max(1, int(at.get('shots') or 0))) * 100)}%" if int(at.get("shots") or 0) > 0 else "0%"
    h_sh_pct = f"{round((int(ht.get('goals') or 0) / max(1, int(ht.get('shots') or 0))) * 100)}%" if int(ht.get("shots") or 0) > 0 else "0%"

    stat_items = [
        ("Shots", at.get("shots", 0), ht.get("shots", 0)),
        ("1rst Period", at.get("shotsP1", 0), ht.get("shotsP1", 0)),
        ("2nd Period", at.get("shotsP2", 0), ht.get("shotsP2", 0)),
        ("3rd Period", at.get("shotsP3", 0), ht.get("shotsP3", 0)),
        ("Overtime", at.get("shotsOT", 0), ht.get("shotsOT", 0)),
        ("Shooting %", a_sh_pct, h_sh_pct),
        ("PowerPlay", f"{at.get('ppGoals', 0)}/{at.get('ppTries', 0)}", f"{ht.get('ppGoals', 0)}/{ht.get('ppTries', 0)}"),
        ("PowerPlay Shots", at.get("ppShots", 0), ht.get("ppShots", 0)),
        ("Shorthanded G", at.get("shGoals", 0), ht.get("shGoals", 0)),
        ("Breakaways", f"{at.get('breakawayGoals', 0)}/{at.get('breakawayTries', 0)}", f"{ht.get('breakawayGoals', 0)}/{ht.get('breakawayTries', 0)}"),
        ("One-Timers", f"{at.get('oneTimerGoals', 0)}/{at.get('oneTimerTries', 0)}", f"{ht.get('oneTimerGoals', 0)}/{ht.get('oneTimerTries', 0)}"),
        ("Penalty Shots", f"{at.get('penaltyShotGoals', 0)}/{at.get('penaltyShotTries', 0)}", f"{ht.get('penaltyShotGoals', 0)}/{ht.get('penaltyShotTries', 0)}"),
        ("Faceoffs", f"{at.get('faceoffWins', 0)}/{total_fo}", f"{ht.get('faceoffWins', 0)}/{total_fo}"),
        ("Body Checks", at.get("checks", 0), ht.get("checks", 0)),
        ("Penalties", at.get("penalties", 0), ht.get("penalties", 0)),
        ("Attack Zone", at.get("attackZoneTime", "0:00"), ht.get("attackZoneTime", "0:00")),
    ]

    sy = 171
    for lbl, aval, hval in stat_items:
        draw.text((368, sy), str(aval), fill=WHITE, font=f_row, anchor="ma")
        draw.text((428, sy), lbl, fill=GREEN, font=f_row, anchor="ma")
        draw.text((488, sy), str(hval), fill=WHITE, font=f_row, anchor="ma")
        sy += 16

    # --- RIGHT COLUMN ---
    rx_left = 538
    rx_right = 1020
    rx_mid = 762

    # Scoring Summary
    draw.text((rx_mid, 3), "Scoring Summary", fill=WHITE, font=f_title, anchor="ma")
    sc_hy = 18
    draw.line([(rx_left, sc_hy - 2), (rx_right, sc_hy - 2)], fill=LINE_GRAY, width=1)
    sc_cols = [
        ("Per.", 539, "la"),
        ("Time", 568, "la"),
        ("Team", 600, "la"),
        ("Goal", 635, "la"),
        ("Primary", 750, "la"),
        ("Secondary", 872, "la"),
        ("Type", 996, "la"),
    ]
    for lbl, cx, anc in sc_cols:
        draw.text((cx, sc_hy), lbl, fill=WHITE, font=f_hdr, anchor=anc)
    draw.line([(rx_left, sc_hy + 13), (rx_right, sc_hy + 13)], fill=LINE_GRAY, width=1)

    sry = sc_hy + 19
    for g in (game.get("goals") or [])[:12]:
        a1 = g.get("assist1") if g.get("assist1") and g.get("assist1") != "--" else ""
        a2 = g.get("assist2") if g.get("assist2") and g.get("assist2") != "--" else ""
        raw_per = g.get("period", "")
        per_str = "OT" if str(raw_per) == "4" else str(raw_per)
        vals = [
            (per_str, 539, "la"),
            (str(g.get("time", "")), 568, "la"),
            (str(g.get("team", "")), 600, "la"),
            (fit_text(g.get("scorer") or "", 111), 635, "la"),
            (fit_text(a1, 118), 750, "la"),
            (fit_text(a2, 118), 872, "la"),
            (str(g.get("type") or "EV"), 996, "la"),
        ]
        for val, cx, anc in vals:
            draw.text((cx, sry), val, fill=WHITE, font=f_row, anchor=anc)
        sry += 13

    # Penalty Summary
    pen_ty = 219
    draw.text((rx_mid, pen_ty), "Penalty Summary", fill=WHITE, font=f_title, anchor="ma")
    pen_hy = pen_ty + 15
    draw.line([(rx_left, pen_hy - 2), (rx_right, pen_hy - 2)], fill=LINE_GRAY, width=1)
    pen_cols = [
        ("Per.", 539, "la"),
        ("Time", 568, "la"),
        ("Team", 600, "la"),
        ("Player", 635, "la"),
        ("Penalty", 750, "la"),
    ]
    for lbl, cx, anc in pen_cols:
        draw.text((cx, pen_hy), lbl, fill=WHITE, font=f_hdr, anchor=anc)
    draw.line([(rx_left, pen_hy + 13), (rx_right, pen_hy + 13)], fill=LINE_GRAY, width=1)

    pry = pen_hy + 19
    for p in (game.get("penalties") or [])[:12]:
        raw_per = p.get("period", "")
        per_str = "OT" if str(raw_per) == "4" else str(raw_per)
        vals = [
            (per_str, 539, "la"),
            (str(p.get("time", "")), 568, "la"),
            (str(p.get("team", "")), 600, "la"),
            (fit_text(p.get("player") or "", 111), 635, "la"),
            (str(p.get("type") or "")[:18], 750, "la"),
        ]
        for val, cx, anc in vals:
            draw.text((cx, pry), val, fill=WHITE, font=f_row, anchor=anc)
        pry += 13

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def render_standings_and_leaders_png(s_id: int, is_playoff_mode: bool = False) -> Optional[bytes]:
    """
    Renders a 1024x447 retro graphic (matching boxscore.png's black/green/white Verdana 10px style)
    containing:
      - Left: League Standings for Season s_id
      - Center Top: Circular League Badge (WN95HL.png or Original 6.png)
      - Right Top: Top 10 Scorers for Season s_id
      - Right Bottom: Top Goalies for Season s_id
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return None

    try:
        # Ensure league_standings is recalculated from live league_gamestats + league_schedule first
        recalc_res = recalculate_and_save_season_standings(s_id)
        standings_rows = recalc_res.get("rows") or []
        if not standings_rows:
            standings_rows = supabase.select(
                "league_standings",
                {"select": "*", "season_id": f"eq.{s_id}"},
            ) or []
        teams_data = supabase.select(
            "league_teams",
            {"select": "*"},
        ) or []
        coaches_data = supabase.select(
            "league_coaches",
            {"select": "coach_id,coach_name"},
        ) or []
        pstats_table = "league_playoff_player_stats_master" if is_playoff_mode else "league_player_stats_master"
        pstats_rows = supabase.select(
            pstats_table,
            {"select": "*", "league_id": f"eq.{s_id}"},
        ) or []
        players_data = supabase.select(
            "league_rosters",
            {"select": "player_id,player_name", "league_id": f"eq.{s_id}"},
        ) or []
        if not players_data:
            players_data = supabase.select(
                "league_rosters",
                {"select": "player_id,player_name"},
            ) or []
    except Exception as e:
        print(f"Warning: Could not fetch standings/leaders data for PNG: {e}")
        return None

    coach_map = {int(c["coach_id"]): (c.get("coach_name") or "").strip() for c in coaches_data if c.get("coach_id") is not None}
    team_map = {}
    for t in teams_data:
        if t.get("team_id") is not None:
            tid = int(t["team_id"])
            cid = int(t.get("coach_id") or 0)
            abbr = (t.get("abbreviation") or "").strip().upper()
            cname = coach_map.get(cid) or W_LEAGUE_COACH_MAP.get(abbr, {}).get("coach") or ""
            team_map[tid] = {
                "team_name": (t.get("team_name") or abbr or f"Team {tid}").strip(),
                "abbreviation": abbr or "TM",
                "coach_name": cname,
                "logo_url": (t.get("logo_url") or "").strip(),
            }

    player_name_map = {
        int(p["player_id"]): (p.get("player_name") or "").strip()
        for p in players_data
        if p.get("player_id") is not None
    }

    # Sort standings by PTS desc, W desc, GD desc, GF desc
    standings_sorted = sorted(
        standings_rows,
        key=lambda r: (
            int(r.get("pts") or 0),
            int(r.get("w") or 0),
            int(r.get("gd") or (int(r.get("gf") or 0) - int(r.get("ga") or 0))),
            int(r.get("gf") or 0),
        ),
        reverse=True,
    )

    # Aggregate skaters & goalies across the season
    skater_agg: Dict[str, Dict[str, Any]] = {}
    goalie_agg: Dict[str, Dict[str, Any]] = {}

    for row in pstats_rows:
        pid = int(row.get("player_id") or 0)
        tid = int(row.get("team_id") or 0)
        pname = player_name_map.get(pid) or f"Player #{pid}"
        t_abbr = team_map.get(tid, {}).get("abbreviation", "TM")
        pos = (row.get("pos_played") or "F").strip().upper()
        key = f"{pid}_{tid}" if pid > 0 else f"{pname}_{tid}"

        if pos == "G":
            if key not in goalie_agg:
                goalie_agg[key] = {
                    "name": pname,
                    "team": t_abbr,
                    "gp": 0,
                    "w": 0,
                    "l": 0,
                    "t": 0,
                    "ga": 0,
                    "sv": 0,
                    "sh": 0,
                    "so": 0,
                    "toi": 0,
                }
            g = goalie_agg[key]
            toi_val = int(row.get("toi") or 0)
            sh_val = int(row.get("shots_against") or 0)
            sv_val = int(row.get("saves") or 0)
            ga_val = int(row.get("goals_against") or 0)
            is_w = bool(row.get("is_win"))
            is_l = bool(row.get("is_loss"))
            is_t = bool(row.get("is_tie"))
            if toi_val > 0 or sh_val > 0 or sv_val > 0 or ga_val > 0 or is_w or is_l or is_t:
                g["gp"] += 1
            if is_w:
                g["w"] += 1
            if is_l:
                g["l"] += 1
            if is_t:
                g["t"] += 1
            g["ga"] += ga_val
            g["sv"] += sv_val
            g["sh"] += sh_val
            g["toi"] += toi_val
            if ga_val == 0 and (toi_val >= 600 or sh_val > 0 or is_w or is_t):
                g["so"] += 1
        else:
            if key not in skater_agg:
                skater_agg[key] = {
                    "name": pname,
                    "team": t_abbr,
                    "gp": 0,
                    "g": 0,
                    "a": 0,
                    "pts": 0,
                    "sog": 0,
                    "chk": 0,
                    "pim": 0,
                    "ppp": 0,
                    "shp": 0,
                }
            s = skater_agg[key]
            goals = int(row.get("goals") or 0)
            assists = int(row.get("assists") or 0)
            shots = int(row.get("shots") or 0)
            checks = int(row.get("checks") or 0)
            pim = int(row.get("pim") or 0)
            ppp = int(row.get("pp_points") or 0)
            shp = int(row.get("sh_points") or 0)
            toi_val = int(row.get("toi") or 0)
            if toi_val > 0 or goals > 0 or assists > 0 or shots > 0 or checks > 0 or pim > 0:
                s["gp"] += 1
            s["g"] += goals
            s["a"] += assists
            s["pts"] += goals + assists
            s["sog"] += shots
            s["chk"] += checks
            s["pim"] += pim
            s["ppp"] += ppp
            s["shp"] += shp

    top_scorers = sorted(
        skater_agg.values(),
        key=lambda x: (x["pts"], x["g"], -x["gp"], x["sog"], x["chk"]),
        reverse=True,
    )[:15]

    top_goalies = sorted(
        [g for g in goalie_agg.values() if g["gp"] > 0],
        key=lambda x: (
            x["w"],
            (x["sv"] / x["sh"]) if x["sh"] > 0 else 0.0,
            x["so"],
            -(x["ga"] / max(1, x["gp"])),
        ),
        reverse=True,
    )[:15]

    W = 1024
    H = max(516, 58 + len(standings_sorted) * 14)
    img = Image.new("RGB", (W, H), (0, 0, 0))
    draw = ImageDraw.Draw(img)

    font_dir = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts")

    def get_font(names: List[str], size: int):
        for n in names:
            p = os.path.join(font_dir, n)
            if os.path.isfile(p):
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    pass
        return ImageFont.load_default()

    f_row = get_font(["verdana.ttf", "tahoma.ttf", "arial.ttf"], 10)
    f_title = get_font(["verdanab.ttf", "tahomabd.ttf", "arialbd.ttf"], 11)

    GREEN = (0, 255, 0)
    WHITE = (255, 255, 255)
    RULE = (181, 181, 181)

    league_code = get_league_code(s_id)
    year_num = SEASON_ID_TO_YEAR.get(s_id, "")
    is_orig6 = league_code.startswith("O") or s_id == 39

    # Center-top circular League Badge
    badge_url = (
        f"{SUPABASE_URL}/storage/v1/object/public/images%20for%20site/Original%206.png"
        if is_orig6
        else f"{SUPABASE_URL}/storage/v1/object/public/images%20for%20site/WN95HL.png"
    )
    badge_img = _fetch_pil_image(badge_url)
    if badge_img:
        bw, bh = 56, 56
        b_resized = badge_img.resize((bw, bh), Image.Resampling.LANCZOS)
        bx, by = 452, 6
        mask = Image.new("L", (bw, bh), 0)
        mdraw = ImageDraw.Draw(mask)
        mdraw.ellipse((0, 0, bw - 1, bh - 1), fill=255)
        circle_bg = Image.new("RGBA", (bw, bh), (255, 255, 255, 255))
        circle_bg.paste(b_resized, (0, 0), b_resized)
        img.paste(circle_bg, (bx, by), mask)
        draw.ellipse((bx, by, bx + bw - 1, by + bh - 1), outline=(30, 144, 255), width=1)

    # =========================================================
    # 1. LEFT PANEL: LEAGUE STANDINGS (x=4..444)
    # =========================================================
    TEAM_SMALL_LOGO_URLS = {
        "AUT": f"{SUPABASE_URL}/storage/v1/object/public/teams/Autobahn%20Autobahn%20Logo.png",
        "BAR": f"{SUPABASE_URL}/storage/v1/object/public/teams/Barrie%20Dolts%20Logo.png",
        "BAY": f"{SUPABASE_URL}/storage/v1/object/public/teams/Baytown%20Thunder%20Logo.png",
        "BFC": f"{SUPABASE_URL}/storage/v1/object/public/teams/Betty%20Ford%20Clinic%20Logo.png",
        "DHG": f"{SUPABASE_URL}/storage/v1/object/public/teams/Devin%20Hill%20Goblins%20Logo.png",
        "ETI": f"{SUPABASE_URL}/storage/v1/object/public/teams/Easter%20Island%20Stone%20Heads%20Logo.png",
        "GRH": f"{SUPABASE_URL}/storage/v1/object/public/teams/Grand%20River%20Herons%20Logo.png",
        "HAM": f"{SUPABASE_URL}/storage/v1/object/public/teams/hamilton_mustangs.png",
        "HIG": f"{SUPABASE_URL}/storage/v1/object/public/teams/Highland%20Wolf%20Logo.png",
        "ING": f"{SUPABASE_URL}/storage/v1/object/public/teams/Inglewood%20Monstars%20Logo%20S3.png",
        "ITA": f"{SUPABASE_URL}/storage/v1/object/public/teams/Italy%20EBC%20Logo%20S12.png",
        "KAR": f"{SUPABASE_URL}/storage/v1/object/public/teams/Karolina%20Kaos%20Logo.png",
        "MGG": f"{SUPABASE_URL}/storage/v1/object/public/teams/Minnesota%20Golden%20Gophers%20Logo.png",
        "MHA": f"{SUPABASE_URL}/storage/v1/object/public/teams/Maryhill%20Alumni%20Logo.png",
        "MHT": f"{SUPABASE_URL}/storage/v1/object/public/teams/Minhattrick%20Swayzes%20Logo%20S13.png",
        "NBK": f"{SUPABASE_URL}/storage/v1/object/public/teams/North%20Bay%20Knights%20Logo.png",
        "OCW": f"{SUPABASE_URL}/storage/v1/object/public/teams/Orange%20County%20Weststars%20Logo.png",
        "PIT": f"{SUPABASE_URL}/storage/v1/object/public/teams/Pitt%20Intramurals%20Logo.png",
        "PRO": f"{SUPABASE_URL}/storage/v1/object/public/teams/Providence%20Sea%20Bass%20Logo.png",
        "RIC": f"{SUPABASE_URL}/storage/v1/object/public/teams/Richfield%20Oracles%20Logo.png",
        "ROC": f"{SUPABASE_URL}/storage/v1/object/public/teams/Rockford%20Villains%20Logo.png",
        "SHS": f"{SUPABASE_URL}/storage/v1/object/public/teams/South%20Hills%20Shindigaz%20Logo.png",
        "SUM": f"{SUPABASE_URL}/storage/v1/object/public/teams/Sumter%20Trash%20Logo.png",
        "SVF": f"{SUPABASE_URL}/storage/v1/object/public/teams/Sugar%20Valley%20Firebirds%20Logo%20S3.png",
        "TAI": f"{SUPABASE_URL}/storage/v1/object/public/teams/Taipei%20Typhoons%20Logo.png",
        "TBP": f"{SUPABASE_URL}/storage/v1/object/public/teams/Thunder%20Bay%20Pike%20Logo.png",
        "TEG": f"{SUPABASE_URL}/storage/v1/object/public/teams/Tegucigalpa%20Ticklepuss%20Logo.png",
        "VHV": f"{SUPABASE_URL}/storage/v1/object/public/teams/Valhalla%20Vikings%20Logo.png",
        "WDY": f"{SUPABASE_URL}/storage/v1/object/public/teams/Woodlynne%20Rats%20Logo.png",
        "BOS": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/boston_bruins%201927.png",
        "CHI": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/chicago_black_hawks%201927.png",
        "DET": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/detroit_cougars%201927.png",
        "DTC": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/detroit_cougars%201927.png",
        "MTL": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/montreal_canadiens%201927.png",
        "NYR": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/new_york_rangers%201927.png",
        "TOR": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/toronto_maple_leafs%201927.png",
    }

    def get_standings_logo(abbr_code: str, custom_url: str = ""):
        candidates = []
        if abbr_code in TEAM_SMALL_LOGO_URLS:
            candidates.append(TEAM_SMALL_LOGO_URLS[abbr_code])
        if custom_url:
            candidates.append(custom_url.replace(" ", "%20"))
        candidates.append(f"{SUPABASE_URL}/storage/v1/object/public/Team%20Logos/{abbr_code}.png")
        for u in candidates:
            im = _fetch_pil_image(u)
            if im is not None:
                return im
        return None

    st_title = f"{league_code} ({year_num}) League Standings" if year_num else f"{league_code} League Standings"
    draw.text((6, 12), st_title, fill=GREEN, font=f_title)

    hy = 34
    st_headers = [
        ("#", 16, "ra"),
        ("Team", 22, "la"),
        ("Coach", 54, "la"),
        ("GP", 214, "ra"),
        ("W", 238, "ra"),
        ("L", 260, "ra"),
        ("T", 280, "ra"),
        ("OTL", 306, "ra"),
        ("PTS", 334, "ra"),
        ("GF", 360, "ra"),
        ("GA", 386, "ra"),
        ("GD", 416, "ra"),
        ("STRK", 444, "ra"),
    ]
    for label, cx, anc in st_headers:
        draw.text((cx, hy), label, fill=WHITE, font=f_row, anchor=anc)
    draw.line([(4, hy + 13), (446, hy + 13)], fill=RULE, width=1)

    ry = hy + 17
    for idx, st in enumerate(standings_sorted, start=1):
        tid = int(st.get("team_id") or 0)
        t_meta = team_map.get(tid, {})
        abbr = t_meta.get("abbreviation") or "TM"
        cname = t_meta.get("coach_name") or "-"
        gp = int(st.get("gp") or 0)
        w = int(st.get("w") or 0)
        l_val = int(st.get("l") or 0)
        t_val = int(st.get("t") or 0)
        otl = int(st.get("otl") or 0)
        pts = int(st.get("pts") or 0)
        gf = int(st.get("gf") or 0)
        ga = int(st.get("ga") or 0)
        gd = int(st.get("gd") if st.get("gd") is not None else (gf - ga))
        gd_str = f"+{gd}" if gd > 0 else str(gd)
        strk = str(st.get("strk") or "-")

        draw.text((16, ry), str(idx), fill=WHITE, font=f_row, anchor="ra")
        logo_im = get_standings_logo(abbr, t_meta.get("logo_url") or "")
        if logo_im is not None:
            lw, lh = 16, 13
            l_resized = logo_im.resize((lw, lh), Image.Resampling.LANCZOS)
            img.paste(l_resized, (25, ry - 1), l_resized)
        else:
            draw.text((22, ry), abbr[:3], fill=GREEN, font=f_row, anchor="la")

        draw.text((54, ry), cname[:22], fill=WHITE, font=f_row, anchor="la")
        for val, cx in [
            (str(gp), 214),
            (str(w), 238),
            (str(l_val), 260),
            (str(t_val), 280),
            (str(otl), 306),
            (str(pts), 334),
            (str(gf), 360),
            (str(ga), 386),
            (gd_str, 416),
            (strk[:4], 444),
        ]:
            draw.text((cx, ry), val, fill=GREEN if cx == 334 else WHITE, font=f_row, anchor="ra")
        ry += 14

    # =========================================================
    # 2. RIGHT TOP PANEL: TOP 15 SCORERS (x=518..1020)
    # =========================================================
    draw.text((770, 6), "Top 15 Scorers", fill=GREEN, font=f_title, anchor="ma")
    shy = 22
    sc_headers = [
        ("#", 530, "ra"),
        ("Player", 536, "la"),
        ("Team", 696, "la"),
        ("GP", 748, "ra"),
        ("G", 778, "ra"),
        ("A", 808, "ra"),
        ("PTS", 842, "ra"),
        ("SOG", 878, "ra"),
        ("CHK", 914, "ra"),
        ("PIM", 948, "ra"),
        ("PPP", 982, "ra"),
        ("SHP", 1018, "ra"),
    ]
    for label, cx, anc in sc_headers:
        draw.text((cx, shy), label, fill=WHITE, font=f_row, anchor=anc)
    draw.line([(518, shy + 13), (1022, shy + 13)], fill=RULE, width=1)

    sry = shy + 17
    for idx, sc in enumerate(top_scorers, start=1):
        draw.text((530, sry), str(idx), fill=WHITE, font=f_row, anchor="ra")
        draw.text((536, sry), sc["name"][:22], fill=WHITE, font=f_row, anchor="la")
        draw.text((696, sry), sc["team"][:3], fill=GREEN, font=f_row, anchor="la")
        for val, cx in [
            (str(sc["gp"]), 748),
            (str(sc["g"]), 778),
            (str(sc["a"]), 808),
            (str(sc["pts"]), 842),
            (str(sc["sog"]), 878),
            (str(sc["chk"]), 914),
            (str(sc["pim"]), 948),
            (str(sc["ppp"]), 982),
            (str(sc["shp"]), 1018),
        ]:
            draw.text((cx, sry), val, fill=GREEN if cx == 842 else WHITE, font=f_row, anchor="ra")
        sry += 14

    # =========================================================
    # 3. RIGHT BOTTOM PANEL: TOP 15 GOALIES (x=518..1020)
    # =========================================================
    ghy = 278
    draw.text((770, ghy - 16), "Top 15 Goalies", fill=GREEN, font=f_title, anchor="ma")
    gl_headers = [
        ("#", 530, "ra"),
        ("Goalie", 536, "la"),
        ("Team", 696, "la"),
        ("GP", 740, "ra"),
        ("W", 766, "ra"),
        ("L", 790, "ra"),
        ("T", 812, "ra"),
        ("GA", 840, "ra"),
        ("SV", 872, "ra"),
        ("SH", 906, "ra"),
        ("SV%", 950, "ra"),
        ("GAA", 990, "ra"),
        ("SO", 1018, "ra"),
    ]
    for label, cx, anc in gl_headers:
        draw.text((cx, ghy), label, fill=WHITE, font=f_row, anchor=anc)
    draw.line([(518, ghy + 13), (1022, ghy + 13)], fill=RULE, width=1)

    gry = ghy + 17
    for idx, gl in enumerate(top_goalies, start=1):
        sv_pct = (gl["sv"] / gl["sh"]) if gl["sh"] > 0 else 0.0
        sv_str = "1.000" if sv_pct >= 0.9995 else f"{sv_pct:.3f}"[1:]
        gaa = (gl["ga"] / gl["gp"]) if gl["gp"] > 0 else 0.0
        gaa_str = f"{gaa:.2f}"

        draw.text((530, gry), str(idx), fill=WHITE, font=f_row, anchor="ra")
        draw.text((536, gry), gl["name"][:22], fill=WHITE, font=f_row, anchor="la")
        draw.text((696, gry), gl["team"][:3], fill=GREEN, font=f_row, anchor="la")
        for val, cx in [
            (str(gl["gp"]), 740),
            (str(gl["w"]), 766),
            (str(gl["l"]), 790),
            (str(gl["t"]), 812),
            (str(gl["ga"]), 840),
            (str(gl["sv"]), 872),
            (str(gl["sh"]), 906),
            (sv_str, 950),
            (gaa_str, 990),
            (str(gl["so"]), 1018),
        ]:
            draw.text((cx, gry), val, fill=GREEN if cx in (766, 950) else WHITE, font=f_row, anchor="ra")
        gry += 14

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def render_playoff_bracket_png(season_id: int) -> Optional[bytes]:
    """
    Renders the complete Playoff Bracket graphic (playoff_bracket.png) for season_id,
    matching the /playoffs page with Conference strips, Matchup Cards (Seed, Team Logo + Coach Name,
    Game 1-7 scores, Series Wins W), Bracket Connectors, and the Cup Trophy + Champion Showcase.
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return None

    s_id = int(season_id)
    league_code = get_league_code(s_id)
    year_num = SEASON_ID_TO_YEAR.get(s_id, 2013)
    is_o6 = league_code.upper().startswith("O") or s_id == 39 or (54 <= s_id <= 70)

    try:
        raw_playoffs = supabase.select(
            "league_playoffs",
            {"select": "*", "league_id": f"eq.{s_id}", "order": "playoff_id.asc"},
        ) or []
    except Exception:
        raw_playoffs = []

    try:
        raw_po_games = supabase.select(
            "league_playoff_gamestats",
            {"select": "*", "league_id": f"eq.{s_id}", "order": "game_id.asc"},
        ) or []
    except Exception:
        raw_po_games = []

    try:
        all_teams = supabase.select("league_teams", {"select": "*"}) or []
    except Exception:
        all_teams = []

    try:
        all_coaches = supabase.select("league_coaches", {"select": "coach_id,coach_name"}) or []
    except Exception:
        all_coaches = []

    try:
        reg_games = supabase.select(
            "league_gamestats",
            {"select": "game_id,home_team_id,away_team_id,home_score,away_score,game_meta,home_coach,away_coach", "league_id": f"eq.{s_id}"},
        ) or []
    except Exception:
        reg_games = []

    try:
        reg_standings = supabase.select("league_standings", {"select": "*", "season_id": f"eq.{s_id}"}) or []
    except Exception:
        reg_standings = []

    coaches_map: Dict[int, str] = {}
    for c in all_coaches:
        if c.get("coach_id") is not None and c.get("coach_name"):
            coaches_map[int(c["coach_id"])] = str(c["coach_name"]).strip()

    teams_map: Dict[int, Dict[str, Any]] = {}
    for t in all_teams:
        if t.get("team_id") is None:
            continue
        tid = int(t["team_id"])
        existing = teams_map.get(tid)
        if not existing or int(t.get("league_id") or 0) == s_id:
            teams_map[tid] = t

    game_coach_by_team: Dict[int, str] = {}
    for g in (reg_games + raw_po_games):
        if g.get("home_team_id") and g.get("home_coach"):
            game_coach_by_team[int(g["home_team_id"])] = str(g["home_coach"]).strip()
        if g.get("away_team_id") and g.get("away_coach"):
            game_coach_by_team[int(g["away_team_id"])] = str(g["away_coach"]).strip()

    def build_team_info(team_id: Optional[int]) -> Optional[Dict[str, Any]]:
        if not team_id:
            return None
        tid = int(team_id)
        t_obj = teams_map.get(tid) or {}
        abbr = str(t_obj.get("abbreviation") or "").strip().upper()
        t_name = str(t_obj.get("team_name") or abbr or f"Team #{tid}").strip()

        c_name = None
        c_id = int(t_obj.get("coach_id") or 0)
        if c_id and c_id in coaches_map:
            c_name = coaches_map[c_id]
        if not c_name and t_obj.get("coach_name"):
            c_name = str(t_obj["coach_name"]).strip()
        if not c_name and tid in game_coach_by_team:
            c_name = game_coach_by_team[tid]
        if not c_name and abbr in W_LEAGUE_COACH_MAP:
            c_name = W_LEAGUE_COACH_MAP[abbr].get("coach_name")
        if not c_name and abbr in TEAM_DISCORD_META:
            c_name = TEAM_DISCORD_META[abbr].get("nick")
        if not c_name:
            c_name = t_name

        logo_url = t_obj.get("logo_url") or TEAM_DISCORD_META.get(abbr, {}).get("logo")
        return {
            "team_id": tid,
            "team_name": t_name,
            "abbreviation": abbr or t_name[:3].upper(),
            "coach_name": c_name,
            "logo_url": logo_url,
        }

    # Compute seeds from regular season
    active_tids = set()
    for t in all_teams:
        if int(t.get("league_id") or 0) == s_id and int(t.get("team_id") or 0) not in (0, 68, 999):
            active_tids.add(int(t["team_id"]))
    for g in reg_games:
        for k in ("home_team_id", "away_team_id"):
            v = int(g.get(k) or 0)
            if v not in (0, 68, 999):
                active_tids.add(v)
    for st in reg_standings:
        v = int(st.get("team_id") or 0)
        if v not in (0, 68, 999):
            active_tids.add(v)

    team_records: Dict[int, Dict[str, Any]] = {}
    for tid in active_tids:
        meta = teams_map.get(tid) or {}
        conf_raw = str(meta.get("conference") or "").lower()
        div_raw = str(meta.get("division") or "").lower()
        is_west = any(w in conf_raw for w in ("west", "campbell")) or any(w in div_raw for w in ("west", "central", "pacific"))
        team_records[tid] = {
            "team_id": tid,
            "conference": "west" if is_west else "east",
            "gp": 0, "w": 0, "l": 0, "t": 0, "otl": 0, "pts": 0, "gf": 0, "ga": 0, "gd": 0,
        }

    if reg_standings:
        for st in reg_standings:
            tid = int(st.get("team_id") or 0)
            if tid in team_records:
                rec = team_records[tid]
                rec["gp"] = int(st.get("gp") or 0)
                rec["w"] = int(st.get("w") or 0)
                rec["l"] = int(st.get("l") or 0)
                rec["t"] = int(st.get("t") or 0)
                rec["otl"] = int(st.get("otl") or 0)
                rec["pts"] = int(st.get("pts") if st.get("pts") is not None else (rec["w"] * 2 + rec["t"]))
                rec["gf"] = int(st.get("gf") or 0)
                rec["ga"] = int(st.get("ga") or 0)
                rec["gd"] = rec["gf"] - rec["ga"]
                if st.get("conference"):
                    c_low = str(st["conference"]).lower()
                    if "west" in c_low or "campbell" in c_low:
                        rec["conference"] = "west"
                    elif "east" in c_low or "wales" in c_low:
                        rec["conference"] = "east"

    all_ranked = sorted(
        team_records.values(),
        key=lambda r: (-r["pts"], -r["w"], -r["gd"], -r["gf"], r["team_id"]),
    )
    east_ranked = [r for r in all_ranked if r["conference"] == "east"]
    west_ranked = [r for r in all_ranked if r["conference"] == "west"]
    has_two_confs = len(east_ranked) >= 3 and len(west_ranked) >= 3

    seed_by_tid: Dict[int, int] = {}
    if has_two_confs:
        for idx, r in enumerate(east_ranked):
            seed_by_tid[r["team_id"]] = idx + 1
        for idx, r in enumerate(west_ranked):
            seed_by_tid[r["team_id"]] = idx + 1
    else:
        for idx, r in enumerate(all_ranked):
            seed_by_tid[r["team_id"]] = idx + 1

    has_seeded_po = any(bool(m.get("home_team_id") or m.get("away_team_id")) for m in raw_playoffs) or len(raw_po_games) > 0
    is_projected = not has_seeded_po

    compiled_matches: List[Dict[str, Any]] = []
    if not has_seeded_po and all_ranked:
        if is_o6 and len(all_ranked) >= 4:
            s1, s2, s3, s4 = all_ranked[0], all_ranked[1], all_ranked[2], all_ranked[3]
            compiled_matches = [
                {
                    "match_label": "Conference Finals 1",
                    "round_name": "Conference Finals 1",
                    "series_length": 7,
                    "home_team_id": s1["team_id"],
                    "away_team_id": s4["team_id"],
                    "home_team_seed": 1,
                    "away_team_seed": 4,
                    "home_team": build_team_info(s1["team_id"]),
                    "away_team": build_team_info(s4["team_id"]),
                    "results": [],
                },
                {
                    "match_label": "Conference Finals 2",
                    "round_name": "Conference Finals 2",
                    "series_length": 7,
                    "home_team_id": s2["team_id"],
                    "away_team_id": s3["team_id"],
                    "home_team_seed": 2,
                    "away_team_seed": 3,
                    "home_team": build_team_info(s2["team_id"]),
                    "away_team": build_team_info(s3["team_id"]),
                    "results": [],
                },
                {"match_label": "Finals", "round_name": "Finals", "series_length": 7, "results": []},
            ]
        else:
            e_list = east_ranked if has_two_confs else all_ranked[0::2]
            w_list = west_ranked if has_two_confs else all_ranked[1::2]
            qf_pairs = [
                ("Quarter Finals 1", e_list[0] if len(e_list) > 0 else None, e_list[7] if len(e_list) > 7 else None, 1, 8),
                ("Quarter Finals 2", e_list[1] if len(e_list) > 1 else None, e_list[6] if len(e_list) > 6 else None, 2, 7),
                ("Quarter Finals 3", e_list[2] if len(e_list) > 2 else None, e_list[5] if len(e_list) > 5 else None, 3, 6),
                ("Quarter Finals 4", e_list[3] if len(e_list) > 3 else None, e_list[4] if len(e_list) > 4 else None, 4, 5),
                ("Quarter Finals 5", w_list[0] if len(w_list) > 0 else None, w_list[7] if len(w_list) > 7 else None, 1, 8),
                ("Quarter Finals 6", w_list[1] if len(w_list) > 1 else None, w_list[6] if len(w_list) > 6 else None, 2, 7),
                ("Quarter Finals 7", w_list[2] if len(w_list) > 2 else None, w_list[5] if len(w_list) > 5 else None, 3, 6),
                ("Quarter Finals 8", w_list[3] if len(w_list) > 3 else None, w_list[4] if len(w_list) > 4 else None, 4, 5),
            ]
            for lbl, top_r, bot_r, ts, bs in qf_pairs:
                compiled_matches.append({
                    "match_label": lbl,
                    "round_name": lbl,
                    "series_length": 7,
                    "home_team_id": top_r["team_id"] if top_r else None,
                    "away_team_id": bot_r["team_id"] if bot_r else None,
                    "home_team_seed": ts,
                    "away_team_seed": bs,
                    "home_team": build_team_info(top_r["team_id"]) if top_r else None,
                    "away_team": build_team_info(bot_r["team_id"]) if bot_r else None,
                    "results": [],
                })
            for lbl in ("Semi Finals 1", "Semi Finals 2", "Semi Finals 3", "Semi Finals 4", "Conference Finals 1", "Conference Finals 2", "Finals"):
                compiled_matches.append({"match_label": lbl, "round_name": lbl, "series_length": 7, "results": []})
    else:
        for m in raw_playoffs:
            pid = int(m.get("playoff_id") or m.get("id") or 0)
            m_games = [
                {
                    "game_number": int(g.get("game_num") or g.get("game_number") or 1),
                    "home_score": int(g.get("home_score") or 0),
                    "away_score": int(g.get("away_score") or 0),
                    "home_team_id": int(g.get("home_team_id") or 0),
                    "away_team_id": int(g.get("away_team_id") or 0),
                    "game_meta": g.get("game_meta"),
                    "game_results": g.get("game_results"),
                }
                for g in raw_po_games
                if int(g.get("playoff_id") or 0) == pid
            ]
            m_games.sort(key=lambda x: x["game_number"])
            eff_home = int(m.get("home_team_id") or (m_games[0]["home_team_id"] if m_games else 0)) or None
            eff_away = int(m.get("away_team_id") or (m_games[0]["away_team_id"] if m_games else 0)) or None
            h_seed = m.get("home_team_seed") if m.get("home_team_seed") is not None else (seed_by_tid.get(eff_home) if eff_home else None)
            a_seed = m.get("away_team_seed") if m.get("away_team_seed") is not None else (seed_by_tid.get(eff_away) if eff_away else None)
            compiled_matches.append({
                "playoff_id": pid,
                "match_label": m.get("match_label") or m.get("round_name") or f"Series {pid}",
                "round_name": m.get("round_name") or m.get("match_label") or f"Series {pid}",
                "series_length": int(m.get("series_length") or 7),
                "winner_id": int(m["winner_id"]) if m.get("winner_id") else None,
                "home_team_id": eff_home,
                "away_team_id": eff_away,
                "home_team_seed": h_seed,
                "away_team_seed": a_seed,
                "home_team": build_team_info(eff_home),
                "away_team": build_team_info(eff_away),
                "results": m_games,
            })

    def norm_str(val: Any) -> str:
        return re.sub(r"[\s\-_]+", "", str(val or "")).lower()

    def series_details(m: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        if not m:
            return {"homeWins": 0, "awayWins": 0, "winsNeeded": 4, "isComplete": False, "winner": None, "seriesLength": 7, "games": []}
        s_len = int(m.get("series_length") or 7)
        needed = math.ceil(s_len / 2.0)
        p_home = m.get("home_team_id")
        p_away = m.get("away_team_id")
        games = m.get("results") or []
        hw = 0
        aw = 0
        for g in games:
            top_s = g["home_score"] if g["home_team_id"] == p_home else g["away_score"]
            bot_s = g["away_score"] if g["away_team_id"] == p_away else g["home_score"]
            if top_s > bot_s:
                hw += 1
            elif bot_s > top_s:
                aw += 1
        is_comp = hw >= needed or aw >= needed
        win_side = "home" if hw >= needed else ("away" if aw >= needed else None)
        return {
            "homeWins": hw,
            "awayWins": aw,
            "winsNeeded": needed,
            "isComplete": is_comp,
            "winner": win_side,
            "seriesLength": s_len,
            "games": games,
        }

    def find_or_create_match(label: str, default_len: int = 7) -> Dict[str, Any]:
        t_norm = norm_str(label)
        for m in compiled_matches:
            if norm_str(m.get("match_label")) == t_norm or norm_str(m.get("round_name")) == t_norm:
                return m
        new_m = {"match_label": label, "round_name": label, "series_length": default_len, "results": []}
        compiled_matches.append(new_m)
        return new_m

    def get_winner_from_match(m: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not m:
            return None
        det = series_details(m)
        if det["isComplete"] and det["winner"]:
            if det["winner"] == "home" and m.get("home_team_id") and m.get("home_team"):
                return {
                    "team_id": int(m["home_team_id"]),
                    "seed": int(m.get("home_team_seed") or seed_by_tid.get(int(m["home_team_id"])) or 99),
                    "team": m["home_team"],
                }
            if det["winner"] == "away" and m.get("away_team_id") and m.get("away_team"):
                return {
                    "team_id": int(m["away_team_id"]),
                    "seed": int(m.get("away_team_seed") or seed_by_tid.get(int(m["away_team_id"])) or 99),
                    "team": m["away_team"],
                }
        if m.get("winner_id"):
            wid = int(m["winner_id"])
            if wid == int(m.get("home_team_id") or 0) and m.get("home_team"):
                return {"team_id": wid, "seed": int(m.get("home_team_seed") or seed_by_tid.get(wid) or 99), "team": m["home_team"]}
            if wid == int(m.get("away_team_id") or 0) and m.get("away_team"):
                return {"team_id": wid, "seed": int(m.get("away_team_seed") or seed_by_tid.get(wid) or 99), "team": m["away_team"]}
        return None

    def advance_bracket_pair(target_lbl: str, top_lbl: str, bot_lbl: str) -> None:
        target_m = find_or_create_match(target_lbl)
        if target_m.get("results") or []:
            return
        w_top = get_winner_from_match(next((m for m in compiled_matches if norm_str(m.get("match_label")) == norm_str(top_lbl) or norm_str(m.get("round_name")) == norm_str(top_lbl)), None))
        w_bot = get_winner_from_match(next((m for m in compiled_matches if norm_str(m.get("match_label")) == norm_str(bot_lbl) or norm_str(m.get("round_name")) == norm_str(bot_lbl)), None))

        if w_top and w_bot:
            ordered = sorted([w_top, w_bot], key=lambda x: x["seed"])
            target_m["home_team_id"] = int(ordered[0]["team_id"])
            target_m["home_team_seed"] = ordered[0]["seed"] if ordered[0]["seed"] != 99 else None
            target_m["home_team"] = ordered[0]["team"]
            target_m["away_team_id"] = int(ordered[1]["team_id"])
            target_m["away_team_seed"] = ordered[1]["seed"] if ordered[1]["seed"] != 99 else None
            target_m["away_team"] = ordered[1]["team"]
            return

        single_adv = w_top or w_bot
        if not single_adv:
            return
        adv_tid = int(single_adv["team_id"])
        if int(target_m.get("home_team_id") or 0) == adv_tid or int(target_m.get("away_team_id") or 0) == adv_tid:
            return

        pref_side = "home" if w_top else "away"
        if pref_side == "home" and not target_m.get("home_team_id"):
            target_m["home_team_id"] = adv_tid
            target_m["home_team_seed"] = single_adv["seed"] if single_adv["seed"] != 99 else None
            target_m["home_team"] = single_adv["team"]
        elif pref_side == "away" and not target_m.get("away_team_id"):
            target_m["away_team_id"] = adv_tid
            target_m["away_team_seed"] = single_adv["seed"] if single_adv["seed"] != 99 else None
            target_m["away_team"] = single_adv["team"]
        elif not target_m.get("home_team_id"):
            target_m["home_team_id"] = adv_tid
            target_m["home_team_seed"] = single_adv["seed"] if single_adv["seed"] != 99 else None
            target_m["home_team"] = single_adv["team"]
        elif not target_m.get("away_team_id"):
            target_m["away_team_id"] = adv_tid
            target_m["away_team_seed"] = single_adv["seed"] if single_adv["seed"] != 99 else None
            target_m["away_team"] = single_adv["team"]

    # Auto-advance completed rounds by bracket fork pairs
    has_qf = any("quarterfinals" in norm_str(m.get("match_label")) for m in compiled_matches)
    if has_qf:
        advance_bracket_pair("Semi Finals 1", "Quarter Finals 1", "Quarter Finals 2")
        advance_bracket_pair("Semi Finals 2", "Quarter Finals 3", "Quarter Finals 4")
        advance_bracket_pair("Semi Finals 3", "Quarter Finals 5", "Quarter Finals 6")
        advance_bracket_pair("Semi Finals 4", "Quarter Finals 7", "Quarter Finals 8")

    advance_bracket_pair("Conference Finals 1", "Semi Finals 1", "Semi Finals 2")
    advance_bracket_pair("Conference Finals 2", "Semi Finals 3", "Semi Finals 4")
    advance_bracket_pair("Finals", "Conference Finals 1", "Conference Finals 2")

    def get_match(search_lbl: str) -> Dict[str, Any]:
        tn = norm_str(search_lbl)
        for m in compiled_matches:
            if norm_str(m.get("match_label")) == tn or norm_str(m.get("round_name")) == tn:
                return m
        for m in compiled_matches:
            if tn in norm_str(m.get("match_label")) or norm_str(m.get("match_label")) in tn:
                return m
        return {"match_label": search_lbl, "results": []}

    # Cup metadata
    first_let = league_code[0].upper() if league_code else "W"
    if first_let == "W":
        cup_title = "BRULE CUP"
        cup_file = "brule_cup.png"
    elif first_let == "Q":
        cup_title = "Q CUP"
        cup_file = "q_cup.png"
    elif first_let == "V":
        cup_title = "GRAIL CUP"
        cup_file = "grail_cup.png"
    else:
        cup_title = "STANLEY CUP"
        cup_file = "stanley_cup.png"

    cup_url = f"{SUPABASE_URL}/storage/v1/object/public/awards/{cup_file}"

    # Determine bracket format
    is_small_bracket = len(compiled_matches) <= 6 and not has_qf

    # Fonts & image fetch helpers
    def load_bracket_font(size: int, bold: bool = False):
        candidates = (
            [
                "C:/Windows/Fonts/verdanab.ttf",
                "C:/Windows/Fonts/tahomabd.ttf",
                "C:/Windows/Fonts/arialbd.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            ]
            if bold
            else [
                "C:/Windows/Fonts/verdana.ttf",
                "C:/Windows/Fonts/tahoma.ttf",
                "C:/Windows/Fonts/arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            ]
        )
        for p in candidates:
            if os.path.isfile(p):
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    pass
        return ImageFont.load_default()

    f_title = load_bracket_font(20, bold=True)
    f_sub = load_bracket_font(11, bold=True)
    f_round_hdr = load_bracket_font(11, bold=True)
    f_card_hdr = load_bracket_font(9, bold=True)
    f_seed = load_bracket_font(10, bold=True)
    f_coach = load_bracket_font(10, bold=True)
    f_score = load_bracket_font(10, bold=False)
    f_score_b = load_bracket_font(10, bold=True)
    f_wins = load_bracket_font(11, bold=True)
    f_cup = load_bracket_font(11, bold=True)

    CARD_W = 264
    CARD_H = 60
    ROW_H = 72
    total_rows = 5 if is_small_bracket else 15
    W = 1024 if is_small_bracket else 1440
    TOP_Y = 82
    H = TOP_Y + total_rows * ROW_H + 34

    img = Image.new("RGBA", (W, H), (248, 250, 252, 255))
    draw = ImageDraw.Draw(img)

    # Top Masthead Header Bar
    draw.rectangle([0, 0, W, 62], fill=(15, 23, 42, 255))
    draw.line([(0, 62), (W, 62)], fill=(245, 158, 11, 255), width=3)

    draw.text(
        (20, 14),
        f"{cup_title} PLAYOFFS • {league_code} ({year_num}) OFFICIAL BRACKET",
        fill=(255, 255, 255, 255),
        font=f_title,
        anchor="la",
    )
    status_badge_txt = (
        "LIVE PLAYOFF PICTURE (PROJECTED SEEDS)"
        if is_projected
        else "OFFICIAL TOURNAMENT TREE • AUTO-ADVANCING BY CONFERENCE SEED"
    )
    draw.text(
        (20, 42),
        status_badge_txt,
        fill=(251, 191, 36, 255),
        font=f_sub,
        anchor="la",
    )

    logo_cache: Dict[str, Any] = {}

    def get_cached_img(url: Optional[str], max_w: int, max_h: int):
        if not url:
            return None
        key = f"{url}_{max_w}x{max_h}"
        if key in logo_cache:
            return logo_cache[key]
        try:
            safe_u = url.replace(" ", "%20")
            req = urllib.request.Request(safe_u, headers={"User-Agent": "NHL95Bot/1.0"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                im = Image.open(io.BytesIO(resp.read())).convert("RGBA")
                im.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
                logo_cache[key] = im
                return im
        except Exception:
            logo_cache[key] = None
            return None

    def center_y(row_idx: float) -> int:
        return int(TOP_Y + (row_idx + 0.5) * ROW_H)

    def draw_matchup_card(x: int, row_idx: float, match_obj: Dict[str, Any], conf: str = "east", is_champ: bool = False):
        cy = center_y(row_idx)
        y = cy - CARD_H // 2
        det = series_details(match_obj)
        p_home = match_obj.get("home_team_id")
        p_away = match_obj.get("away_team_id")
        h_team = match_obj.get("home_team") or {}
        a_team = match_obj.get("away_team") or {}
        h_seed = match_obj.get("home_team_seed")
        a_seed = match_obj.get("away_team_seed")
        games = det["games"]

        is_h_win = det["isComplete"] and det["winner"] == "home"
        is_a_win = det["isComplete"] and det["winner"] == "away"

        border_col = (217, 119, 6, 255) if is_champ else (15, 23, 42, 255)
        draw.rectangle([x, y, x + CARD_W, y + CARD_H], fill=(255, 255, 255, 255), outline=border_col, width=2 if is_champ else 1)

        # Header row (14px)
        hdr_h = 14
        draw.rectangle([x + 1, y + 1, x + CARD_W - 1, y + hdr_h], fill=(241, 245, 249, 255))
        draw.line([(x, y + hdr_h), (x + CARD_W, y + hdr_h)], fill=(203, 213, 225, 255), width=1)

        seed_w = 22
        game_w = 15
        wins_w = 22
        team_w = CARD_W - seed_w - (7 * game_w) - wins_w

        draw.text((x + seed_w // 2, y + 2), "#", fill=(100, 116, 139, 255), font=f_card_hdr, anchor="ma")
        draw.text((x + seed_w + 4, y + 2), "LOGO / COACH", fill=(100, 116, 139, 255), font=f_card_hdr, anchor="la")
        for g_i in range(7):
            gx = x + seed_w + team_w + g_i * game_w
            draw.line([(gx, y + 1), (gx, y + CARD_H - 1)], fill=(226, 232, 240, 255), width=1)
            draw.text((gx + game_w // 2, y + 2), str(g_i + 1), fill=(100, 116, 139, 255), font=f_card_hdr, anchor="ma")

        wx = x + CARD_W - wins_w
        draw.line([(wx, y + 1), (wx, y + CARD_H - 1)], fill=(15, 23, 42, 255), width=2)
        draw.text((wx + wins_w // 2, y + 2), "W", fill=(15, 23, 42, 255), font=f_card_hdr, anchor="ma")

        seed_bg = (
            (30, 58, 138, 255)
            if conf == "west"
            else ((131, 24, 67, 255) if conf == "east" else (23, 23, 23, 255))
        )
        seed_fg = (253, 224, 71, 255) if conf == "finals" else (255, 255, 255, 255)

        row_h = (CARD_H - hdr_h) // 2
        for idx_side, (t_info, seed_val, is_winner, wins_cnt, is_top) in enumerate([
            (h_team, h_seed, is_h_win, det["homeWins"], True),
            (a_team, a_seed, is_a_win, det["awayWins"], False),
        ]):
            ry = y + hdr_h + idx_side * row_h
            ry_bot = y + CARD_H - 1 if idx_side == 1 else ry + row_h

            if is_winner:
                r_bg = (219, 234, 254, 255) if conf == "west" else ((255, 228, 230, 255) if conf == "east" else (254, 243, 199, 255))
            else:
                r_bg = (248, 250, 252, 255) if conf == "west" else ((255, 250, 250, 255) if conf == "east" else (255, 255, 255, 255))

            draw.rectangle([x + 1, ry + 1, x + CARD_W - 1, ry_bot], fill=r_bg)
            # Seed cell
            draw.rectangle([x + 1, ry + 1, x + seed_w, ry_bot], fill=seed_bg)
            s_txt = str(seed_val) if seed_val is not None and seed_val != "" else "—"
            draw.text((x + seed_w // 2, ry + 5), s_txt, fill=seed_fg, font=f_seed, anchor="ma")

            # Team Logo + Coach Name only
            tx = x + seed_w + 3
            logo_im = get_cached_img(t_info.get("logo_url"), 20, 18)
            if logo_im is not None:
                ly = ry + (row_h - logo_im.height) // 2
                img.paste(logo_im, (tx, ly), logo_im)
                tx += logo_im.width + 4

            c_label = str(t_info.get("coach_name") or t_info.get("team_name") or "TBD").strip()
            max_c_px = (x + seed_w + team_w - 3) - tx
            while len(c_label) > 3 and draw.textlength(c_label, font=f_coach) > max_c_px:
                c_label = c_label[:-1]
            c_col = (10, 10, 10, 255) if is_winner else ((30, 41, 59, 255) if t_info else (148, 163, 184, 255))
            draw.text((tx, ry + 5), c_label, fill=c_col, font=f_coach, anchor="la")

            # Game 1..7 cells
            for g_i in range(7):
                gx = x + seed_w + team_w + g_i * game_w
                draw.line([(gx, ry), (gx, ry_bot)], fill=(226, 232, 240, 255), width=1)
                g_res = next((g for g in games if g["game_number"] == g_i + 1), None)
                if g_res:
                    top_s = g_res["home_score"] if g_res["home_team_id"] == p_home else g_res["away_score"]
                    bot_s = g_res["away_score"] if g_res["away_team_id"] == p_away else g_res["home_score"]
                    my_s = top_s if is_top else bot_s
                    opp_s = bot_s if is_top else top_s
                    won_g = my_s > opp_s
                    draw.text(
                        (gx + game_w // 2, ry + 5),
                        str(my_s),
                        fill=(0, 0, 0, 255) if won_g else (100, 116, 139, 255),
                        font=f_score_b if won_g else f_score,
                        anchor="ma",
                    )

            # Wins cell
            if is_winner:
                draw.rectangle([wx + 1, ry + 1, x + CARD_W - 1, ry_bot], fill=(15, 23, 42, 255))
                w_fg = (253, 224, 71, 255) if is_champ else (255, 255, 255, 255)
            else:
                w_fg = (15, 23, 42, 255)
            draw.line([(wx, ry), (wx, ry_bot)], fill=(15, 23, 42, 255), width=2)
            draw.text((wx + wins_w // 2, ry + 5), str(wins_cnt), fill=w_fg, font=f_wins, anchor="ma")

            if idx_side == 0:
                draw.line([(x + 1, ry + row_h), (x + CARD_W - 1, ry + row_h)], fill=(203, 213, 225, 255), width=1)

    def draw_fork(x1: int, x2: int, row_top: float, row_bot: float, row_mid: float):
        ym1 = center_y(row_top)
        ym2 = center_y(row_bot)
        ym_out = center_y(row_mid)
        x_mid = (x1 + x2) // 2
        col = (15, 23, 42, 255)
        draw.line([(x1, ym1), (x_mid, ym1)], fill=col, width=2)
        draw.line([(x1, ym2), (x_mid, ym2)], fill=col, width=2)
        draw.line([(x_mid, ym1), (x_mid, ym2)], fill=col, width=2)
        draw.line([(x_mid, ym_out), (x2, ym_out)], fill=col, width=2)

    def draw_trophy_box(x: int, y_center: int):
        box_w = 195
        box_h = 185
        by = y_center - box_h // 2
        draw.rounded_rectangle(
            [x, by, x + box_w, by + box_h],
            radius=10,
            fill=(255, 251, 235, 255),
            outline=(245, 158, 11, 255),
            width=2,
        )
        cup_im = get_cached_img(cup_url, 64, 68)
        cur_y = by + 10
        if cup_im is not None:
            img.paste(cup_im, (x + (box_w - cup_im.width) // 2, cur_y), cup_im)
            cur_y += cup_im.height + 6
        else:
            cur_y += 20

        # Pill badge
        pill_w = 150
        pill_x = x + (box_w - pill_w) // 2
        draw.rounded_rectangle([pill_x, cur_y, pill_x + pill_w, cur_y + 20], radius=4, fill=(15, 23, 42, 255))
        draw.text((x + box_w // 2, cur_y + 4), cup_title, fill=(253, 224, 71, 255), font=f_cup, anchor="ma")
        cur_y += 26

        fin_m = get_match("Finals")
        fin_det = series_details(fin_m)
        if fin_det["isComplete"] and fin_det["winner"]:
            champ_team = fin_m.get("home_team") if fin_det["winner"] == "home" else fin_m.get("away_team")
            champ_score = f"{max(fin_det['homeWins'], fin_det['awayWins'])}-{min(fin_det['homeWins'], fin_det['awayWins'])}"
            draw.text((x + box_w // 2, cur_y), "CHAMPION", fill=(146, 64, 14, 255), font=f_card_hdr, anchor="ma")
            cur_y += 13
            if champ_team:
                c_logo = get_cached_img(champ_team.get("logo_url"), 34, 28)
                if c_logo is not None:
                    img.paste(c_logo, (x + (box_w - c_logo.width) // 2, cur_y), c_logo)
                    cur_y += c_logo.height + 3
                c_coach = str(champ_team.get("coach_name") or champ_team.get("team_name") or "").strip()
                draw.text((x + box_w // 2, cur_y), f"Coach: {c_coach[:18]}", fill=(15, 23, 42, 255), font=f_coach, anchor="ma")
                cur_y += 13
            draw.text((x + box_w // 2, cur_y), f"Won Series {champ_score}", fill=(4, 120, 87, 255), font=f_score_b, anchor="ma")
        else:
            draw.text((x + box_w // 2, cur_y + 18), "Awaiting Champion", fill=(100, 116, 139, 255), font=f_coach, anchor="ma")

    if is_small_bracket:
        # 2-Round / Original 6 / 6-Team Layout
        col1_x = 45
        conn1_x = col1_x + CARD_W
        col2_x = conn1_x + 42
        conn2_x = col2_x + CARD_W
        trophy_x = conn2_x + 36

        draw.text((col1_x + CARD_W // 2, 66), "CONFERENCE FINALS / SEMIS", fill=(71, 85, 105, 255), font=f_round_hdr, anchor="ma")
        draw.text((col2_x + CARD_W // 2, 66), "CHAMPIONSHIP FINALS", fill=(180, 83, 9, 255), font=f_round_hdr, anchor="ma")

        draw_matchup_card(col1_x, 0.8, get_match("Conference Finals 1"), "east")
        draw_matchup_card(col1_x, 3.2, get_match("Conference Finals 2"), "west")
        draw_fork(conn1_x, col2_x, 0.8, 3.2, 2.0)
        draw_matchup_card(col2_x, 2.0, get_match("Finals"), "finals", is_champ=True)
        draw.line([(conn2_x, center_y(2.0)), (trophy_x, center_y(2.0))], fill=(15, 23, 42, 255), width=2)
        draw_trophy_box(trophy_x, center_y(2.0))
    else:
        # Full 16-Team 4-Round Bracket Layout
        # Left Conference vertical strips
        strip_x = 12
        strip_w = 24
        east_top = TOP_Y + 6
        east_bot = TOP_Y + 7 * ROW_H - 6
        draw.rounded_rectangle([strip_x, east_top, strip_x + strip_w, east_bot], radius=6, fill=(131, 24, 67, 255))
        draw.text((strip_x + strip_w // 2, (east_top + east_bot) // 2), "EAST", fill=(255, 255, 255, 255), font=f_card_hdr, anchor="mm")

        west_top = TOP_Y + 8 * ROW_H + 6
        west_bot = TOP_Y + 15 * ROW_H - 6
        draw.rounded_rectangle([strip_x, west_top, strip_x + strip_w, west_bot], radius=6, fill=(30, 58, 138, 255))
        draw.text((strip_x + strip_w // 2, (west_top + west_bot) // 2), "WEST", fill=(255, 255, 255, 255), font=f_card_hdr, anchor="mm")

        col1_x = 46
        conn1_x = col1_x + CARD_W
        col2_x = conn1_x + 32
        conn2_x = col2_x + CARD_W
        col3_x = conn2_x + 32
        conn3_x = col3_x + CARD_W
        col4_x = conn3_x + 36
        conn4_x = col4_x + CARD_W
        trophy_x = conn4_x + 28

        draw.text((col1_x + CARD_W // 2, 66), "QUARTERFINALS", fill=(71, 85, 105, 255), font=f_round_hdr, anchor="ma")
        draw.text((col2_x + CARD_W // 2, 66), "SEMIFINALS", fill=(71, 85, 105, 255), font=f_round_hdr, anchor="ma")
        draw.text((col3_x + CARD_W // 2, 66), "CONFERENCE FINALS", fill=(71, 85, 105, 255), font=f_round_hdr, anchor="ma")
        draw.text((col4_x + CARD_W // 2, 66), "CHAMPIONSHIP FINALS", fill=(180, 83, 9, 255), font=f_round_hdr, anchor="ma")

        # Col 1: Quarterfinals (Rows 0, 2, 4, 6 East; Rows 8, 10, 12, 14 West)
        for idx_q, r_row in enumerate([0, 2, 4, 6], start=1):
            draw_matchup_card(col1_x, r_row, get_match(f"Quarter Finals {idx_q}"), "east")
        for idx_q, r_row in enumerate([8, 10, 12, 14], start=5):
            draw_matchup_card(col1_x, r_row, get_match(f"Quarter Finals {idx_q}"), "west")

        # Connectors QF -> SF
        draw_fork(conn1_x, col2_x, 0, 2, 1)
        draw_fork(conn1_x, col2_x, 4, 6, 5)
        draw_fork(conn1_x, col2_x, 8, 10, 9)
        draw_fork(conn1_x, col2_x, 12, 14, 13)

        # Col 2: Semifinals (Rows 1, 5 East; Rows 9, 13 West)
        draw_matchup_card(col2_x, 1, get_match("Semi Finals 1"), "east")
        draw_matchup_card(col2_x, 5, get_match("Semi Finals 2"), "east")
        draw_matchup_card(col2_x, 9, get_match("Semi Finals 3"), "west")
        draw_matchup_card(col2_x, 13, get_match("Semi Finals 4"), "west")

        # Connectors SF -> CF
        draw_fork(conn2_x, col3_x, 1, 5, 3)
        draw_fork(conn2_x, col3_x, 9, 13, 11)

        # Col 3: Conference Finals (Row 3 East, Row 11 West)
        draw_matchup_card(col3_x, 3, get_match("Conference Finals 1"), "east")
        draw_matchup_card(col3_x, 11, get_match("Conference Finals 2"), "west")

        # Connector CF -> Finals
        draw_fork(conn3_x, col4_x, 3, 11, 7)

        # Col 4: Championship Finals (Row 7)
        draw_matchup_card(col4_x, 7, get_match("Finals"), "finals", is_champ=True)

        # Connector Finals -> Trophy Showcase
        draw.line([(conn4_x, center_y(7)), (trophy_x, center_y(7))], fill=(15, 23, 42, 255), width=2)
        draw_trophy_box(trophy_x, center_y(7))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def build_discord_boxscore_embed(
    game: Dict[str, Any],
    season_id: int,
    game_id: int,
    home_team: Dict[str, Any],
    away_team: Dict[str, Any],
    home_coach_name: str,
    away_coach_name: str,
    playoff_summary: Optional[str] = None,
    uploaded_by: Optional[str] = None,
) -> Dict[str, Any]:
    away_code = (game["awayTeam"].get("teamCode") or away_team.get("abbreviation") or "AWAY").upper()
    home_code = (game["homeTeam"].get("teamCode") or home_team.get("abbreviation") or "HOME").upper()
    away_name = away_team.get("team_name") or W_LEAGUE_COACH_MAP.get(away_code, {}).get("city") or away_code
    home_name = home_team.get("team_name") or W_LEAGUE_COACH_MAP.get(home_code, {}).get("city") or home_code
    away_goals = int(game["awayTeam"].get("goals") or 0)
    home_goals = int(game["homeTeam"].get("goals") or 0)
    is_ot = bool(game.get("isOT"))

    away_logo = away_team.get("logo_url")
    home_logo = home_team.get("logo_url")
    winning_logo = away_logo if away_goals > home_goals else (home_logo if home_goals > away_goals else (home_logo or away_logo))

    def pad(val: Any, length: int, align_left: bool = True) -> str:
        s = str(val if val is not None else "")[:length]
        return s.ljust(length) if align_left else s.rjust(length)

    period_table = (
        "```\n"
        "      1rst 2nd 3rd OT Total\n"
        f"{pad(away_code, 4, True)}  {pad(game['awayTeam'].get('goalsP1', 0), 3, False)} {pad(game['awayTeam'].get('goalsP2', 0), 3, False)} {pad(game['awayTeam'].get('goalsP3', 0), 3, False)} {pad(game['awayTeam'].get('goalsOT', 0), 2, False) if is_ot else ' 0'} {pad(away_goals, 4, False)}\n"
        f"{pad(home_code, 4, True)}  {pad(game['homeTeam'].get('goalsP1', 0), 3, False)} {pad(game['homeTeam'].get('goalsP2', 0), 3, False)} {pad(game['homeTeam'].get('goalsP3', 0), 3, False)} {pad(game['homeTeam'].get('goalsOT', 0), 2, False) if is_ot else ' 0'} {pad(home_goals, 4, False)}\n"
        "```"
    )

    a_shots = int(game["awayTeam"].get("shots") or 0)
    h_shots = int(game["homeTeam"].get("shots") or 0)
    a_shoot = f"{(away_goals / a_shots) * 100:.2f}%" if a_shots > 0 else "0.00%"
    h_shoot = f"{(home_goals / h_shots) * 100:.2f}%" if h_shots > 0 else "0.00%"

    total_fo = int(game["awayTeam"].get("faceoffWins") or 0) + int(game["homeTeam"].get("faceoffWins") or 0)
    a_fo = f"{game['awayTeam'].get('faceoffWins', 0)}/{total_fo}"
    h_fo = f"{game['homeTeam'].get('faceoffWins', 0)}/{total_fo}"

    a_pp = f"{game['awayTeam'].get('ppGoals', 0)}/{game['awayTeam'].get('ppTries', 0)}"
    h_pp = f"{game['homeTeam'].get('ppGoals', 0)}/{game['homeTeam'].get('ppTries', 0)}"

    a_brk = f"{game['awayTeam'].get('breakawayGoals', 0)}/{game['awayTeam'].get('breakawayTries', 0)}"
    h_brk = f"{game['homeTeam'].get('breakawayGoals', 0)}/{game['homeTeam'].get('breakawayTries', 0)}"

    a_1t = f"{game['awayTeam'].get('oneTimerGoals', 0)}/{game['awayTeam'].get('oneTimerTries', 0)}"
    h_1t = f"{game['homeTeam'].get('oneTimerGoals', 0)}/{game['homeTeam'].get('oneTimerTries', 0)}"

    a_ps = f"{game['awayTeam'].get('penaltyShotGoals', 0)}/{game['awayTeam'].get('penaltyShotTries', 0)}"
    h_ps = f"{game['homeTeam'].get('penaltyShotGoals', 0)}/{game['homeTeam'].get('penaltyShotTries', 0)}"

    stats_rows = [
        f"{pad(a_shots, 7, False)}       Shots       {pad(h_shots, 7, True)}",
        f"{pad(game['awayTeam'].get('shotsP1', 0), 7, False)}    1st Period    {pad(game['homeTeam'].get('shotsP1', 0), 7, True)}",
        f"{pad(game['awayTeam'].get('shotsP2', 0), 7, False)}    2nd Period    {pad(game['homeTeam'].get('shotsP2', 0), 7, True)}",
        f"{pad(game['awayTeam'].get('shotsP3', 0), 7, False)}    3rd Period    {pad(game['homeTeam'].get('shotsP3', 0), 7, True)}",
        f"{pad(game['awayTeam'].get('shotsOT', 0), 7, False)}     Overtime     {pad(game['homeTeam'].get('shotsOT', 0), 7, True)}",
        f"{pad(a_shoot, 7, False)}    Shooting %    {pad(h_shoot, 7, True)}",
        f"{pad(a_pp, 7, False)}    PowerPlay     {pad(h_pp, 7, True)}",
        f"{pad(game['awayTeam'].get('ppShots', 0), 7, False)}  PowerPlay Shots  {pad(game['homeTeam'].get('ppShots', 0), 7, True)}",
        f"{pad(game['awayTeam'].get('shGoals', 0), 7, False)}  Shorthanded G    {pad(game['homeTeam'].get('shGoals', 0), 7, True)}",
        f"{pad(a_brk, 7, False)}    Breakaways    {pad(h_brk, 7, True)}",
        f"{pad(a_1t, 7, False)}    One-Timers    {pad(h_1t, 7, True)}",
        f"{pad(a_ps, 7, False)}  Penalty Shots   {pad(h_ps, 7, True)}",
        f"{pad(a_fo, 7, False)}     Faceoffs     {pad(h_fo, 7, True)}",
        f"{pad(game['awayTeam'].get('checks', 0), 7, False)}   Body Checks    {pad(game['homeTeam'].get('checks', 0), 7, True)}",
        f"{pad(game['awayTeam'].get('penalties', 0), 7, False)}    Penalties     {pad(game['homeTeam'].get('penalties', 0), 7, True)}",
        f"{pad(game['awayTeam'].get('attackZoneTime', '0:00'), 7, False)}   Attack Zone    {pad(game['homeTeam'].get('attackZoneTime', '0:00'), 7, True)}",
    ]

    game_stats_table = (
        f"```\n{pad(away_name.upper(), 14, True)}   Game Stats   {pad(home_name.upper(), 14, False)}\n"
        + "\n".join(stats_rows)
        + "\n```"
    )

    def format_boxscore_block(goalies: List[Dict[str, Any]], skaters: List[Dict[str, Any]]) -> str:
        g_lines = "Goalies            G-A Pts SO GA SV SH   SV%   TOI\n"
        for g in goalies or []:
            g_name = pad(g.get("name") or "Goalie", 18, True)
            ga = pad(g.get("ga", 0), 2, False)
            sv = pad(g.get("saves", 0), 2, False)
            sh = pad(g.get("shots", 0), 2, False)
            sv_pct_val = g.get("savePct")
            sv_pct = f"{float(sv_pct_val):.3f}" if isinstance(sv_pct_val, (int, float)) else "0.000"
            toi = pad(g.get("toi") or "15:00", 5, False)
            so = pad(g.get("so", 0), 2, False)
            g_lines += f"{g_name} 0-0   0 {so} {ga} {sv} {sh} {sv_pct} {toi}\n"

        s_lines = "Players            G-A Pts SOG CHK PIM PPP SHP   TOI\n"
        for s in skaters or []:
            s_name = pad(s.get("name") or "Player", 18, True)
            goals = int(s.get("goals") or 0)
            assists = int(s.get("assists") or 0)
            ga_str = f"{goals}-{assists}"
            pts = pad(goals + assists, 3, False)
            sog = pad(s.get("sog", 0), 3, False)
            chk = pad(s.get("checks", 0), 3, False)
            pim = pad(s.get("pim", 0), 3, False)
            ppp = pad(s.get("ppp", 0), 3, False)
            shp = pad(s.get("shp", 0), 3, False)
            toi = pad(s.get("toi") or "15:00", 5, False)
            s_lines += f"{s_name} {pad(ga_str, 4, True)} {pts} {sog} {chk} {pim} {ppp} {shp} {toi}\n"

        return f"```\n{g_lines}\n{s_lines}```"

    if game.get("goals"):
        scoring_block = "```\nPer. Time Team Goal             Primary          Secondary        Type\n"
        for g in game["goals"]:
            per = pad(g.get("period"), 3, False)
            t_str = pad(g.get("time"), 5, False)
            tm = pad(g.get("team"), 4, False)
            scorer = pad(g.get("scorer"), 16, True)
            a1 = pad(g.get("assist1") if g.get("assist1") and g.get("assist1") != "--" else "--", 16, True)
            a2 = pad(g.get("assist2") if g.get("assist2") and g.get("assist2") != "--" else "--", 16, True)
            g_type = pad(g.get("type") or "EV", 4, True)
            scoring_block += f"{per} {t_str} {tm} {scorer} {a1} {a2} {g_type}\n"
        scoring_block += "```"
    else:
        scoring_block = "`No goals scored in this match.`"

    if game.get("penalties"):
        penalty_block = "```\nPer. Time Team Player             Penalty\n"
        for p in game["penalties"]:
            per = pad(p.get("period"), 3, False)
            t_str = pad(p.get("time"), 5, False)
            tm = pad(p.get("team"), 4, False)
            player = pad(p.get("player"), 18, True)
            p_type = pad(p.get("type"), 15, True)
            penalty_block += f"{per} {t_str} {tm} {player} {p_type}\n"
        penalty_block += "```"
    else:
        penalty_block = "`No penalties assessed.`"

    three_stars = calculate_three_stars(game, away_code, home_code)
    three_stars_block = None
    if three_stars:
        lines = []
        for idx, s in enumerate(three_stars):
            prefix = "⭐ **1st Star:**" if idx == 0 else ("⭐⭐ **2nd Star:**" if idx == 1 else "⭐⭐⭐ **3rd Star:**")
            lines.append(f"{prefix} **{s['name']}** ({s['team']}) — `{s['summary']}`")
        three_stars_block = "\n".join(lines)

    desc_lines = [
        f"**Game #{game_id}** • Nostradamus Coliseum",
        f"**Matchup:** {away_name} ({away_coach_name}) vs {home_name} ({home_coach_name})",
    ]
    if playoff_summary:
        desc_lines.append(f"🏆 **{playoff_summary}**")
    if uploaded_by:
        desc_lines.append(f"📥 **Save State Dropped By:** {uploaded_by}")

    fields = []
    if three_stars_block:
        fields.append({"name": "🌟 Three Stars of the Game", "value": three_stars_block, "inline": False})
    fields.extend([
        {"name": "📊 Period Summary", "value": period_table, "inline": False},
        {"name": "⚡ Game Stats", "value": game_stats_table, "inline": False},
        {"name": f"🔴 {away_name.upper()} ({away_code}) LINEUP", "value": format_boxscore_block(game.get("awayGoalies", []), game.get("awaySkaters", [])), "inline": False},
        {"name": f"🔵 {home_name.upper()} ({home_code}) LINEUP", "value": format_boxscore_block(game.get("homeGoalies", []), game.get("homeSkaters", [])), "inline": False},
        {"name": "🚨 Scoring Summary", "value": scoring_block, "inline": False},
        {"name": "🛑 Penalty Summary", "value": penalty_block, "inline": False},
    ])

    embed_dict: Dict[str, Any] = {
        "author": {
            "name": f"WN95HL OFFICIAL BOXSCORE • SEASON {season_id} ({get_league_code(season_id)})",
            "icon_url": "https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/brule_cup.png",
        },
        "title": f"🏒 {away_name.upper()} ({away_goals}) at {home_name.upper()} ({home_goals}){' [OT]' if is_ot else ''}",
        "description": "\n".join(desc_lines),
        "color": 0x2B82D9 if away_goals > home_goals else 0xD9532B,
        "fields": fields,
        "footer": {
            "text": "NHL95 Gazette Boxscore System • nhl95.net (Discord Auto-Ingest)",
            "icon_url": "https://prdfunbzqsvqlyiwmuqp.supabase.co/storage/v1/object/public/awards/brule_cup.png",
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if winning_logo:
        embed_dict["thumbnail"] = {"url": winning_logo}

    return embed_dict


def recalculate_and_save_season_standings(s_id: int) -> Dict[str, Any]:
    """Recalculates and upserts league_standings for season s_id (matching app/standings/page.tsx)."""
    try:
        try:
            schedule_data = supabase.select(
                "league_schedule",
                {"select": "*", "league_id": f"eq.{s_id}", "order": "game_id.asc"},
            )
        except Exception:
            schedule_data = supabase.select(
                "league_schedule",
                {"select": "*", "league_id": f"eq.{s_id}"},
            )
        stats_data = supabase.select(
            "league_gamestats",
            {"select": "*", "league_id": f"eq.{s_id}"},
        )
        teams_data = supabase.select(
            "league_teams",
            {"select": "*"},
        )
        try:
            existing_standings = supabase.select(
                "league_standings",
                {"select": "*", "season_id": f"eq.{s_id}"},
            )
        except Exception:
            existing_standings = []

        existing_map = {int(r["team_id"]): r for r in (existing_standings or []) if r.get("team_id") is not None}
        team_meta_map = {int(t["team_id"]): t for t in (teams_data or []) if t.get("team_id") is not None}

        active_team_ids = set()
        for t in teams_data or []:
            if int(t.get("league_id") or 0) == s_id:
                active_team_ids.add(int(t["team_id"]))

        for row_list in (schedule_data or [], stats_data or []):
            for g in row_list:
                h = int(g.get("home_team_id") or 0)
                a = int(g.get("away_team_id") or 0)
                if h and h not in (999, 0, 68):
                    active_team_ids.add(h)
                if a and a not in (999, 0, 68):
                    active_team_ids.add(a)

        team_map: Dict[int, Dict[str, Any]] = {}
        for t_id in active_team_ids:
            existing = existing_map.get(t_id, {})
            t_info = team_meta_map.get(t_id, {})
            conf = (existing.get("conference") or t_info.get("conference") or "").strip() or None
            div = (existing.get("division") or t_info.get("division") or "").strip() or None
            team_map[t_id] = {
                "season_id": s_id,
                "team_id": t_id,
                "gp": 0,
                "wins": 0,
                "losses": 0,
                "ties": 0,
                "pts": 0,
                "gf": 0,
                "ga": 0,
                "otWins": 0,
                "otLosses": 0,
                "homeWins": 0,
                "homeLosses": 0,
                "homeTies": 0,
                "awayWins": 0,
                "awayLosses": 0,
                "awayTies": 0,
                "history": [],
                "conference": conf,
                "division": div,
                "clinch": existing.get("clinch"),
                "is_champion": bool(existing.get("is_champion", False)),
            }

        def resolve_team_key(raw_id: Any) -> Optional[int]:
            try:
                num = int(raw_id or 0)
            except (ValueError, TypeError):
                return None
            if not num or num in (999, 0, 68):
                return None
            if num in team_map:
                return num

            match_team = next((t for t in (teams_data or []) if int(t.get("team_id") or 0) == num or int(t.get("coach_id") or 0) == num), None)
            if match_team:
                m_abbr = (match_team.get("abbreviation") or "").strip().upper()
                m_name = (match_team.get("team_name") or "").strip().upper()
                m_coach = int(match_team.get("coach_id") or 0)
                season_match = next(
                    (
                        t for t in (teams_data or [])
                        if int(t.get("league_id") or 0) == s_id
                        and (
                            (m_abbr and (t.get("abbreviation") or "").strip().upper() == m_abbr)
                            or (m_name and (t.get("team_name") or "").strip().upper() == m_name)
                            or (m_coach > 0 and int(t.get("coach_id") or 0) == m_coach)
                        )
                    ),
                    None,
                )
                if season_match and int(season_match["team_id"]) in team_map:
                    return int(season_match["team_id"])

            # Fallback: auto-register so game is never dropped
            t_info = match_team or team_meta_map.get(num, {})
            existing = existing_map.get(num, {})
            team_map[num] = {
                "season_id": s_id,
                "team_id": num,
                "gp": 0,
                "wins": 0,
                "losses": 0,
                "ties": 0,
                "pts": 0,
                "gf": 0,
                "ga": 0,
                "otWins": 0,
                "otLosses": 0,
                "homeWins": 0,
                "homeLosses": 0,
                "homeTies": 0,
                "awayWins": 0,
                "awayLosses": 0,
                "awayTies": 0,
                "history": [],
                "conference": (existing.get("conference") or t_info.get("conference") or "").strip() or None,
                "division": (existing.get("division") or t_info.get("division") or "").strip() or None,
                "clinch": existing.get("clinch"),
                "is_champion": bool(existing.get("is_champion", False)),
            }
            return num

        def process_game_result(raw_h_id: Any, raw_a_id: Any, home_score: int, away_score: int, game_meta: Any, stats_obj: Optional[Dict[str, Any]] = None):
            h_id = resolve_team_key(raw_h_id)
            a_id = resolve_team_key(raw_a_id)
            if not h_id or not a_id or h_id == a_id:
                return
            if h_id not in team_map or a_id not in team_map:
                return

            is_ot = False
            is_tie = False
            if game_meta:
                try:
                    meta = json.loads(game_meta) if isinstance(game_meta, str) else game_meta
                    if isinstance(meta, dict):
                        is_ot = str(meta.get("is_ot") or meta.get("isOT") or "").lower() in ("true", "1")
                        is_tie = str(meta.get("is_tie") or "").lower() in ("true", "1")
                except Exception:
                    low_str = str(game_meta or "").lower()
                    is_ot = '"is_ot":true' in low_str or '"isot":true' in low_str
                    is_tie = '"is_tie":true' in low_str

            if not is_ot and stats_obj:
                try:
                    h_stats = json.loads(stats_obj["home_stats"]) if isinstance(stats_obj.get("home_stats"), str) else (stats_obj.get("home_stats") or {})
                    a_stats = json.loads(stats_obj["away_stats"]) if isinstance(stats_obj.get("away_stats"), str) else (stats_obj.get("away_stats") or {})
                    if (
                        int(h_stats.get("home_ot_goals") or 0) > 0
                        or int(a_stats.get("away_ot_goals") or 0) > 0
                        or int(h_stats.get("home_ot_shots") or 0) > 0
                        or int(a_stats.get("away_ot_shots") or 0) > 0
                    ):
                        is_ot = True
                except Exception:
                    pass

            if home_score == away_score and not is_ot:
                is_tie = True

            team_map[h_id]["gp"] += 1
            team_map[a_id]["gp"] += 1
            team_map[h_id]["gf"] += home_score
            team_map[h_id]["ga"] += away_score
            team_map[a_id]["gf"] += away_score
            team_map[a_id]["ga"] += home_score

            if is_tie:
                team_map[h_id]["ties"] += 1
                team_map[h_id]["homeTies"] += 1
                team_map[h_id]["pts"] += 1
                team_map[h_id]["history"].append("T")

                team_map[a_id]["ties"] += 1
                team_map[a_id]["awayTies"] += 1
                team_map[a_id]["pts"] += 1
                team_map[a_id]["history"].append("T")
            elif home_score > away_score:
                team_map[h_id]["wins"] += 1
                team_map[h_id]["homeWins"] += 1
                team_map[h_id]["pts"] += 2
                team_map[h_id]["history"].append("W")
                if is_ot:
                    team_map[h_id]["otWins"] += 1
                    team_map[a_id]["otLosses"] += 1
                    team_map[a_id]["pts"] += 1
                    team_map[a_id]["history"].append("OTL")
                else:
                    team_map[a_id]["losses"] += 1
                    team_map[a_id]["awayLosses"] += 1
                    team_map[a_id]["history"].append("L")
            elif away_score > home_score:
                team_map[a_id]["wins"] += 1
                team_map[a_id]["awayWins"] += 1
                team_map[a_id]["pts"] += 2
                team_map[a_id]["history"].append("W")
                if is_ot:
                    team_map[a_id]["otWins"] += 1
                    team_map[h_id]["otLosses"] += 1
                    team_map[h_id]["pts"] += 1
                    team_map[h_id]["history"].append("OTL")
                else:
                    team_map[h_id]["losses"] += 1
                    team_map[h_id]["homeLosses"] += 1
                    team_map[h_id]["history"].append("L")

        processed_game_ids = set()
        for st in stats_data or []:
            gid_str = str(st.get("game_id") or "").strip()
            if gid_str:
                processed_game_ids.add(gid_str)
            process_game_result(
                st.get("home_team_id"),
                st.get("away_team_id"),
                int(st.get("home_score") or 0),
                int(st.get("away_score") or 0),
                st.get("game_meta"),
                st,
            )

        for g in schedule_data or []:
            gid_str = str(g.get("game_id") or "").strip()
            raw_played = str(g.get("played") or "").strip().lower()
            is_played = raw_played in ("true", "1", "y")
            if is_played and gid_str not in processed_game_ids and g.get("game_meta"):
                process_game_result(
                    g.get("home_team_id"),
                    g.get("away_team_id"),
                    int(g.get("home_score") or 0),
                    int(g.get("away_score") or 0),
                    g.get("game_meta"),
                    g,
                )

        standings_rows = []
        for team in team_map.values():
            hist = team["history"]
            streak_str = "-"
            if hist:
                last_res = hist[-1]
                cnt = 0
                for r in reversed(hist):
                    if r == last_res:
                        cnt += 1
                    else:
                        break
                streak_str = f"{last_res}{cnt}"

            last10 = hist[-10:]
            l10_w = sum(1 for r in last10 if r == "W")
            l10_l = sum(1 for r in last10 if r == "L")
            l10_t = sum(1 for r in last10 if r == "T")

            standings_rows.append({
                "season_id": s_id,
                "team_id": team["team_id"],
                "gp": team["gp"],
                "w": team["wins"],
                "l": team["losses"],
                "t": team["ties"],
                "pts": team["pts"],
                "gf": team["gf"],
                "ga": team["ga"],
                "gd": team["gf"] - team["ga"],
                "otw": team["otWins"],
                "otl": team["otLosses"],
                "strk": streak_str,
                "l10": f"{l10_w}-{l10_l}-{l10_t}",
                "home": f"{team['homeWins']}-{team['homeLosses']}-{team['homeTies']}",
                "away": f"{team['awayWins']}-{team['awayLosses']}-{team['awayTies']}",
                "conference": team["conference"],
                "division": team["division"],
                "clinch": team["clinch"],
                "is_champion": team["is_champion"],
            })

        if not standings_rows:
            return {"success": True, "updatedRows": 0, "rows": []}

        try:
            supabase.insert("league_standings", standings_rows, upsert=True, on_conflict="season_id,team_id")
        except Exception:
            try:
                supabase.delete("league_standings", {"season_id": f"eq.{s_id}"})
                supabase.insert("league_standings", standings_rows)
            except Exception as db_err:
                print(f"Non-fatal warning saving league_standings: {db_err}")

        return {"success": True, "updatedRows": len(standings_rows), "rows": standings_rows}
    except Exception as e:
        print(f"Error recalculating standings: {e}")
        return {"success": False, "error": str(e), "rows": []}


# =====================================================================
# 4. AUTO-DETECTION & FULL SUPABASE SAVE PIPELINE
# =====================================================================

def detect_context_from_discord(
    raw_bytes: bytes,
    channel_name: str,
    message_text: str,
    filename: str,
) -> Tuple[int, str, bool]:
    """
    Auto-detects (season_id, game_mode, allow_overwrite) from Discord channel name,
    message text, filename, and save state team bytes.
    Default: Season 40 (W18), Regular Season, allow_overwrite=False.
    """
    combined = f"{channel_name} {message_text} {filename}".lower()

    allow_overwrite = bool(re.search(r"\b(overwrite|resubmit|replace|force)\b", combined))
    is_playoffs_hint = bool(
        re.search(r"\b(playoff|playoffs|po|qf|sf|cf|final|finals|series|bracket)\b", combined)
        or re.search(r"\b[wo]\d{1,2}p\b", combined)
    )

    # 0. Check for {year}-save-states channel naming convention (e.g. 2013-save-states, 2014-save-states, 1927-save-states)
    ch_year_match = re.search(r"\b(19\d{2}|20\d{2})\b", channel_name.lower())
    if ch_year_match:
        yr = int(ch_year_match.group(1))
        resolved_sid = resolve_season_id_from_year(yr)
        return (resolved_sid, "Playoffs" if is_playoffs_hint else "Season", allow_overwrite)

    # Also check for explicit W/O code in channel/message (e.g. w18p, w19, w20, o01p, o02, o03)
    wo_code_match = re.search(r"\b([wo])(\d{1,2})p?\b", combined)
    if wo_code_match:
        prefix = wo_code_match.group(1).upper()
        num = int(wo_code_match.group(2))
        if prefix == "O":
            return (39 if num == 1 else (52 + num), "Playoffs" if is_playoffs_hint else "Season", allow_overwrite)
        if prefix == "W" and num >= 17:
            return (38 if num == 17 else (22 + num), "Playoffs" if is_playoffs_hint else "Season", allow_overwrite)

    # 1. Explicit league/season keywords
    if re.search(r"\b(o01|o-league|o_league|oleague|original[\s_-]*6|s39|season[\s_-]*39)\b", combined):
        return (39, "Playoffs" if is_playoffs_hint else "Season", allow_overwrite)

    if re.search(r"\b(w17|s38|season[\s_-]*38|season[\s_-]*17)\b", combined):
        return (38, "Playoffs", allow_overwrite)

    if re.search(r"\b(w18|s40|season[\s_-]*40|w-league|w_league|wleague)\b", combined):
        return (40, "Playoffs" if is_playoffs_hint else "Season", allow_overwrite)

    # 2. Inspect team bytes if no explicit season keyword was given
    if len(raw_bytes) >= 52000:
        offset = 32
        if raw_bytes[48980 + offset] > 30 and raw_bytes[48980] <= 30:
            offset = 0
        home_byte = raw_bytes[48980 + offset]
        away_byte = raw_bytes[48982 + offset]

        # O-League only has team indices 0..5. If bytes are 0..5, check if W18 has an active scheduled game
        # between these indices; if not, and O01 (Season 39) does, auto-select Season 39!
        if home_byte <= 5 and away_byte <= 5:
            try:
                w_cfg = get_season_config(40)
                w_home_code = w_cfg.get("teamCodes", {}).get(str(home_byte), "")
                w_away_code = w_cfg.get("teamCodes", {}).get(str(away_byte), "")
                w_teams = supabase.select("league_teams", {"select": "team_id,team_name,abbreviation,coach_id", "league_id": "eq.40"})
                w_h = match_team_from_list(w_home_code, w_teams)
                w_a = match_team_from_list(w_away_code, w_teams)
                w_sched = []
                if w_h and w_a and w_h.get("team_id") and w_a.get("team_id"):
                    w_sched = supabase.select(
                        "league_schedule",
                        {
                            "select": "game_id,played",
                            "league_id": "eq.40",
                            "home_team_id": f"eq.{w_h['team_id']}",
                            "away_team_id": f"eq.{w_a['team_id']}",
                        },
                    )
                w_has_unplayed = any(str(g.get("played") or "").strip().lower() not in ("true", "1", "y", "yes") for g in w_sched)

                if not w_has_unplayed:
                    o_cfg = get_season_config(39)
                    o_home_code = o_cfg.get("teamCodes", {}).get(str(home_byte), "")
                    o_away_code = o_cfg.get("teamCodes", {}).get(str(away_byte), "")
                    o_teams = supabase.select("league_teams", {"select": "team_id,team_name,abbreviation,coach_id", "league_id": "eq.39"})
                    o_h = match_team_from_list(o_home_code, o_teams)
                    o_a = match_team_from_list(o_away_code, o_teams)
                    if o_h and o_a and o_h.get("team_id") and o_a.get("team_id"):
                        o_sched = supabase.select(
                            "league_schedule",
                            {
                                "select": "game_id,played",
                                "league_id": "eq.39",
                                "home_team_id": f"eq.{o_h['team_id']}",
                                "away_team_id": f"eq.{o_a['team_id']}",
                            },
                        )
                        o_has_unplayed = any(str(g.get("played") or "").strip().lower() not in ("true", "1", "y", "yes") for g in o_sched)
                        if o_has_unplayed:
                            return (39, "Playoffs" if is_playoffs_hint else "Season", allow_overwrite)
            except Exception:
                pass

    return (40, "Playoffs" if is_playoffs_hint else "Season", allow_overwrite)


def ingest_save_state_to_supabase(
    raw_bytes: bytes,
    season_id: int = 40,
    game_mode: str = "Season",
    allow_overwrite: bool = False,
    uploaded_by: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Parses the save state and executes the full Supabase ingestion pipeline.
    Returns a dict with:
      - success: bool
      - alreadyPlayed: bool (if duplicate and allow_overwrite is False)
      - gameId: int
      - gameResults: str
      - embed: dict (ready for discord.Embed.from_dict)
      - error: str (if failed)
    """
    s_id = int(season_id)
    season_cfg = get_season_config(s_id)
    game = parse_save_state_bytes(raw_bytes, season_cfg)

    home_team_code = (game["homeTeam"].get("teamCode") or "HOME").upper()
    away_team_code = (game["awayTeam"].get("teamCode") or "AWAY").upper()

    # 1. Fetch Teams and Coaches
    teams_data = supabase.select(
        "league_teams",
        {"select": "team_id,team_name,abbreviation,coach_id,league_id,logo_url,league_coaches(coach_id,coach_name)", "league_id": f"eq.{s_id}"},
    )
    if not teams_data:
        teams_data = supabase.select(
            "league_teams",
            {"select": "team_id,team_name,abbreviation,coach_id,league_id,logo_url,league_coaches(coach_id,coach_name)"},
        )

    known_home = W_LEAGUE_COACH_MAP.get(home_team_code)
    known_away = W_LEAGUE_COACH_MAP.get(away_team_code)

    home_team = match_team_from_list(home_team_code, teams_data or []) or {}
    away_team = match_team_from_list(away_team_code, teams_data or []) or {}

    home_team_id = int(home_team.get("team_id") or 0)
    away_team_id = int(away_team.get("team_id") or 0)

    home_coach_id = int(home_team["coach_id"]) if home_team.get("coach_id") else (known_home["coach_id"] if known_home else home_team_id)
    away_coach_id = int(away_team["coach_id"]) if away_team.get("coach_id") else (known_away["coach_id"] if known_away else away_team_id)

    def extract_coach_name(t_obj: Dict[str, Any], known_obj: Optional[Dict[str, Any]], code: str) -> str:
        lc = t_obj.get("league_coaches")
        if isinstance(lc, dict) and lc.get("coach_name"):
            return lc["coach_name"]
        if isinstance(lc, list) and lc and lc[0].get("coach_name"):
            return lc[0]["coach_name"]
        if known_obj and known_obj.get("coach_name"):
            return known_obj["coach_name"]
        return t_obj.get("team_name") or code

    home_coach_name = extract_coach_name(home_team, known_home, home_team_code)
    away_coach_name = extract_coach_name(away_team, known_away, away_team_code)

    # 2. Fetch Rosters
    season_rosters = supabase.select(
        "league_rosters",
        {"select": "player_id,player_name,team_id,league_id", "league_id": f"eq.{s_id}"},
    )
    all_season_rosters = []
    if home_team_id or away_team_id:
        all_season_rosters = supabase.select(
            "league_rosters",
            {"select": "player_id,player_name,team_id,league_id", "team_id": f"in.({home_team_id},{away_team_id})"},
        )

    def get_player_id(name: str, team_id: int) -> int:
        if not name or name == "--":
            return 1
        clean = name.strip().lower()
        last_name = clean.split(" ")[-1] if " " in clean else clean

        for r in season_rosters or []:
            if int(r.get("team_id") or 0) == int(team_id) and (r.get("player_name") or "").strip().lower() == clean:
                return int(r["player_id"])

        for r in season_rosters or []:
            r_name = (r.get("player_name") or "").strip().lower()
            if int(r.get("team_id") or 0) == int(team_id) and (
                clean in r_name or r_name in clean or (len(last_name) > 2 and last_name in r_name)
            ):
                return int(r["player_id"])

        for r in season_rosters or []:
            r_name = (r.get("player_name") or "").strip().lower()
            if r_name == clean or (len(last_name) > 2 and last_name in r_name):
                return int(r["player_id"])

        for r in all_season_rosters or []:
            r_name = (r.get("player_name") or "").strip().lower()
            if int(r.get("team_id") or 0) == int(team_id) and (r_name == clean or (len(last_name) > 2 and last_name in r_name)):
                return int(r["player_id"])

        return 1

    # 3. Resolve Game ID & Auto-upgrade to Playoffs if active series exists and no unplayed regular season game exists
    is_playoff_mode = game_mode == "Playoffs"
    final_game_id = 0
    resolved_playoff_id = 0
    final_game_number = 0
    active_playoff_series: Optional[Dict[str, Any]] = None

    if not is_playoff_mode:
        scheduled_games = supabase.select(
            "league_schedule",
            {
                "select": "game_id,played,home_team_id,away_team_id",
                "league_id": f"eq.{s_id}",
                "home_team_id": f"eq.{home_team_id}",
                "away_team_id": f"eq.{away_team_id}",
                "order": "game_id.asc",
            },
        )
        if scheduled_games:
            sched_ids = [int(g["game_id"]) for g in scheduled_games]
            played_games = supabase.select(
                "league_gamestats",
                {"select": "game_id", "game_id": f"in.({','.join(str(x) for x in sched_ids)})"},
            )
            played_set = {int(p["game_id"]) for p in (played_games or [])}
            unplayed = next(
                (
                    g for g in scheduled_games
                    if str(g.get("played") or "").strip().lower() not in ("true", "1", "y", "yes")
                    and int(g["game_id"]) not in played_set
                ),
                None,
            )
            if unplayed:
                final_game_id = int(unplayed["game_id"])
            else:
                # Check if there is an active incomplete playoff series between these two teams before returning 409
                series_matches = supabase.select("league_playoffs", {"select": "*", "league_id": f"eq.{s_id}"})
                matching_po = [
                    m for m in (series_matches or [])
                    if not m.get("is_complete")
                    and (
                        (int(m.get("home_team_id") or 0) == home_team_id and int(m.get("away_team_id") or 0) == away_team_id)
                        or (int(m.get("home_team_id") or 0) == away_team_id and int(m.get("away_team_id") or 0) == home_team_id)
                    )
                ]
                if matching_po:
                    is_playoff_mode = True
                elif not allow_overwrite:
                    return {
                        "success": False,
                        "alreadyPlayed": True,
                        "playedGameIds": sched_ids,
                        "matchup": f"{away_team_code} @ {home_team_code}",
                        "gameResults": f"{away_team_code} {game['awayTeam']['goals']} - {game['homeTeam']['goals']} {home_team_code}",
                        "error": (
                            f"All scheduled regular-season games between **{away_team_code}** and **{home_team_code}** "
                            f"for Season {s_id} ({get_league_code(s_id)}) have already been recorded "
                            f"(Game #{', #'.join(str(x) for x in sched_ids)})."
                        ),
                    }
                else:
                    final_game_id = sched_ids[-1]
        else:
            # No regular season games scheduled for this home/away pair; check if an active playoff series exists
            series_matches = supabase.select("league_playoffs", {"select": "*", "league_id": f"eq.{s_id}"})
            matching_po = [
                m for m in (series_matches or [])
                if (
                    (int(m.get("home_team_id") or 0) == home_team_id and int(m.get("away_team_id") or 0) == away_team_id)
                    or (int(m.get("home_team_id") or 0) == away_team_id and int(m.get("away_team_id") or 0) == home_team_id)
                )
            ]
            if matching_po:
                is_playoff_mode = True
            else:
                latest_game = supabase.select("league_gamestats", {"select": "game_id", "order": "game_id.desc", "limit": "1"})
                final_game_id = (int(latest_game[0]["game_id"]) + 1) if latest_game and latest_game[0].get("game_id") else 1

    if is_playoff_mode:
        series_matches = supabase.select("league_playoffs", {"select": "*", "league_id": f"eq.{s_id}"})
        matching_series_list = [
            m for m in (series_matches or [])
            if (
                (int(m.get("home_team_id") or 0) == home_team_id and int(m.get("away_team_id") or 0) == away_team_id)
                or (int(m.get("home_team_id") or 0) == away_team_id and int(m.get("away_team_id") or 0) == home_team_id)
            )
        ]
        active_playoff_series = (
            next((m for m in matching_series_list if not m.get("is_complete")), None)
            or (matching_series_list[-1] if matching_series_list else None)
        )

        if not active_playoff_series and home_team_id and away_team_id:
            latest_series = supabase.select("league_playoffs", {"select": "playoff_id", "order": "playoff_id.desc", "limit": "1"})
            next_po_id = (int(latest_series[0]["playoff_id"]) + 1) if latest_series and latest_series[0].get("playoff_id") else 1
            new_series_row = {
                "playoff_id": next_po_id,
                "league_id": s_id,
                "round_name": "Playoffs",
                "match_label": f"{away_team_code} vs {home_team_code}",
                "home_team_id": home_team_id,
                "away_team_id": away_team_id,
                "series_length": 7,
                "is_complete": False,
            }
            created = supabase.insert("league_playoffs", new_series_row, upsert=True, on_conflict="playoff_id")
            active_playoff_series = created[0] if created else new_series_row

        resolved_playoff_id = int((active_playoff_series or {}).get("playoff_id") or 1)
        series_len = int((active_playoff_series or {}).get("series_length") or 7)
        wins_needed = math.ceil(series_len / 2.0)

        existing_po_games = supabase.select(
            "league_playoff_gamestats",
            {
                "select": "game_id,game_number,home_team_id,away_team_id,home_score,away_score",
                "playoff_id": f"eq.{resolved_playoff_id}",
                "order": "game_number.asc",
            },
        )
        t1_wins = 0
        t2_wins = 0
        for g in existing_po_games or []:
            hs = int(g.get("home_score") or 0)
            as_ = int(g.get("away_score") or 0)
            w_id = int(g["home_team_id"]) if hs > as_ else (int(g["away_team_id"]) if as_ > hs else 0)
            if w_id == home_team_id:
                t1_wins += 1
            elif w_id == away_team_id:
                t2_wins += 1

        is_series_won = t1_wins >= wins_needed or t2_wins >= wins_needed
        if is_series_won and not allow_overwrite:
            return {
                "success": False,
                "alreadyPlayed": True,
                "seasonId": s_id,
                "gameMode": "Playoffs",
                "playedGameIds": [int(g["game_id"]) for g in (existing_po_games or [])],
                "matchup": f"{away_team_code} @ {home_team_code}",
                "gameResults": f"{away_team_code} {game['awayTeam']['goals']} - {game['homeTeam']['goals']} {home_team_code}",
                "playoffBracketPngBytes": render_playoff_bracket_png(s_id),
                "standingsPngBytes": render_standings_and_leaders_png(s_id, True),
                "error": (
                    f"Playoff series between **{away_team_code}** and **{home_team_code}** is already complete "
                    f"({away_team_code} {t2_wins} - {t1_wins} {home_team_code} in Best-of-{series_len})."
                ),
            }

        if allow_overwrite and existing_po_games and is_series_won:
            final_game_number = int(existing_po_games[-1]["game_number"])
        else:
            max_gn = max([int(g.get("game_number") or 0) for g in (existing_po_games or [])], default=0)
            final_game_number = max_gn + 1

        existing_for_num = next((g for g in (existing_po_games or []) if int(g.get("game_number") or 0) == final_game_number), None)
        if existing_for_num:
            final_game_id = int(existing_for_num["game_id"])
        else:
            latest_po_game = supabase.select("league_playoff_gamestats", {"select": "game_id", "order": "game_id.desc", "limit": "1"})
            final_game_id = (int(latest_po_game[0]["game_id"]) + 1) if latest_po_game and latest_po_game[0].get("game_id") else 1

    # 4. Format game_meta and game_results
    game_meta = {
        "is_ot": bool(game["isOT"]),
        "is_tie": int(game["homeTeam"]["goals"]) == int(game["awayTeam"]["goals"]),
        "league": get_league_code(s_id),
        "league_mode": "Playoffs" if is_playoff_mode else "Season",
    }
    game_results = f"{away_team_code} {game['awayTeam']['goals']} - {game['homeTeam']['goals']} {home_team_code}"

    # 5. Format home_stats and away_stats JSON
    ht = game["homeTeam"]
    at = game["awayTeam"]
    home_stats = {
        "home_atk": parse_time_to_day_fraction(ht["attackZoneTime"]),
        "home_pen": str(ht["penalties"]),
        "home_pim": str(ht["pim"]),
        "home_goals": str(ht["goals"]),
        "home_shots": str(ht["shots"]),
        "home_pp_opps": str(ht["ppTries"]),
        "home_ot_goals": str(ht["goalsOT"]),
        "home_ot_shots": str(ht["shotsOT"]),
        "home_pp_goals": str(ht["ppGoals"]),
        "home_pp_shots": str(ht["ppShots"]),
        "home_sh_goals": str(ht["shGoals"]),
        "home_1st_goals": str(ht["goalsP1"]),
        "home_1st_shots": str(ht["shotsP1"]),
        "home_2nd_goals": str(ht["goalsP2"]),
        "home_2nd_shots": str(ht["shotsP2"]),
        "home_3rd_goals": str(ht["goalsP3"]),
        "home_3rd_shots": str(ht["shotsP3"]),
        "home_onetimers": str(ht["oneTimerTries"]),
        "home_bodychecks": str(ht["checks"]),
        "home_breakaways": str(ht["breakawayTries"]),
        "home_pp_minutes": parse_time_to_day_fraction(ht["ppTime"]),
        "home_faceoff_won": str(ht["faceoffWins"]),
        "home_pass_attempts": str(ht["passTries"]),
        "home_penalty_shots": str(ht["penaltyShotTries"]),
        "home_onetimer_goals": str(ht["oneTimerGoals"]),
        "home_breakaway_goals": str(ht["breakawayGoals"]),
        "home_pass_completions": str(ht["passComps"]),
        "home_penalty_shot_goals": str(ht["penaltyShotGoals"]),
    }
    away_stats = {
        "away_atk": parse_time_to_day_fraction(at["attackZoneTime"]),
        "away_pen": str(at["penalties"]),
        "away_pim": str(at["pim"]),
        "away_goals": str(at["goals"]),
        "away_shots": str(at["shots"]),
        "away_pp_opps": str(at["ppTries"]),
        "away_ot_goals": str(at["goalsOT"]),
        "away_ot_shots": str(at["shotsOT"]),
        "away_pp_goals": str(at["ppGoals"]),
        "away_pp_shots": str(at["ppShots"]),
        "away_sh_goals": str(at["shGoals"]),
        "away_1st_goals": str(at["goalsP1"]),
        "away_1st_shots": str(at["shotsP1"]),
        "away_2nd_goals": str(at["goalsP2"]),
        "away_2nd_shots": str(at["shotsP2"]),
        "away_3rd_goals": str(at["goalsP3"]),
        "away_3rd_shots": str(at["shotsP3"]),
        "away_onetimers": str(at["oneTimerTries"]),
        "away_bodychecks": str(at["checks"]),
        "away_breakaways": str(at["breakawayTries"]),
        "away_pp_minutes": parse_time_to_day_fraction(at["ppTime"]),
        "away_faceoff_won": str(at["faceoffWins"]),
        "away_pass_attempts": str(at["passTries"]),
        "away_penalty_shots": str(at["penaltyShotTries"]),
        "away_onetimer_goals": str(at["oneTimerGoals"]),
        "away_breakaway_goals": str(at["breakawayGoals"]),
        "away_pass_completions": str(at["passComps"]),
        "away_penalty_shot_goals": str(at["penaltyShotGoals"]),
    }

    raw_len = game.get("gameLength") or "15:00"
    formatted_len = f"{raw_len}:00" if ":" in raw_len and len(raw_len.split(":")) == 2 else raw_len

    gamestats_table = "league_playoff_gamestats" if is_playoff_mode else "league_gamestats"
    gamestats_row: Dict[str, Any] = {
        "game_id": final_game_id,
        "league_id": s_id,
        "game_meta": game_meta,
        "game_results": game_results,
        "home_team_id": home_team_id,
        "home_coach_id": home_coach_id,
        "home_coach": home_coach_name,
        "home_score": int(ht["goals"]),
        "home_stats": home_stats,
        "away_team_id": away_team_id,
        "away_coach_id": away_coach_id,
        "away_coach": away_coach_name,
        "away_score": int(at["goals"]),
        "away_stats": away_stats,
        "total_faceoffs": int(game["totalFaceoffs"]),
        "game_length": formatted_len,
    }
    if is_playoff_mode:
        gamestats_row["playoff_id"] = resolved_playoff_id
        gamestats_row["game_number"] = final_game_number

    # 7. Upsert gamestats
    supabase.insert(gamestats_table, gamestats_row, upsert=True, on_conflict="game_id")

    # 8. Assemble and insert player stats
    home_goals_cnt = int(ht["goals"])
    away_goals_cnt = int(at["goals"])
    is_home_win = home_goals_cnt > away_goals_cnt
    is_away_win = away_goals_cnt > home_goals_cnt

    gwg_scorer_name: Optional[str] = None
    otg_scorer_name: Optional[str] = None

    if is_home_win:
        home_scoring = [g for g in game["goals"] if g["side"] == "Home"]
        if len(home_scoring) > away_goals_cnt:
            gwg_scorer_name = home_scoring[away_goals_cnt]["scorer"]
    elif is_away_win:
        away_scoring = [g for g in game["goals"] if g["side"] == "Away"]
        if len(away_scoring) > home_goals_cnt:
            gwg_scorer_name = away_scoring[home_goals_cnt]["scorer"]

    if game["isOT"] and (is_home_win or is_away_win) and game["goals"]:
        last_goal = game["goals"][-1]
        if int(last_goal["period"]) >= 4:
            otg_scorer_name = last_goal["scorer"]

    player_stats_rows: List[Dict[str, Any]] = []

    for skaters_list, t_id in [(game["awaySkaters"], away_team_id), (game["homeSkaters"], home_team_id)]:
        for s in skaters_list:
            s_name = (s.get("name") or "").strip()
            if not s_name or s_name == "--":
                continue
            ppg = sum(1 for g in game["goals"] if g["scorer"] == s_name and str(g["type"]).startswith("PP"))
            shg = sum(1 for g in game["goals"] if g["scorer"] == s_name and str(g["type"]).startswith("SH"))
            goals = int(s.get("goals") or 0)
            assists = int(s.get("assists") or 0)
            shots = int(s.get("sog") or 0)
            checks = int(s.get("checks") or 0)
            pim = int(s.get("pim") or 0)
            ppp = int(s.get("ppp") or 0)
            shp = int(s.get("shp") or 0)
            evg = max(0, goals - ppg - shg)
            is_gwg = 1 if (gwg_scorer_name and s_name.lower() == gwg_scorer_name.strip().lower()) else 0
            is_otg = 1 if (otg_scorer_name and s_name.lower() == otg_scorer_name.strip().lower()) else 0

            toi_sec = parse_toi_seconds(s.get("toiSeconds") or s.get("toi"))
            if toi_sec == 0 and goals == 0 and assists == 0 and shots == 0 and checks == 0 and pim == 0 and ppp == 0 and shp == 0:
                continue

            player_stats_rows.append({
                "game_id": final_game_id,
                "league_id": s_id,
                "team_id": t_id,
                "player_id": get_player_id(s_name, t_id),
                "pos_played": s.get("pos") or "F",
                "goals": goals,
                "assists": assists,
                "shots": shots,
                "checks": checks,
                "pim": pim,
                "pp_points": ppp,
                "sh_points": shp,
                "evg": evg,
                "gwg": is_gwg,
                "otg": is_otg,
                "toi": parse_toi_seconds(s.get("toiSeconds") or s.get("toi")),
                "saves": 0,
                "shots_against": 0,
                "goals_against": 0,
                "is_win": False,
                "is_loss": False,
                "is_tie": False,
                "is_otl": False,
            })

    for goalies_list, t_id in [(game["awayGoalies"], away_team_id), (game["homeGoalies"], home_team_id)]:
        for g in goalies_list:
            g_name = (g.get("name") or "").strip()
            if not g_name or g_name == "--":
                continue
            g_toi_sec = parse_toi_seconds(g.get("toiSeconds") or g.get("toi"))
            if g_toi_sec == 0 and int(g.get("shots") or 0) == 0 and int(g.get("saves") or 0) == 0 and int(g.get("ga") or 0) == 0 and not (g.get("w") or g.get("l") or g.get("t") or g.get("otl")) and int(g.get("goals") or 0) == 0 and int(g.get("assists") or 0) == 0:
                continue
            player_stats_rows.append({
                "game_id": final_game_id,
                "league_id": s_id,
                "team_id": t_id,
                "player_id": get_player_id(g_name, t_id),
                "pos_played": "G",
                "goals": int(g.get("goals") or 0),
                "assists": int(g.get("assists") or 0),
                "shots": 0,
                "checks": 0,
                "pim": 0,
                "pp_points": 0,
                "sh_points": 0,
                "evg": 0,
                "gwg": 0,
                "otg": 0,
                "toi": parse_toi_seconds(g.get("toiSeconds") or g.get("toi")),
                "saves": int(g.get("saves") or 0),
                "shots_against": int(g.get("shots") or 0),
                "goals_against": int(g.get("ga") or 0),
                "is_win": bool(g.get("w")),
                "is_loss": bool(g.get("l")),
                "is_tie": bool(g.get("t")),
                "is_otl": bool(g.get("otl")),
            })

    player_stats_table = "league_playoff_player_stats_master" if is_playoff_mode else "league_player_stats_master"
    supabase.delete(player_stats_table, {"game_id": f"eq.{final_game_id}"})
    if player_stats_rows:
        supabase.insert(player_stats_table, player_stats_rows)

    # 9. Insert scoring rows
    scoring_rows = []
    for g in game["goals"]:
        g_team_id = home_team_id if g["side"] == "Home" else away_team_id
        g_team_code = home_team_code if g["side"] == "Home" else away_team_code
        a1_valid = bool(g.get("assist1") and g["assist1"] != "--")
        a2_valid = bool(g.get("assist2") and g["assist2"] != "--")
        scoring_rows.append({
            "game_id": final_game_id,
            "league_id": s_id,
            "period": int(g["period"]),
            "time": str(g["time"]),
            "team_id": g_team_id,
            "team": g_team_code,
            "scorer_id": get_player_id(g["scorer"], g_team_id),
            "scorer": str(g["scorer"]),
            "assist1_id": get_player_id(g["assist1"], g_team_id) if a1_valid else None,
            "assist1": str(g["assist1"]) if a1_valid else None,
            "assist2_id": get_player_id(g["assist2"], g_team_id) if a2_valid else None,
            "assist2": str(g["assist2"]) if a2_valid else None,
            "way": str(g.get("type") or "EV"),
        })

    scoring_table = "league_playoff_scoring" if is_playoff_mode else "league_scoring"
    supabase.delete(scoring_table, {"game_id": f"eq.{final_game_id}"})
    if scoring_rows:
        supabase.insert(scoring_table, scoring_rows)

    # 10. Insert penalty rows
    penalty_rows = []
    for p in game["penalties"]:
        p_team_id = home_team_id if p["side"] == "Home" else away_team_id
        p_team_code = home_team_code if p["side"] == "Home" else away_team_code
        penalty_rows.append({
            "game_id": final_game_id,
            "league_id": s_id,
            "period": int(p["period"]),
            "time": str(p["time"]),
            "team_id": p_team_id,
            "team": p_team_code,
            "player_id": get_player_id(p["player"], p_team_id),
            "player": str(p["player"]),
            "penalty_type": str(p["type"]),
        })

    penalties_table = "league_playoff_penalties" if is_playoff_mode else "league_penalties"
    supabase.delete(penalties_table, {"game_id": f"eq.{final_game_id}"})
    if penalty_rows:
        supabase.insert(penalties_table, penalty_rows)

    playoff_series_summary: Optional[str] = None
    if is_playoff_mode:
        updated_po_games = supabase.select(
            "league_playoff_gamestats",
            {
                "select": "game_id,game_number,home_team_id,away_team_id,home_score,away_score",
                "playoff_id": f"eq.{resolved_playoff_id}",
                "order": "game_number.asc",
            },
        )
        s_home_id = int((active_playoff_series or {}).get("home_team_id") or home_team_id)
        s_away_id = int((active_playoff_series or {}).get("away_team_id") or away_team_id)
        s_len = int((active_playoff_series or {}).get("series_length") or 7)
        wins_needed = math.ceil(s_len / 2.0)

        s_home_wins = 0
        s_away_wins = 0
        for g in updated_po_games or []:
            hs = int(g.get("home_score") or 0)
            as_ = int(g.get("away_score") or 0)
            w_id = int(g["home_team_id"]) if hs > as_ else (int(g["away_team_id"]) if as_ > hs else 0)
            if w_id == s_home_id:
                s_home_wins += 1
            elif w_id == s_away_id:
                s_away_wins += 1

        series_winner_id = s_home_id if s_home_wins >= wins_needed else (s_away_id if s_away_wins >= wins_needed else None)
        is_now_complete = bool(series_winner_id)

        supabase.update(
            "league_playoffs",
            {"playoff_id": f"eq.{resolved_playoff_id}"},
            {"is_complete": is_now_complete, "winner_id": series_winner_id},
        )
        try:
            supabase.rpc("sync_playoff_series", {"p_playoff_id": resolved_playoff_id})
        except Exception:
            pass

        # Advance and re-seed next round in league_playoffs when all matchups in a round finish
        try:
            all_season_series = supabase.select(
                "league_playoffs",
                {"select": "*", "league_id": f"eq.{s_id}", "order": "playoff_id.asc"},
            )
            all_season_po_games = supabase.select(
                "league_playoff_gamestats",
                {"select": "playoff_id,game_number,home_team_id,away_team_id,home_score,away_score", "league_id": f"eq.{s_id}"},
            )
            norm_lbl = lambda val: re.sub(r"[\s\-_]+", "", str(val or "")).lower()

            def evaluate_series_winner(series_row: Optional[Dict[str, Any]]) -> Optional[Dict[str, int]]:
                if not series_row:
                    return None
                p_id = int(series_row.get("playoff_id") or series_row.get("id") or 0)
                s_l = int(series_row.get("series_length") or 7)
                needed = math.ceil(s_l / 2.0)
                h_id = int(series_row.get("home_team_id") or 0)
                a_id = int(series_row.get("away_team_id") or 0)
                if not h_id or not a_id:
                    return None
                h_w = 0
                a_w = 0
                for g in all_season_po_games or []:
                    if int(g.get("playoff_id") or 0) == p_id:
                        hs = int(g.get("home_score") or 0)
                        as_ = int(g.get("away_score") or 0)
                        w_t = int(g["home_team_id"]) if hs > as_ else (int(g["away_team_id"]) if as_ > hs else 0)
                        if w_t == h_id:
                            h_w += 1
                        elif w_t == a_id:
                            a_w += 1
                if h_w >= needed:
                    return {"winnerId": h_id, "winnerSeed": int(series_row.get("home_team_seed") or 99)}
                if a_w >= needed:
                    return {"winnerId": a_id, "winnerSeed": int(series_row.get("away_team_seed") or 99)}
                return None

            def upsert_next_round_matchup(
                label: str,
                top_winner: Optional[Dict[str, int]],
                bot_winner: Optional[Dict[str, int]],
            ):
                if not top_winner and not bot_winner:
                    return
                target_norm = norm_lbl(label)
                existing_target = next(
                    (
                        m for m in (all_season_series or [])
                        if norm_lbl(m.get("match_label")) == target_norm or norm_lbl(m.get("round_name")) == target_norm
                    ),
                    None,
                )
                if existing_target:
                    ex_pid = int(existing_target["playoff_id"])
                    has_games = any(int(g.get("playoff_id") or 0) == ex_pid for g in (all_season_po_games or []))
                    if not has_games:
                        updates: Dict[str, Any] = {}
                        if top_winner:
                            updates["home_team_id"] = top_winner["winnerId"]
                            if top_winner["winnerSeed"] != 99:
                                updates["home_team_seed"] = top_winner["winnerSeed"]
                        if bot_winner:
                            updates["away_team_id"] = bot_winner["winnerId"]
                            if bot_winner["winnerSeed"] != 99:
                                updates["away_team_seed"] = bot_winner["winnerSeed"]
                        if updates:
                            supabase.update("league_playoffs", {"playoff_id": f"eq.{ex_pid}"}, updates)
                elif top_winner and bot_winner:
                    latest_row = supabase.select("league_playoffs", {"select": "playoff_id", "order": "playoff_id.desc", "limit": "1"})
                    next_id = (int(latest_row[0]["playoff_id"]) + 1) if latest_row and latest_row[0].get("playoff_id") else 1
                    new_m: Dict[str, Any] = {
                        "playoff_id": next_id,
                        "league_id": s_id,
                        "round_name": label,
                        "match_label": label,
                        "home_team_id": top_winner["winnerId"],
                        "away_team_id": bot_winner["winnerId"],
                        "series_length": 7,
                    }
                    if top_winner["winnerSeed"] != 99:
                        new_m["home_team_seed"] = top_winner["winnerSeed"]
                    if bot_winner["winnerSeed"] != 99:
                        new_m["away_team_seed"] = bot_winner["winnerSeed"]
                    supabase.insert("league_playoffs", new_m, upsert=True, on_conflict="playoff_id")

            def find_series(lbl: str) -> Optional[Dict[str, Any]]:
                n = norm_lbl(lbl)
                return next((m for m in (all_season_series or []) if norm_lbl(m.get("match_label")) == n or norm_lbl(m.get("round_name")) == n), None)

            def advance_pair_db(target_lbl: str, top_lbl: str, bot_lbl: str) -> None:
                w_top = evaluate_series_winner(find_series(top_lbl))
                w_bot = evaluate_series_winner(find_series(bot_lbl))
                if not w_top and not w_bot:
                    return
                if w_top and w_bot:
                    ordered = sorted([w_top, w_bot], key=lambda x: x["winnerSeed"])
                    upsert_next_round_matchup(target_lbl, ordered[0], ordered[1])
                elif w_top:
                    upsert_next_round_matchup(target_lbl, w_top, None)
                elif w_bot:
                    upsert_next_round_matchup(target_lbl, None, w_bot)

            advance_pair_db("Semi Finals 1", "Quarter Finals 1", "Quarter Finals 2")
            advance_pair_db("Semi Finals 2", "Quarter Finals 3", "Quarter Finals 4")
            advance_pair_db("Semi Finals 3", "Quarter Finals 5", "Quarter Finals 6")
            advance_pair_db("Semi Finals 4", "Quarter Finals 7", "Quarter Finals 8")
            advance_pair_db("Conference Finals 1", "Semi Finals 1", "Semi Finals 2")
            advance_pair_db("Conference Finals 2", "Semi Finals 3", "Semi Finals 4")
            advance_pair_db("Finals", "Conference Finals 1", "Conference Finals 2")
        except Exception as adv_err:
            print(f"Non-fatal warning advancing playoff bracket: {adv_err}")

        round_name = (active_playoff_series or {}).get("round_name") or "Playoffs"
        playoff_series_summary = (
            f"Playoff Series #{resolved_playoff_id} ({round_name} • Game #{final_game_number}): "
            f"Series Wins {s_home_wins}-{s_away_wins}{' [SERIES COMPLETE]' if is_now_complete else ''}"
        )
    else:
        try:
            supabase.update(
                "league_schedule",
                {"game_id": f"eq.{final_game_id}"},
                {"played": True, "game_meta": game_meta},
            )
        except Exception:
            supabase.update(
                "league_schedule",
                {"game_id": f"eq.{final_game_id}"},
                {"played": "true", "game_meta": game_meta},
            )
        recalculate_and_save_season_standings(s_id)

    embed_dict = build_discord_boxscore_embed(
        game=game,
        season_id=s_id,
        game_id=final_game_id,
        home_team=home_team or {"team_name": home_team_code, "abbreviation": home_team_code},
        away_team=away_team or {"team_name": away_team_code, "abbreviation": away_team_code},
        home_coach_name=home_coach_name,
        away_coach_name=away_coach_name,
        playoff_summary=playoff_series_summary,
        uploaded_by=uploaded_by,
    )

    boxscore_png_bytes = render_retro_boxscore_png(
        game=game,
        away_team=away_team or {"team_name": away_team_code, "abbreviation": away_team_code},
        home_team=home_team or {"team_name": home_team_code, "abbreviation": home_team_code},
    )
    if boxscore_png_bytes:
        embed_dict["image"] = {"url": "attachment://boxscore.png"}

    standings_png_bytes = render_standings_and_leaders_png(s_id, is_playoff_mode)
    playoff_bracket_png_bytes = render_playoff_bracket_png(s_id) if is_playoff_mode else None

    return {
        "success": True,
        "alreadyPlayed": False,
        "gameId": final_game_id,
        "seasonId": s_id,
        "gameMode": "Playoffs" if is_playoff_mode else "Season",
        "gameResults": game_results,
        "playoffSeriesSummary": playoff_series_summary,
        "embed": embed_dict,
        "boxscorePngBytes": boxscore_png_bytes,
        "standingsPngBytes": standings_png_bytes,
        "playoffBracketPngBytes": playoff_bracket_png_bytes,
    }


# =====================================================================
# 5. DISCORD ATTACHMENT FILTER & LIVE BOT EVENT HANDLERS
# =====================================================================

SAVESTATE_EXT_REGEX = re.compile(r"\.(state\d*|sav|srm|gp\d*|bin|gz)$", re.IGNORECASE)


def is_savestate_attachment(att: discord.Attachment) -> bool:
    """Determines whether a Discord attachment is a Genesis Plus GX / RetroArch save state."""
    fname = (att.filename or "").lower()
    # Explicitly match known save state extensions
    if SAVESTATE_EXT_REGEX.search(fname):
        return True
    # Also accept extensionless or custom-named files if their byte size matches RetroArch Genesis save states (52KB - 250KB)
    # and they are not images/videos/audio/text
    if 52000 <= (att.size or 0) <= 260000:
        bad_exts = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".mov", ".mp3", ".wav", ".pdf", ".txt", ".json", ".csv", ".zip")
        if not fname.endswith(bad_exts):
            return True
    return False


# =====================================================================
# 5B. #SEASON-GAMES COMMANDS (SEASON GAMES, <ABBR>, FUCK OFF, GAME ON)
# =====================================================================

NOTIFICATIONS_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "coach_notifications.json")

TEAM_DISCORD_META: Dict[str, Dict[str, str]] = {
    "AUT": {"user_id": "692039117499793469", "emoji": "<:AUT:1040258542629826691>", "nick": "autobahn", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Autobahn%20Autobahn%20Logo.png"},
    "BAR": {"user_id": "882284979441258567", "emoji": "<:BAR:1447630932646301789>", "nick": "Dasri", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Barrie%20Dolts%20Logo.png"},
    "BAY": {"user_id": "241253413722128385", "emoji": "<:BAY:1039716048510922802>", "nick": "Jer_33", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Baytown%20Thunder%20Logo.png"},
    "BFC": {"user_id": "1211045587483623484", "emoji": "<:BFC:1302374329627054195>", "nick": "krav1", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Betty%20Ford%20Clinic%20Logo.png"},
    "DHG": {"user_id": "378302345894821909", "emoji": "<:DHG:1486729741531873450>", "nick": "vancecookcobxin", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Devin%20Hill%20Goblins%20Logo.png"},
    "ETI": {"user_id": "873331397782294569", "emoji": "<:ETI:1537785577532039228>", "nick": "LHX", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Easter%20Island%20Stone%20Heads%20Logo.png"},
    "GRH": {"user_id": "692183787509121046", "emoji": "<:GRH:1486729910587490445>", "nick": "Moses Bogart", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Grand%20River%20Herons%20Logo.png"},
    "HAM": {"user_id": "932744327191490651", "emoji": "<:HAM:943898587786539130>", "nick": "Derek Sutton", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/hamilton_mustangs.png"},
    "HIG": {"user_id": "694697891733831761", "emoji": "<:HIG:897245384601108490>", "nick": "Wolf", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Highland%20Wolf%20Logo.png"},
    "ING": {"user_id": "939897819681161296", "emoji": "<:ING:1301994681206444085>", "nick": "Don Don", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Inglewood%20Monstars%20Logo%20S3.png"},
    "ITA": {"user_id": "373576219129806859", "emoji": "<:ITA:1447630715675082804>", "nick": "MarcusVickEBC", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Italy%20EBC%20Logo%20S12.png"},
    "KAR": {"user_id": "918583918838546443", "emoji": "<:KAK:1447629097684697270>", "nick": "MattyA", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Karolina%20Kaos%20Logo.png"},
    "MGG": {"user_id": "691684263698890878", "emoji": "<:MGG:897245448522313738>", "nick": "gaelicgopher", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Minnesota%20Golden%20Gophers%20Logo.png"},
    "MHA": {"user_id": "1049531278531252224", "emoji": "<:MHA:1347389671059095604>", "nick": "Red", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Maryhill%20Alumni%20Logo.png"},
    "MHT": {"user_id": "144973906070077440", "emoji": "<:MHT:918212056094740510>", "nick": "segathon", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Minhattrick%20Swayzes%20Logo%20S13.png"},
    "NBK": {"user_id": "897864347764789290", "emoji": "<:NBK:996400156272496641>", "nick": "Unholy Grail", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/North%20Bay%20Knights%20Logo.png"},
    "OCW": {"user_id": "1009697012737921055", "emoji": "<:OCW:1030175920536948868>", "nick": "MNYoda84", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Orange%20County%20Weststars%20Logo.png"},
    "PIT": {"user_id": "874726051790594051", "emoji": "<:PIT:878396735028863007>", "nick": "Adolf Oliver Nipples", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Pitt%20Intramurals%20Logo.png"},
    "PRO": {"user_id": "904808850681638923", "emoji": "<:PRO:918148694820405308>", "nick": "Lloyd10xmas", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Providence%20Sea%20Bass%20Logo.png"},
    "RIC": {"user_id": "691747327261671534", "emoji": "<:RIC:878393337009283134>", "nick": "bclinton_666", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Richfield%20Oracles%20Logo.png"},
    "ROC": {"user_id": "291228680825470978", "emoji": "<:ROC:1447630562826387631>", "nick": "The Villain CTJ", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Rockford%20Villains%20Logo.png"},
    "SHS": {"user_id": "1042251245609549824", "emoji": "<:SHS:1249551823161786388>", "nick": "Marylandmike", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/South%20Hills%20Shindigaz%20Logo.png"},
    "SUM": {"user_id": "874999566200635393", "emoji": "<:SUM:878394564468170812>", "nick": "Pink Elephants", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Sumter%20Trash%20Logo.png"},
    "SVF": {"user_id": "628241421781958684", "emoji": "<:SVF:923579320251842580>", "nick": "Chalky", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Sugar%20Valley%20Firebirds%20Logo%20S3.png"},
    "TAI": {"user_id": "802225742523531325", "emoji": "<:TAI:890999468743348224>", "nick": "NathanMB", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Taipei%20Typhoons%20Logo.png"},
    "TBP": {"user_id": "694688440440193186", "emoji": "<:TBP:890999482970435665>", "nick": "shawnbell_", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Thunder%20Bay%20Pike%20Logo.png"},
    "TEG": {"user_id": "582240735793774618", "emoji": "<:THT:918653529953034240>", "nick": "Puss", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Tegucigalpa%20Ticklepuss%20Logo.png"},
    "VHV": {"user_id": "869668599550332958", "emoji": "<:VHV:1303127943098138725>", "nick": "ultramagnus", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Valhalla%20Vikings%20Logo.png"},
    "WDY": {"user_id": "204681486484373505", "emoji": "<:WDY:1300956776652345356>", "nick": "NewJerseyKiller", "logo": f"{SUPABASE_URL}/storage/v1/object/public/teams/Woodlynne%20Rats%20Logo.png"},
    # Original 6
    "BOS": {"user_id": "378302345894821909", "emoji": "🐻 **BOS**", "nick": "vancecookcobxin", "logo": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/boston_bruins%201927.png"},
    "CHI": {"user_id": "939897819681161296", "emoji": "🪶 **CHI**", "nick": "Don Don", "logo": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/chicago_black_hawks%201927.png"},
    "DET": {"user_id": "918583918838546443", "emoji": "🐾 **DET**", "nick": "MattyA", "logo": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/detroit_cougars%201927.png"},
    "DTC": {"user_id": "918583918838546443", "emoji": "🐾 **DTC**", "nick": "MattyA", "logo": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/detroit_cougars%201927.png"},
    "MTL": {"user_id": "869668599550332958", "emoji": "🔵 **MTL**", "nick": "ultramagnus", "logo": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/montreal_canadiens%201927.png"},
    "NYR": {"user_id": "291228680825470978", "emoji": "🗽 **NYR**", "nick": "The Villain CTJ", "logo": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/new_york_rangers%201927.png"},
    "TOR": {"user_id": "932744327191490651", "emoji": "🍁 **TOR**", "nick": "Derek Sutton", "logo": f"{SUPABASE_URL}/storage/v1/object/public/nhl%20logo/toronto_maple_leafs%201927.png"},
}


def load_coach_notifications() -> Dict[str, List[str]]:
    if os.path.isfile(NOTIFICATIONS_FILE_PATH):
        try:
            with open(NOTIFICATIONS_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {
                    "muted_user_ids": [str(x) for x in data.get("muted_user_ids", [])],
                    "muted_abbrs": [str(x).upper() for x in data.get("muted_abbrs", [])],
                }
        except Exception:
            pass
    return {"muted_user_ids": [], "muted_abbrs": []}


def save_coach_notifications(data: Dict[str, List[str]]) -> None:
    os.makedirs(os.path.dirname(NOTIFICATIONS_FILE_PATH), exist_ok=True)
    with open(NOTIFICATIONS_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def set_coach_muted(user_id: str, abbr: str, muted: bool) -> None:
    state = load_coach_notifications()
    uids = set(state.get("muted_user_ids", []))
    abbrs = set(state.get("muted_abbrs", []))
    if muted:
        if user_id:
            uids.add(str(user_id))
        if abbr:
            abbrs.add(str(abbr).upper())
    else:
        uids.discard(str(user_id))
        abbrs.discard(str(abbr).upper())
    save_coach_notifications({"muted_user_ids": sorted(uids), "muted_abbrs": sorted(abbrs)})


def is_coach_muted(user_id: str, abbr: str) -> bool:
    state = load_coach_notifications()
    if user_id and str(user_id) in state.get("muted_user_ids", []):
        return True
    if abbr and str(abbr).upper() in state.get("muted_abbrs", []):
        return True
    return False


def resolve_team_abbr_for_user(user_id: str, username: str, display_name: str, is_orig6: bool = False) -> Optional[str]:
    orig6_set = {"BOS", "CHI", "DET", "DTC", "MTL", "NYR", "TOR"}
    for abbr, meta in TEAM_DISCORD_META.items():
        if (abbr in orig6_set) != is_orig6:
            continue
        if meta.get("user_id") == str(user_id):
            return abbr
    low_u = (username or "").lower()
    low_d = (display_name or "").lower()
    for abbr, meta in TEAM_DISCORD_META.items():
        if (abbr in orig6_set) != is_orig6:
            continue
        nick = (meta.get("nick") or "").lower()
        if nick and (nick == low_u or nick == low_d or nick in low_u or nick in low_d):
            return abbr
    return None


def get_remaining_opponents_for_team(abbr: str, s_id: int = 40) -> Tuple[int, List[Tuple[str, int]]]:
    """
    Returns (total_remaining_games, [(opp_abbr, remaining_count), ...]) for `abbr` in season `s_id`.
    """
    abbr_up = abbr.strip().upper()
    if abbr_up == "THT":
        abbr_up = "TEG"
    elif abbr_up == "KAK":
        abbr_up = "KAR"

    teams_rows = supabase.select("league_teams", {"select": "*", "league_id": f"eq.{s_id}"}) or []
    if not teams_rows:
        teams_rows = supabase.select("league_teams", {"select": "*"}) or []

    tid_to_abbr: Dict[int, str] = {}
    target_tid: Optional[int] = None
    for t in teams_rows:
        if t.get("team_id") is not None:
            tid = int(t["team_id"])
            t_ab = (t.get("abbreviation") or "").strip().upper()
            tid_to_abbr[tid] = t_ab
            if t_ab == abbr_up and (int(t.get("league_id") or 0) == s_id or target_tid is None):
                target_tid = tid

    if target_tid is None:
        return (0, [])

    sched_rows = supabase.select("league_schedule", {"select": "*", "league_id": f"eq.{s_id}"}) or []
    stats_rows = supabase.select("league_gamestats", {"select": "game_id,home_team_id,away_team_id", "league_id": f"eq.{s_id}"}) or []
    played_game_ids = {str(g.get("game_id")).strip() for g in stats_rows if g.get("game_id") is not None}

    opp_counts: Dict[str, int] = {}
    total_rem = 0
    for g in sched_rows:
        gid = str(g.get("game_id") or "").strip()
        raw_played = str(g.get("played") or "").strip().lower()
        is_played = raw_played in ("true", "1", "y") or (gid and gid in played_game_ids)
        if is_played:
            continue
        h_id = int(g.get("home_team_id") or 0)
        a_id = int(g.get("away_team_id") or 0)
        if h_id == target_tid and a_id in tid_to_abbr:
            opp_ab = tid_to_abbr[a_id]
            opp_counts[opp_ab] = opp_counts.get(opp_ab, 0) + 1
            total_rem += 1
        elif a_id == target_tid and h_id in tid_to_abbr:
            opp_ab = tid_to_abbr[h_id]
            opp_counts[opp_ab] = opp_counts.get(opp_ab, 0) + 1
            total_rem += 1

    sorted_opps = sorted(opp_counts.items(), key=lambda x: (-x[1], x[0]))
    return (total_rem, sorted_opps)


def render_remaining_opponents_png(opp_counts: List[Tuple[str, int]]) -> Optional[bytes]:
    """
    Renders the horizontal opponent logo strip with the remaining game count badge on each logo
    (matching media_1793228343699_a33526d5.png: 1 in magenta, 2+ in bright green).
    """
    if not opp_counts:
        return None
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return None

    cell_w, cell_h = 42, 38
    pad_x, pad_y = 6, 4
    W = pad_x * 2 + len(opp_counts) * cell_w
    H = pad_y * 2 + cell_h

    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Dark rounded pill background matching Discord dark card (#2b2d31)
    draw.rounded_rectangle((0, 0, W - 1, H - 1), radius=8, fill=(43, 45, 49, 255))

    font_dir = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts")
    f_num = ImageFont.load_default()
    for fname in ("verdanab.ttf", "arialbd.ttf", "tahomabd.ttf"):
        fpath = os.path.join(font_dir, fname)
        if os.path.isfile(fpath):
            try:
                f_num = ImageFont.truetype(fpath, 16)
                break
            except Exception:
                pass

    x = pad_x
    for opp_abbr, cnt in opp_counts:
        logo_url = TEAM_DISCORD_META.get(opp_abbr, {}).get("logo") or f"{SUPABASE_URL}/storage/v1/object/public/Team%20Logos/{opp_abbr}.png"
        logo_im = _fetch_pil_image(logo_url)
        if logo_im is not None:
            lw, lh = 34, 30
            l_res = logo_im.resize((lw, lh), Image.Resampling.LANCZOS)
            img.paste(l_res, (x + 2, pad_y + 6), l_res)
        else:
            draw.text((x + 6, pad_y + 12), opp_abbr, fill=(255, 255, 255, 255), font=f_num)

        # Draw count badge in top-right of cell (1 = magenta #ff55ff, 2+ = neon green #44ff66)
        num_str = str(cnt)
        num_color = (255, 85, 255, 255) if cnt == 1 else (68, 255, 102, 255)
        nx, ny = x + cell_w - 4, pad_y + 1
        # Crisp black outline for readability over any logo
        for ox, oy in ((-1, -1), (1, -1), (-1, 1), (1, 1), (0, -1), (0, 1), (-1, 0), (1, 0)):
            draw.text((nx + ox, ny + oy), num_str, fill=(0, 0, 0, 255), font=f_num, anchor="ra")
        draw.text((nx, ny), num_str, fill=num_color, font=f_num, anchor="ra")
        x += cell_w

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class NHL95SaveStateBot(discord.Client):
    def __init__(self, backfill_hours: int = 24, allowed_channel_ids: Optional[List[int]] = None, **kwargs):
        super().__init__(**kwargs)
        self.backfill_hours = backfill_hours
        self.allowed_channel_ids = set(allowed_channel_ids or [])
        self.processed_attachment_ids = set()

    def is_channel_allowed(self, channel: discord.abc.GuildChannel) -> bool:
        if self.allowed_channel_ids:
            return channel.id in self.allowed_channel_ids
        # If the server uses {year}-save-states channels, ignore non-savestate channels like {year}-boxscores
        ch_name = (getattr(channel, "name", "") or "").lower()
        if "boxscore" in ch_name:
            return False
        return True

    def find_boxscore_channel(self, source_channel: discord.TextChannel, season_id: int) -> discord.TextChannel:
        """
        Finds the matching {year}-boxscores channel in the same Discord server.
        For example:
          #2014-save-states -> #2014-boxscores
          #1927-save-states -> #1927-boxscores
        Falls back to source_channel if no matching boxscores channel exists.
        """
        guild = source_channel.guild
        if not guild:
            return source_channel

        src_name = source_channel.name.lower()
        year_match = re.search(r"\b(19\d{2}|20\d{2})\b", src_name)
        year_str = year_match.group(1) if year_match else str(SEASON_ID_TO_YEAR.get(int(season_id), ""))

        candidate_names = []
        # Direct replacement: e.g. "2013-saves" or "2014-save-states" -> "2013-boxscores" / "2014-boxscores"
        replaced = re.sub(r"(save[-_]?states?|saves?)", "boxscores", src_name)
        if replaced != src_name:
            candidate_names.append(replaced)
            candidate_names.append(re.sub(r"(save[-_]?states?|saves?)", "boxscore", src_name))

        if year_str:
            candidate_names.extend([
                f"{year_str}-boxscores",
                f"{year_str}-boxscore",
                f"{year_str}_boxscores",
            ])

        for cand in candidate_names:
            for ch in guild.text_channels:
                if ch.name.lower() == cand:
                    return ch

        if year_str:
            for ch in guild.text_channels:
                cname = ch.name.lower()
                if year_str in cname and "boxscore" in cname:
                    return ch

        return source_channel

    async def has_bot_reaction(self, message: discord.Message) -> bool:
        for reaction in message.reactions:
            if str(reaction.emoji) in ("✅", "⚠️", "❌"):
                async for user in reaction.users():
                    if self.user and user.id == self.user.id:
                        return True
        return False

    async def process_savestate_message(self, message: discord.Message, is_backfill: bool = False) -> None:
        if message.author.bot:
            return
        if not isinstance(message.channel, discord.TextChannel):
            return
        if not self.is_channel_allowed(message.channel):
            return

        savestate_attachments = [att for att in message.attachments if is_savestate_attachment(att)]
        if not savestate_attachments:
            return

        savestate_attachments.sort(key=lambda a: (a.filename or "").lower())

        if is_backfill and await self.has_bot_reaction(message):
            return

        total_atts = len(savestate_attachments)
        for idx_att, att in enumerate(savestate_attachments):
            is_last_att = idx_att == (total_atts - 1)
            if att.id in self.processed_attachment_ids:
                continue
            self.processed_attachment_ids.add(att.id)

            channel_name = message.channel.name
            author_name = message.author.display_name
            print(f"\n📥 [{'BACKFILL' if is_backfill else 'LIVE'}] Detected save state '{att.filename}' ({att.size} bytes) from {author_name} in #{channel_name}")

            try:
                await message.add_reaction("⏳")
            except Exception:
                pass

            try:
                raw_bytes = await att.read()

                # Run blocking HTTP/Supabase I/O in a worker thread so the Discord heartbeat never blocks
                season_id, game_mode, allow_overwrite = await asyncio.to_thread(
                    detect_context_from_discord,
                    raw_bytes,
                    channel_name,
                    message.clean_content or "",
                    att.filename or "",
                )
                print(f"   🔎 Auto-Detected: Season {season_id} ({get_league_code(season_id)}) | Mode: {game_mode} | Overwrite: {allow_overwrite}")

                result = await asyncio.to_thread(
                    ingest_save_state_to_supabase,
                    raw_bytes,
                    season_id,
                    game_mode,
                    allow_overwrite,
                    author_name,
                )

                try:
                    await message.remove_reaction("⏳", self.user)
                except Exception:
                    pass

                if result.get("success"):
                    try:
                        await message.add_reaction("✅")
                    except Exception:
                        pass
                    embed = discord.Embed.from_dict(result["embed"])
                    mode_badge = "Playoffs" if result.get("gameMode") == "Playoffs" else "Regular Season"
                    target_boxscore_ch = self.find_boxscore_channel(message.channel, int(result["seasonId"]))
                    if target_boxscore_ch.id != message.channel.id:
                        try:
                            if result.get("boxscorePngBytes"):
                                file_att = discord.File(io.BytesIO(result["boxscorePngBytes"]), filename="boxscore.png")
                                await target_boxscore_ch.send(file=file_att)
                            else:
                                await target_boxscore_ch.send(embed=embed)
                            if is_last_att and result.get("playoffBracketPngBytes"):
                                br_att = discord.File(io.BytesIO(result["playoffBracketPngBytes"]), filename="playoff_bracket.png")
                                await target_boxscore_ch.send(file=br_att)
                            if is_last_att and result.get("standingsPngBytes"):
                                st_att = discord.File(io.BytesIO(result["standingsPngBytes"]), filename="standings_leaders.png")
                                await target_boxscore_ch.send(file=st_att)
                        except Exception as send_err:
                            print(f"   ⚠️ Could not post to #{target_boxscore_ch.name} ({send_err}), trying webhook fallback...")
                            if DISCORD_BOXSCORE_WEBHOOK_URL and result.get("boxscorePngBytes"):
                                wh = discord.SyncWebhook.from_url(DISCORD_BOXSCORE_WEBHOOK_URL)
                                await asyncio.to_thread(
                                    wh.send,
                                    file=discord.File(io.BytesIO(result["boxscorePngBytes"]), filename="boxscore.png"),
                                )
                                if is_last_att and result.get("playoffBracketPngBytes"):
                                    await asyncio.to_thread(
                                        wh.send,
                                        file=discord.File(io.BytesIO(result["playoffBracketPngBytes"]), filename="playoff_bracket.png"),
                                    )
                                if is_last_att and result.get("standingsPngBytes"):
                                    await asyncio.to_thread(
                                        wh.send,
                                        file=discord.File(io.BytesIO(result["standingsPngBytes"]), filename="standings_leaders.png"),
                                    )
                        confirm_text = (
                            f"✅ **Save State Recorded to Database!** (`{att.filename}`)\n"
                            f"🏒 **{result['gameResults']}** • Game **#{result['gameId']}** ({mode_badge}) — "
                            f"Boxscore & Standings posted in {target_boxscore_ch.mention}!"
                        )
                        try:
                            await message.reply(content=confirm_text, mention_author=False)
                        except Exception:
                            pass
                        print(f"   ✅ SUCCESS: Saved Game #{result['gameId']} ({result['gameResults']}) and posted boxscore + standings to #{target_boxscore_ch.name}!")
                    else:
                        try:
                            if result.get("boxscorePngBytes"):
                                file_att = discord.File(io.BytesIO(result["boxscorePngBytes"]), filename="boxscore.png")
                                await message.reply(file=file_att, mention_author=False)
                            else:
                                await message.reply(embed=embed, mention_author=False)
                            if is_last_att and result.get("playoffBracketPngBytes"):
                                br_att = discord.File(io.BytesIO(result["playoffBracketPngBytes"]), filename="playoff_bracket.png")
                                await message.channel.send(file=br_att)
                            if is_last_att and result.get("standingsPngBytes"):
                                st_att = discord.File(io.BytesIO(result["standingsPngBytes"]), filename="standings_leaders.png")
                                await message.channel.send(file=st_att)
                        except Exception as reply_err:
                            print(f"   ⚠️ Could not reply in #{channel_name} ({reply_err}), trying webhook fallback...")
                            if DISCORD_BOXSCORE_WEBHOOK_URL and result.get("boxscorePngBytes"):
                                wh = discord.SyncWebhook.from_url(DISCORD_BOXSCORE_WEBHOOK_URL)
                                await asyncio.to_thread(
                                    wh.send,
                                    file=discord.File(io.BytesIO(result["boxscorePngBytes"]), filename="boxscore.png"),
                                )
                                if is_last_att and result.get("playoffBracketPngBytes"):
                                    await asyncio.to_thread(
                                        wh.send,
                                        file=discord.File(io.BytesIO(result["playoffBracketPngBytes"]), filename="playoff_bracket.png"),
                                    )
                                if is_last_att and result.get("standingsPngBytes"):
                                    await asyncio.to_thread(
                                        wh.send,
                                        file=discord.File(io.BytesIO(result["standingsPngBytes"]), filename="standings_leaders.png"),
                                    )
                        print(f"   ✅ SUCCESS: Saved Game #{result['gameId']} ({result['gameResults']}) and posted boxscore + standings in #{channel_name}!")

                elif result.get("alreadyPlayed"):
                    # If BoxscoreBot already recorded the series/game seconds earlier (or during catch-up),
                    # still post the updated Playoff Bracket & Standings on the last attachment of the batch!
                    try:
                        await message.add_reaction("✅")
                    except Exception:
                        pass
                    if is_last_att and (result.get("playoffBracketPngBytes") or result.get("standingsPngBytes")):
                        target_boxscore_ch = self.find_boxscore_channel(message.channel, int(result.get("seasonId") or season_id))
                        try:
                            if result.get("playoffBracketPngBytes"):
                                br_att = discord.File(io.BytesIO(result["playoffBracketPngBytes"]), filename="playoff_bracket.png")
                                await target_boxscore_ch.send(file=br_att)
                            if result.get("standingsPngBytes"):
                                st_att = discord.File(io.BytesIO(result["standingsPngBytes"]), filename="standings_leaders.png")
                                await target_boxscore_ch.send(file=st_att)
                            print(f"   ✅ Posted updated Playoff Bracket & Standings to #{target_boxscore_ch.name} for '{att.filename}'!")
                        except Exception as br_err:
                            print(f"   ⚠️ Could not post bracket to #{target_boxscore_ch.name}: {br_err}")
                    else:
                        print(f"   ℹ️ Already recorded in DB: {result.get('error')}")

                else:
                    try:
                        await message.add_reaction("❌")
                        await message.reply(
                            content=f"❌ **Could not save `{att.filename}`:** {result.get('error', 'Unknown error')}",
                            mention_author=False,
                        )
                    except Exception:
                        pass
                    print(f"   ❌ ERROR: {result.get('error')}")

            except Exception as err:
                try:
                    await message.remove_reaction("⏳", self.user)
                    await message.add_reaction("❌")
                except Exception:
                    pass
                print(f"   ❌ Exception processing '{att.filename}': {err}")
                if not is_backfill:
                    try:
                        await message.reply(
                            content=f"❌ **Failed to parse save state `{att.filename}`:** `{err}`",
                            mention_author=False,
                        )
                    except Exception:
                        pass

    async def on_ready(self):
        print("=" * 68)
        print(f"🏒 NHL95.net Live Save State Bot Online as: {self.user} (ID: {self.user.id})")
        print(f"🗄️  Supabase Endpoint: {SUPABASE_URL}")
        if self.allowed_channel_ids:
            print(f"📡 Restricted to Channel IDs: {sorted(self.allowed_channel_ids)}")
        else:
            print("📡 Listening for .state / .sav drops across all accessible text channels")
        print("=" * 68)

        if self.backfill_hours > 0:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=self.backfill_hours)
            print(f"🔄 Scanning last {self.backfill_hours}h (since {cutoff.strftime('%Y-%m-%d %H:%M UTC')}) for unprocessed save states...")
            for guild in self.guilds:
                for channel in guild.text_channels:
                    if not self.is_channel_allowed(channel):
                        continue
                    cname = channel.name.lower()
                    if not ("save" in cname or "test" in cname):
                        continue
                    perms = channel.permissions_for(guild.me)
                    if not (perms.read_messages and perms.read_message_history):
                        continue
                    try:
                        async for msg in channel.history(limit=50, after=cutoff, oldest_first=True):
                            await self.process_savestate_message(msg, is_backfill=True)
                    except Exception as e:
                        print(f"   Notice: Could not scan history in #{channel.name}: {e}")
            print("✅ Startup catch-up scan complete! Now listening live 24/7 for new save states...\n")

    async def process_season_games_command(self, message: discord.Message) -> None:
        if message.author.bot:
            return
        if not isinstance(message.channel, discord.TextChannel):
            return

        ch_name = (message.channel.name or "").lower()
        # Listen for game commands in #season-games, #games, #test, #testing
        if ch_name not in ("season-games", "games", "test", "testing") and "season-games" not in ch_name:
            return

        raw_text = (message.clean_content or message.content or "").strip()
        if not raw_text:
            return

        upper_text = re.sub(r"[!?.]+$", "", raw_text.upper()).strip()
        is_orig6 = ch_name == "games" or "192" in ch_name or "193" in ch_name or "orig" in ch_name
        s_id = 39 if is_orig6 else 40

        user_id_str = str(message.author.id)
        username_str = str(message.author.name or "")
        display_str = str(message.author.display_name or "")

        # 1. FUCK OFF -> Disable notifications for this coach
        if upper_text in ("FUCK OFF", "FUCKOFF", "DND", "MUTE"):
            user_abbr = resolve_team_abbr_for_user(user_id_str, username_str, display_str, is_orig6) or ""
            nick = TEAM_DISCORD_META.get(user_abbr, {}).get("nick") or display_str
            await asyncio.to_thread(set_coach_muted, user_id_str, user_abbr, True)
            await message.channel.send(f"`{nick} will not be alerted (FUCK OFF mode enabled — type GAME ON to turn notifications back on)`")
            return

        # 2. GAME ON -> Re-enable notifications for this coach (and check season games)
        if upper_text in ("GAME ON", "GAMEON", "UNMUTE"):
            user_abbr = resolve_team_abbr_for_user(user_id_str, username_str, display_str, is_orig6) or ""
            nick = TEAM_DISCORD_META.get(user_abbr, {}).get("nick") or display_str
            await asyncio.to_thread(set_coach_muted, user_id_str, user_abbr, False)
            await message.channel.send(f"{nick} will be alerted")
            if not user_abbr:
                return
            upper_text = "SEASON GAMES"

        # 2B. BRACKET / PLAYOFFS -> Render and post the live Playoff Bracket PNG
        if upper_text in ("BRACKET", "PLAYOFF BRACKET", "PLAYOFFS"):
            bracket_bytes = await asyncio.to_thread(render_playoff_bracket_png, s_id)
            if bracket_bytes:
                br_file = discord.File(io.BytesIO(bracket_bytes), filename="playoff_bracket.png")
                await message.channel.send(file=br_file)
            return

        # 3. SEASON GAMES -> Ping all unmuted coaches that still have games left vs the sender
        if upper_text in ("SEASON GAMES", "SEASONGAMES"):
            user_abbr = resolve_team_abbr_for_user(user_id_str, username_str, display_str, is_orig6)
            if not user_abbr:
                return
            t_meta = TEAM_DISCORD_META.get(user_abbr, {})
            emoji_str = t_meta.get("emoji") or f"**{user_abbr}**"
            nick = t_meta.get("nick") or display_str

            total_rem, opp_counts = await asyncio.to_thread(get_remaining_opponents_for_team, user_abbr, s_id)
            if total_rem <= 0 or not opp_counts:
                await message.channel.send(f"{emoji_str}\n{user_abbr} season is complete.")
                return

            mentions: List[str] = []
            for opp_abbr, _cnt in opp_counts:
                opp_meta = TEAM_DISCORD_META.get(opp_abbr, {})
                opp_uid = opp_meta.get("user_id") or ""
                if await asyncio.to_thread(is_coach_muted, opp_uid, opp_abbr):
                    continue
                if opp_uid:
                    mention_tag = f"<@{opp_uid}>"
                    if mention_tag not in mentions:
                        mentions.append(mention_tag)
                elif opp_meta.get("nick"):
                    mentions.append(f"@{opp_meta['nick']}")

            mentions_line = "".join(mentions) if mentions else "*(Remaining opponents have notifications muted)*"
            if user_abbr == "TBP":
                bottom_line = f":trophy: Games vs {nick} :trophy:"
            elif user_abbr == "RIC":
                bottom_line = f":rotating_light: Free wins vs {nick} available :rotating_light:"
            else:
                bottom_line = f"Games vs {nick} ?"

            await message.channel.send(f"{mentions_line}\n{emoji_str}\n{bottom_line}")
            return

        # 4. 3-Letter Team Abbreviation (e.g. TEG, DHG, PIT, SVF, PRO, etc.) -> Remaining opponents logo strip + count
        lookup_abbr = "TEG" if upper_text == "THT" else ("KAR" if upper_text == "KAK" else upper_text)
        if lookup_abbr in TEAM_DISCORD_META:
            orig6_set = {"BOS", "CHI", "DET", "DTC", "MTL", "NYR", "TOR"}
            target_sid = 39 if lookup_abbr in orig6_set else 40
            t_meta = TEAM_DISCORD_META[lookup_abbr]
            emoji_str = t_meta.get("emoji") or f"**{lookup_abbr}**"
            nick = t_meta.get("nick") or lookup_abbr

            total_rem, opp_counts = await asyncio.to_thread(get_remaining_opponents_for_team, lookup_abbr, target_sid)
            if total_rem <= 0 or not opp_counts:
                await message.channel.send(f"{emoji_str}\n{lookup_abbr} season is complete.")
                return

            strip_bytes = await asyncio.to_thread(render_remaining_opponents_png, opp_counts)
            if strip_bytes:
                att_file = discord.File(io.BytesIO(strip_bytes), filename="opponents.png")
                await message.channel.send(content=f"`{nick} remaining opponents`", file=att_file)
            else:
                opp_txt = ", ".join(f"{ab} ({c})" for ab, c in opp_counts)
                await message.channel.send(content=f"`{nick} remaining opponents`: {opp_txt}")
            await message.channel.send(content=f"`Games remaining: {total_rem}`")
            return

    async def on_message(self, message: discord.Message):
        await self.process_savestate_message(message, is_backfill=False)
        await self.process_season_games_command(message)


def post_boxscore_png_from_web(payload_data: Dict[str, Any]) -> None:
    """Renders boxscore.png + standings_leaders.png from web /upload payload and posts them to the matching {year}-boxscores Discord channel."""
    import uuid

    game = payload_data.get("game") or {}
    away_team = payload_data.get("awayTeam") or {}
    home_team = payload_data.get("homeTeam") or {}
    season_id = int(payload_data.get("seasonId") or 40)
    is_playoffs = bool(payload_data.get("isPlayoffMode", False))

    png_bytes = render_retro_boxscore_png(game, away_team, home_team)
    if not png_bytes:
        return
    bracket_bytes = render_playoff_bracket_png(season_id) if is_playoffs else None
    standings_bytes = render_standings_and_leaders_png(season_id, is_playoffs)

    def send_multipart_png(url: str, headers: Dict[str, str], png_data: bytes, fname: str = "boxscore.png") -> bool:
        boundary = f"----NHL95Boundary{uuid.uuid4().hex}"
        body = bytearray()
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(b'Content-Disposition: form-data; name="payload_json"\r\n')
        body.extend(b"Content-Type: application/json\r\n\r\n")
        body.extend(json.dumps({"attachments": [{"id": 0, "filename": fname}]}).encode("utf-8"))
        body.extend(b"\r\n")
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="files[0]"; filename="{fname}"\r\n'.encode("utf-8"))
        body.extend(b"Content-Type: image/png\r\n\r\n")
        body.extend(png_data)
        body.extend(b"\r\n")
        body.extend(f"--{boundary}--\r\n".encode())

        req_headers = dict(headers)
        req_headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        req_headers["User-Agent"] = "NHL95Bot/1.0"
        req = urllib.request.Request(url, data=bytes(body), headers=req_headers, method="POST")
        with urllib.request.urlopen(req, timeout=15) as r:
            return 200 <= r.status < 300

    year_str = str(SEASON_ID_TO_YEAR.get(season_id, ""))
    if DISCORD_BOT_TOKEN:
        try:
            guilds_req = urllib.request.Request(
                "https://discord.com/api/v10/users/@me/guilds",
                headers={"Authorization": f"Bot {DISCORD_BOT_TOKEN}", "User-Agent": "NHL95Bot/1.0"},
            )
            with urllib.request.urlopen(guilds_req, timeout=10) as gr:
                guilds = json.loads(gr.read().decode("utf-8"))

            for g in guilds:
                ch_req = urllib.request.Request(
                    f"https://discord.com/api/v10/guilds/{g['id']}/channels",
                    headers={"Authorization": f"Bot {DISCORD_BOT_TOKEN}", "User-Agent": "NHL95Bot/1.0"},
                )
                with urllib.request.urlopen(ch_req, timeout=10) as cr:
                    channels = [c for c in json.loads(cr.read().decode("utf-8")) if c.get("type") == 0]

                target_ch = None
                if year_str:
                    for cand in (f"{year_str}-boxscores", f"{year_str}-boxscore", f"{year_str}_boxscores"):
                        for ch in channels:
                            if (ch.get("name") or "").lower() == cand:
                                target_ch = ch
                                break
                        if target_ch:
                            break
                if not target_ch:
                    for ch in channels:
                        if (ch.get("name") or "").lower() == "boxscores":
                            target_ch = ch
                            break

                if target_ch:
                    msg_url = f"https://discord.com/api/v10/channels/{target_ch['id']}/messages"
                    auth_hdr = {"Authorization": f"Bot {DISCORD_BOT_TOKEN}"}
                    if send_multipart_png(msg_url, auth_hdr, png_bytes, "boxscore.png"):
                        if bracket_bytes:
                            send_multipart_png(msg_url, auth_hdr, bracket_bytes, "playoff_bracket.png")
                        if standings_bytes:
                            send_multipart_png(msg_url, auth_hdr, standings_bytes, "standings_leaders.png")
                        print(f"Posted boxscore.png + bracket/standings to #{target_ch['name']}")
                        return
        except Exception as e:
            print(f"Bot channel post note: {e}")

    if DISCORD_BOXSCORE_WEBHOOK_URL:
        send_multipart_png(f"{DISCORD_BOXSCORE_WEBHOOK_URL}?wait=true", {}, png_bytes, "boxscore.png")
        if bracket_bytes:
            send_multipart_png(f"{DISCORD_BOXSCORE_WEBHOOK_URL}?wait=true", {}, bracket_bytes, "playoff_bracket.png")
        if standings_bytes:
            send_multipart_png(f"{DISCORD_BOXSCORE_WEBHOOK_URL}?wait=true", {}, standings_bytes, "standings_leaders.png")
        print("Posted boxscore.png + bracket/standings via webhook fallback")


def main():
    parser = argparse.ArgumentParser(description="NHL95.net Always-On Discord Save State Bot")
    parser.add_argument(
        "--backfill-hours",
        type=int,
        default=24,
        help="On startup, scan the last N hours of channel history for any un-ingested save states (0 to disable, default: 24)",
    )
    parser.add_argument(
        "--channel-ids",
        type=str,
        default=DISCORD_WATCH_CHANNELS_ENV,
        help="Optional comma-separated Discord channel IDs to restrict listening to",
    )
    parser.add_argument(
        "--post-boxscore-stdin",
        action="store_true",
        help="Read JSON {game, awayTeam, homeTeam, seasonId} from stdin, render boxscore.png, and post to Discord",
    )
    args = parser.parse_args()

    if args.post_boxscore_stdin:
        raw_in = sys.stdin.read()
        if raw_in.strip():
            post_boxscore_png_from_web(json.loads(raw_in))
        return

    if not DISCORD_BOT_TOKEN:
        print("❌ Error: DISCORD_BOT_TOKEN is not set.")
        print("Add DISCORD_BOT_TOKEN=your_bot_token to .env.local or set $env:DISCORD_BOT_TOKEN in PowerShell.")
        sys.exit(1)

    if not SUPABASE_KEY:
        print("❌ Error: SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) is not set in .env.local.")
        sys.exit(1)

    channel_ids: List[int] = []
    if args.channel_ids:
        for part in args.channel_ids.split(","):
            part = part.strip()
            if part.isdigit():
                channel_ids.append(int(part))

    intents = discord.Intents.default()
    intents.message_content = True
    intents.guilds = True
    intents.messages = True
    intents.reactions = True

    bot = NHL95SaveStateBot(
        backfill_hours=args.backfill_hours,
        allowed_channel_ids=channel_ids,
        intents=intents,
    )
    bot.run(DISCORD_BOT_TOKEN)


if __name__ == "__main__":
    main()
