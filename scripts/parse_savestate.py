# -*- coding: utf-8 -*-
"""
NHL95 Save State Parser & Supabase Exporter
Supports RetroArch / Genesis Plus GX save state files (.state, .sav, .state1-9)
"""

import sys
import os
import json
import csv
import argparse

DEFAULT_TEAM_CODES = {
    0: 'AUT', 1: 'BAR', 2: 'BAY', 3: 'BFC', 4: 'DHG', 5: 'GRH', 
    6: 'HAM', 7: 'HIG', 8: 'ING', 9: 'ITA', 10: 'KAR', 11: 'MHA', 
    12: 'MHT', 13: 'MGG', 14: 'NBK', 15: 'OCW', 16: 'PIT', 17: 'PRO', 
    18: 'RIC', 19: 'ROC', 20: 'SHS', 21: 'SVF', 22: 'SUM', 23: 'TAI', 
    24: 'TEG', 25: 'TBP', 26: 'VHV', 27: 'WDY', 28: 'ETI'
}

O_LEAGUE_TEAM_CODES = {
    0: 'BOS', 1: 'CHI', 2: 'DTC', 3: 'MTL', 4: 'NYR', 5: 'TOR'
}

O_LEAGUE_GOALIES = {
    'BOS': ['Hal Winkler', 'Charles Stewart'],
    'CHI': ['Hugh Lehman', '--'],
    'DTC': ['Hap Holmes', 'Herb Stuart'],
    'MTL': ['George Hainsworth', '--'],
    'NYR': ['Lorne Chabot', '--'],
    'TOR': ['John-Ross Roach', '--']
}

O_LEAGUE_SKATERS = {
    'BOS': [
        'Percy Galbraith', 'Jimmy Herbert', 'Harry Oliver', 'Frank Fredrickson', 'Carson Cooper',
        'Lionel Hitchman', 'Eddie Shore', 'Billy Stuart'
    ],
    'CHI': [
        'Babe Dye', 'George Hay', 'Dick Irvin', 'Mickey MacKay', 'Charley McVeigh',
        'Bob Trapp', 'Percy Traub', 'Gord Fraser'
    ],
    'DTC': [
        'Duke Keats', 'Frank Foyston', 'Fred Gordon', 'Johnny Sheppard', 'Jack Walker',
        'Jack Arbour', 'Art Duncan', 'Clem Loughlin'
    ],
    'MTL': [
        'Pit Lepine', 'Howie Morenz', 'Art Gagne', 'Aurele Joliat', 'Billy Boucher',
        'Albert Leduc', 'Herb Gardiner', 'Sylvio Mantha'
    ],
    'NYR': [
        'Frank Boucher', 'Bill Cook', 'Bun Cook', 'Murray Murdoch', 'Paul Thompson',
        'Reg Mackey', 'Stan Brown', 'Clarence Abel'
    ],
    'TOR': [
        'Ace Bailey', 'Bill Carson', 'George Patterson', 'Butch Keeling', 'Corb Denneny',
        'Hap Day', 'Bert Corbeau', 'Bill Brydge'
    ]
}

O_LEAGUE_POSITION_COUNTS = {t: {'goalies': 2, 'forwards': 5, 'defensemen': 3} for t in O_LEAGUE_SKATERS}

GOAL_TYPE_DICT = {
    0: ('Home', 'SH2'), 1: ('Home', 'SH'), 2: ('Home', 'EV'), 3: ('Home', 'PP'),
    4: ('Home', 'PP2'), 128: ('Away', 'SH2'), 129: ('Away', 'SH'), 130: ('Away', 'EV'),
    131: ('Away', 'PP'), 132: ('Away', 'PP2')
}

TEAM_PEN_DICT = {
    18: ('Home', 'Boarding'), 22: ('Home', 'Charging'), 24: ('Home', 'Slashing'),
    26: ('Home', 'Roughing'), 28: ('Home', 'Cross-Checking'), 30: ('Home', 'Hooking'),
    32: ('Home', 'Tripping'), 34: ('Home', 'Interference'), 36: ('Home', 'Holding'),
    38: ('Home', 'Fighting'),
    146: ('Away', 'Boarding'), 150: ('Away', 'Charging'), 152: ('Away', 'Slashing'),
    154: ('Away', 'Roughing'), 156: ('Away', 'Cross-Checking'), 158: ('Away', 'Hooking'),
    160: ('Away', 'Tripping'), 162: ('Away', 'Interference'), 164: ('Away', 'Holding'),
    166: ('Away', 'Fighting')
}

def format_time(seconds):
    return f"{seconds // 60}:{(seconds % 60):02d}"

def process_save_state(in_file_or_bytes, team_position_counts=None, goalie_dict=None, skater_dict=None, team_codes=None):
    if team_position_counts is None: team_position_counts = {}
    if goalie_dict is None: goalie_dict = {}
    if skater_dict is None: skater_dict = {}
    if team_codes is None: team_codes = DEFAULT_TEAM_CODES

    if isinstance(in_file_or_bytes, bytes):
        d = in_file_or_bytes
    else:
        with open(in_file_or_bytes, 'rb') as f:
            d = f.read()

    offset = 32
    if len(d) > 48980 + offset and d[48980 + offset] > 30 and d[48980] <= 30:
        offset = 0

    # Away
    awayGoals = d[50682+offset]
    awayPPGoals = d[50672+offset]
    awayPPTries = d[50674+offset]
    awayPPTime = d[51522+offset] + d[51523+offset]*256
    awayPPShots = d[51524+offset]
    awaySHGoals = d[51526+offset]
    awayBreakGoals = d[51530+offset]
    awayBreakTries = d[51528+offset]
    awayOneTimerGoals = d[51534+offset]
    awayOneTimerTries = d[51532+offset]
    awayPenShotGoals = d[51538+offset]
    awayPenShotTries = d[51536+offset]
    awayFaceoffWins = d[50684+offset]
    awayChecks = d[50686+offset]
    awayPenalties = d[50676+offset]
    awayPIM = d[50678+offset]
    awayAttackZoneTime = d[50680+offset] + d[50681+offset]*256
    awayPassComps = d[50690+offset]
    awayPassTries = d[50688+offset]
    if awayPassTries < awayPassComps:
        awayPassTries += 256
    awayGoalsP1 = d[51506+offset]
    awayGoalsP2 = d[51508+offset]
    awayGoalsP3 = d[51510+offset]
    awayGoalsOT = d[51512+offset]
    awayShotsP1 = d[51514+offset]
    awayShotsP2 = d[51516+offset]
    awayShotsP3 = d[51518+offset]
    awayShotsOT = d[51520+offset]
    awayTeamByte = d[48982+offset]
    awayTeam = team_codes.get(awayTeamByte, f'TM_{awayTeamByte}')
    awayShots = awayShotsP1 + awayShotsP2 + awayShotsP3 + awayShotsOT
    awayShootPct = round(awayGoals / awayShots, 3) if awayShots > 0 else 0

    # Home
    homeGoals = d[49812+offset]
    homePPGoals = d[49802+offset]
    homePPTries = d[49804+offset]
    homePPTime = d[50652+offset] + d[50653+offset]*256
    homePPShots = d[50654+offset]
    homeSHGoals = d[50656+offset]
    homeBreakGoals = d[50660+offset]
    homeBreakTries = d[50658+offset]
    homeOneTimerGoals = d[50664+offset]
    homeOneTimerTries = d[50662+offset]
    homePenShotGoals = d[50668+offset]
    homePenShotTries = d[50666+offset]
    homeFaceoffWins = d[49814+offset]
    homeChecks = d[49816+offset]
    homePenalties = d[49806+offset]
    homePIM = d[49808+offset]
    homeAttackZoneTime = d[49810+offset] + d[49811+offset]*256
    homePassComps = d[49820+offset]
    homePassTries = d[49818+offset]
    if homePassTries < homePassComps:
        homePassTries += 256
    homeGoalsP1 = d[50636+offset]
    homeGoalsP2 = d[50638+offset]
    homeGoalsP3 = d[50640+offset]
    homeGoalsOT = d[50642+offset]
    homeShotsP1 = d[50644+offset]
    homeShotsP2 = d[50646+offset]
    homeShotsP3 = d[50648+offset]
    homeShotsOT = d[50650+offset]
    homeTeamByte = d[48980+offset]
    homeTeam = team_codes.get(homeTeamByte, f'TM_{homeTeamByte}')
    homeShots = homeShotsP1 + homeShotsP2 + homeShotsP3 + homeShotsOT
    homeShootPct = round(homeGoals / homeShots, 3) if homeShots > 0 else 0

    awayGCount = team_position_counts.get(awayTeam, {}).get('goalies', 2)
    awayFCount = team_position_counts.get(awayTeam, {}).get('forwards', 5)
    awayDCount = team_position_counts.get(awayTeam, {}).get('defensemen', 3)

    homeGCount = team_position_counts.get(homeTeam, {}).get('goalies', 2)
    homeFCount = team_position_counts.get(homeTeam, {}).get('forwards', 5)
    homeDCount = team_position_counts.get(homeTeam, {}).get('defensemen', 3)

    away_g_names = goalie_dict.get(awayTeam, [f'Goalie {i+1}' for i in range(awayGCount)])
    away_s_names = skater_dict.get(awayTeam, [f'Skater {i+1}' for i in range(awayFCount + awayDCount)])
    awayPlayers = [[name, 'G'] for name in away_g_names[:awayGCount]] + \
                  [[name, 'F'] for name in away_s_names[:awayFCount]] + \
                  [[name, 'D'] for name in away_s_names[awayFCount:awayFCount+awayDCount]]

    home_g_names = goalie_dict.get(homeTeam, [f'Goalie {i+1}' for i in range(homeGCount)])
    home_s_names = skater_dict.get(homeTeam, [f'Skater {i+1}' for i in range(homeFCount + homeDCount)])
    homePlayers = [[name, 'G'] for name in home_g_names[:homeGCount]] + \
                  [[name, 'F'] for name in home_s_names[:homeFCount]] + \
                  [[name, 'D'] for name in home_s_names[homeFCount:homeFCount+homeDCount]]

    numGoals = int(d[49196+offset]/6)
    scoringSummaryList = []
    startByte = 49198+offset
    for i in range(numGoals):
        b1 = d[startByte+1+i*6]
        if b1 < 64: perFactor = 0
        elif b1 < 128: perFactor = 64
        elif b1 < 192: perFactor = 128
        else: perFactor = 192
        periodNum = int(perFactor/64+1)
        secondsNum = (int(b1 - perFactor)*256) + int(d[startByte+i*6])
        goalType = GOAL_TYPE_DICT.get(d[startByte+3+i*6], ('Home', 'EV'))
        goalTeam, goalStatus = goalType

        scorerRosterSlot = d[startByte+2+i*6]
        assist1RosterSlot = d[startByte+5+i*6]
        assist2RosterSlot = d[startByte+4+i*6]

        roster = homePlayers if goalTeam == 'Home' else awayPlayers
        scorerName = roster[scorerRosterSlot][0] if scorerRosterSlot < len(roster) else f'Player {scorerRosterSlot+1}'
        assist1Name = '--' if assist1RosterSlot == 255 else (roster[assist1RosterSlot][0] if assist1RosterSlot < len(roster) else f'Player {assist1RosterSlot+1}')
        assist2Name = '--' if assist2RosterSlot == 255 else (roster[assist2RosterSlot][0] if assist2RosterSlot < len(roster) else f'Player {assist2RosterSlot+1}')

        scoringSummaryList.append({
            'goalNum': i + 1,
            'period': periodNum,
            'seconds': secondsNum,
            'time': format_time(secondsNum),
            'team': homeTeam if goalTeam == 'Home' else awayTeam,
            'side': goalTeam,
            'status': goalStatus,
            'scorer': scorerName,
            'assist1': assist1Name,
            'assist2': assist2Name
        })

    numPens = int(d[49558+offset]/4)
    penaltySummaryList = []
    startByte = 49560+offset
    for i in range(numPens):
        b1 = d[startByte+1+i*4]
        if b1 < 64: perFactor = 0
        elif b1 < 128: perFactor = 64
        elif b1 < 192: perFactor = 128
        else: perFactor = 192
        periodNum = int(perFactor/64+1)
        secondsNum = (int(b1 - perFactor)*256) + int(d[startByte+i*4])
        penTeam, penType = TEAM_PEN_DICT.get(d[startByte+3+i*4], ('Home', 'Penalty'))
        playerRosterSlot = d[startByte+2+i*4]
        roster = homePlayers if penTeam == 'Home' else awayPlayers
        playerName = roster[playerRosterSlot][0] if playerRosterSlot < len(roster) else f'Player {playerRosterSlot+1}'

        penaltySummaryList.append({
            'penNum': i + 1,
            'period': periodNum,
            'seconds': secondsNum,
            'time': format_time(secondsNum),
            'team': homeTeam if penTeam == 'Home' else awayTeam,
            'side': penTeam,
            'player': playerName,
            'type': penType
        })

    OT = 1 if (awayGoalsOT > 0 or awayShotsOT > 0 or homeGoalsOT > 0 or homeShotsOT > 0 or (len(penaltySummaryList) > 0 and penaltySummaryList[-1]['period'] == 4)) else 0
    if not OT:
        gameLength = 900
    else:
        if homeGoals == awayGoals: gameLength = 1200
        else: gameLength = 900 + (scoringSummaryList[-1]['seconds'] if scoringSummaryList else 0)

    # Away player stats
    awayPlayerStats = []
    swapVal = 1
    startByte = 50852+offset
    for i in range(awayGCount + awayFCount + awayDCount):
        p_name = awayPlayers[i][0]
        p_pos = awayPlayers[i][1]
        goals = d[startByte + 0 + i + swapVal]
        assists = d[startByte + 26 + i + swapVal]
        shots = d[startByte + 52 + i + swapVal]
        checks = d[startByte + 104 + i + swapVal]
        pim = d[startByte + 78 + i + swapVal]
        toi = min(d[startByte + 130 + 1 + i*2]*256 + d[startByte + 130 + i*2], gameLength)
        awayPlayerStats.append({'name': p_name, 'pos': p_pos, 'g': goals, 'a': assists, 'pts': goals+assists, 'sog': shots, 'chk': checks, 'pim': pim, 'toi': toi})
        swapVal *= -1

    # Home player stats
    homePlayerStats = []
    swapVal = 1
    startByte = 49982+offset
    for i in range(homeGCount + homeFCount + homeDCount):
        p_name = homePlayers[i][0]
        p_pos = homePlayers[i][1]
        goals = d[startByte + 0 + i + swapVal]
        assists = d[startByte + 26 + i + swapVal]
        shots = d[startByte + 52 + i + swapVal]
        checks = d[startByte + 104 + i + swapVal]
        pim = d[startByte + 78 + i + swapVal]
        toi = min(d[startByte + 130 + 1 + i*2]*256 + d[startByte + 130 + i*2], gameLength)
        homePlayerStats.append({'name': p_name, 'pos': p_pos, 'g': goals, 'a': assists, 'pts': goals+assists, 'sog': shots, 'chk': checks, 'pim': pim, 'toi': toi})
        swapVal *= -1

    return {
        'matchup': f'{awayTeam} @ {homeTeam}',
        'homeTeam': {
            'teamCode': homeTeam, 'goals': homeGoals, 'shots': homeShots, 'shootingPct': homeShootPct,
            'ppGoals': homePPGoals, 'ppTries': homePPTries, 'ppTime': format_time(homePPTime), 'ppShots': homePPShots,
            'shGoals': homeSHGoals, 'breakawayGoals': homeBreakGoals, 'breakawayTries': homeBreakTries,
            'oneTimerGoals': homeOneTimerGoals, 'oneTimerTries': homeOneTimerTries,
            'faceoffWins': homeFaceoffWins, 'checks': homeChecks, 'pim': homePIM,
            'attackZoneTime': format_time(homeAttackZoneTime), 'passComps': homePassComps, 'passTries': homePassTries
        },
        'awayTeam': {
            'teamCode': awayTeam, 'goals': awayGoals, 'shots': awayShots, 'shootingPct': awayShootPct,
            'ppGoals': awayPPGoals, 'ppTries': awayPPTries, 'ppTime': format_time(awayPPTime), 'ppShots': awayPPShots,
            'shGoals': awaySHGoals, 'breakawayGoals': awayBreakGoals, 'breakawayTries': awayBreakTries,
            'oneTimerGoals': awayOneTimerGoals, 'oneTimerTries': awayOneTimerTries,
            'faceoffWins': awayFaceoffWins, 'checks': awayChecks, 'pim': awayPIM,
            'attackZoneTime': format_time(awayAttackZoneTime), 'passComps': awayPassComps, 'passTries': awayPassTries
        },
        'isOT': bool(OT),
        'gameLength': format_time(gameLength),
        'scoringSummary': scoringSummaryList,
        'penaltySummary': penaltySummaryList,
        'homePlayers': homePlayerStats,
        'awayPlayers': awayPlayerStats
    }

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Parse RetroArch save states for NHL95.')
    parser.add_argument('save_state', help='Path to .state save state file')
    parser.add_argument('--season', type=int, default=39, help='Season ID (e.g. 39 for O01, 40 for W18)')
    parser.add_argument('--json', action='store_true', help='Output in JSON format')
    args = parser.parse_args()

    if args.season == 39:
        team_codes = O_LEAGUE_TEAM_CODES
        pos_counts = O_LEAGUE_POSITION_COUNTS
        goalies = O_LEAGUE_GOALIES
        skaters = O_LEAGUE_SKATERS
    else:
        team_codes = DEFAULT_TEAM_CODES
        pos_counts = None
        goalies = None
        skaters = None

    result = process_save_state(
        args.save_state,
        team_position_counts=pos_counts,
        goalie_dict=goalies,
        skater_dict=skaters,
        team_codes=team_codes
    )
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Matchup: {result['matchup']}")
        print(f"Final Score: {result['awayTeam']['teamCode']} {result['awayTeam']['goals']} - {result['homeTeam']['goals']} {result['homeTeam']['teamCode']}")
        print(f"Game Length: {result['gameLength']} (OT: {result['isOT']})")
