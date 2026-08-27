const fs = require('fs');
const path = require('path');

const teams = [
  { id: 831, num: 2, name: 'Autobahn', abbr: 'AUT' },
  { id: 832, num: 65, name: 'Barrie Dolts', abbr: 'BAR' },
  { id: 833, num: 49, name: 'Baytown Thunder', abbr: 'BAY' },
  { id: 834, num: 58, name: 'Betty Ford Clinic', abbr: 'BFC' },
  { id: 835, num: 67, name: 'Devil Hill Goblins', abbr: 'DHG' },
  { id: 836, num: 18, name: 'Easter Island Stoneheads', abbr: 'ETI' },
  { id: 837, num: 25, name: 'Grand River Herons', abbr: 'GRH' },
  { id: 838, num: 37, name: 'Hamilton Mustangs', abbr: 'HAM' },
  { id: 839, num: 9, name: 'Highland Wolf', abbr: 'HIG' },
  { id: 840, num: 50, name: 'Inglewood Monstars', abbr: 'ING' },
  { id: 841, num: 14, name: 'Italy EBC', abbr: 'ITA' },
  { id: 842, num: 39, name: 'Maryhill Alumni', abbr: 'MHA' },
  { id: 843, num: 54, name: 'Karolina Kaos', abbr: 'KAR' },
  { id: 844, num: 13, name: 'Minhattrick Swayzes', abbr: 'MHT' },
  { id: 845, num: 12, name: 'Minnesota Golden Gophers', abbr: 'MGG' },
  { id: 846, num: 26, name: 'North Bay Knights', abbr: 'NBK' },
  { id: 847, num: 51, name: 'Orange County Weststars', abbr: 'OCW' },
  { id: 848, num: 17, name: 'Pitt Intramurals', abbr: 'PIT' },
  { id: 849, num: 30, name: 'Providence Sea Bass', abbr: 'PRO' },
  { id: 850, num: 19, name: 'Richfield Oracles', abbr: 'RIC' },
  { id: 851, num: 66, name: 'Rockford Villains', abbr: 'ROC' },
  { id: 852, num: 60, name: 'South Hills Shindigaz', abbr: 'SHS' },
  { id: 853, num: 20, name: 'Sugar Valley Firebirds', abbr: 'SVF' },
  { id: 854, num: 21, name: 'Sumter Trash', abbr: 'SUM' },
  { id: 855, num: 28, name: 'Taipei Typhoons', abbr: 'TAI' },
  { id: 856, num: 24, name: 'Tegucigalpa Ticklepuss', abbr: 'TEG' },
  { id: 857, num: 29, name: 'Thunder Bay Pike', abbr: 'TBP' },
  { id: 858, num: 15, name: 'Valhalla Vikings', abbr: 'VHV' },
  { id: 859, num: 63, name: 'Woodlynne Rats', abbr: 'WDY' }
];

const numTeams = teams.length; // 29
const totalSlots = numTeams + 1; // 30 (with 1 BYE)
const numRoundsSingle = totalSlots - 1; // 29 rounds per half

// Generate Circle Method schedule
// Index 0..28 are teams, index 29 is 'BYE'
const rotating = [];
for (let i = 1; i < totalSlots; i++) {
  rotating.push(i);
}

const firstHalfRounds = [];

for (let r = 0; r < numRoundsSingle; r++) {
  const currentSlots = [0];
  for (let i = 0; i < rotating.length; i++) {
    const idx = (i - r + rotating.length * 1000) % rotating.length;
    currentSlots.push(rotating[idx]);
  }

  const roundMatches = [];
  let byeTeam = null;

  for (let i = 0; i < totalSlots / 2; i++) {
    const t1 = currentSlots[i];
    const t2 = currentSlots[totalSlots - 1 - i];

    if (t1 === 29) {
      byeTeam = teams[t2];
    } else if (t2 === 29) {
      byeTeam = teams[t1];
    } else {
      let home, away;
      if ((i + r) % 2 === 0) {
        home = teams[t1];
        away = teams[t2];
      } else {
        home = teams[t2];
        away = teams[t1];
      }
      roundMatches.push({ home, away });
    }
  }

  firstHalfRounds.push({ roundNum: r + 1, matches: roundMatches, byeTeam });
}

// Generate second half rounds by flipping home and away
const allRounds = [];
let globalGameId = 1;

firstHalfRounds.forEach(r => {
  const matchesWithIds = r.matches.map(m => ({
    gameId: globalGameId++,
    round: r.roundNum,
    homeTeam: m.home,
    awayTeam: m.away
  }));
  allRounds.push({
    roundNum: r.roundNum,
    matches: matchesWithIds,
    byeTeam: r.byeTeam
  });
});

firstHalfRounds.forEach(r => {
  const roundNum = r.roundNum + numRoundsSingle;
  const matchesWithIds = r.matches.map(m => ({
    gameId: globalGameId++,
    round: roundNum,
    homeTeam: m.away, // flipped
    awayTeam: m.home  // flipped
  }));
  allRounds.push({
    roundNum,
    matches: matchesWithIds,
    byeTeam: r.byeTeam
  });
});

// Flat Game Schedule CSV
let csvSchedule = 'Game #,Round,Away ID,Away Num,Away Abbr,Away Team,Home ID,Home Num,Home Abbr,Home Team,Matchup\n';
allRounds.forEach(r => {
  r.matches.forEach(g => {
    csvSchedule += `${g.gameId},${g.round},${g.awayTeam.id},${g.awayTeam.num},${g.awayTeam.abbr},"${g.awayTeam.name}",${g.homeTeam.id},${g.homeTeam.num},${g.homeTeam.abbr},"${g.homeTeam.name}","${g.awayTeam.abbr} @ ${g.homeTeam.abbr}"\n`;
  });
});
fs.writeFileSync(path.join(__dirname, 'schedule.csv'), csvSchedule, 'utf8');

// Excel XML Spreadsheet
function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>NHL95 League Scheduler</Author>
  <Title>NHL95 Home and Away Schedule</Title>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1F4E78" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RowEven">
   <Alignment ss:Vertical="Center"/>
   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="RowOdd">
   <Alignment ss:Vertical="Center"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="CenterTextEven">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="CenterTextOdd">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="MatchupStyleEven">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="11" ss:Bold="1" ss:Color="#1E3A8A"/>
   <Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DBEAFE"/>
   </Borders>
  </Style>
  <Style ss:ID="MatchupStyleOdd">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="11" ss:Bold="1" ss:Color="#1E3A8A"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DBEAFE"/>
   </Borders>
  </Style>
 </Styles>

 <!-- WORKSHEET 1: Complete Match Schedule -->
 <Worksheet ss:Name="Master Schedule">
  <Table ss:ExpandedColumnCount="11" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="22">
   <Column ss:Width="65"/>
   <Column ss:Width="60"/>
   <Column ss:Width="70"/>
   <Column ss:Width="75"/>
   <Column ss:Width="80"/>
   <Column ss:Width="175"/>
   <Column ss:Width="70"/>
   <Column ss:Width="75"/>
   <Column ss:Width="80"/>
   <Column ss:Width="175"/>
   <Column ss:Width="120"/>
   
   <Row ss:Height="26">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Game #</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Round</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Away ID</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Away Num</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Away Abbr</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Away Team</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Home ID</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Home Num</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Home Abbr</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Home Team</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Matchup</Data></Cell>
   </Row>
`;

let rowIdx = 0;
allRounds.forEach(r => {
  r.matches.forEach(g => {
    const stylePrefix = rowIdx % 2 === 0 ? 'RowEven' : 'RowOdd';
    const centerStyle = rowIdx % 2 === 0 ? 'CenterTextEven' : 'CenterTextOdd';
    const matchStyle = rowIdx % 2 === 0 ? 'MatchupStyleEven' : 'MatchupStyleOdd';
    rowIdx++;

    xml += `   <Row ss:Height="20">
    <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${g.gameId}</Data></Cell>
    <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${g.round}</Data></Cell>
    <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${g.awayTeam.id}</Data></Cell>
    <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${g.awayTeam.num}</Data></Cell>
    <Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${escapeXml(g.awayTeam.abbr)}</Data></Cell>
    <Cell ss:StyleID="${stylePrefix}"><Data ss:Type="String">${escapeXml(g.awayTeam.name)}</Data></Cell>
    <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${g.homeTeam.id}</Data></Cell>
    <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${g.homeTeam.num}</Data></Cell>
    <Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${escapeXml(g.homeTeam.abbr)}</Data></Cell>
    <Cell ss:StyleID="${stylePrefix}"><Data ss:Type="String">${escapeXml(g.homeTeam.name)}</Data></Cell>
    <Cell ss:StyleID="${matchStyle}"><Data ss:Type="String">${escapeXml(g.awayTeam.abbr + ' @ ' + g.homeTeam.abbr)}</Data></Cell>
   </Row>\n`;
  });
});

xml += `  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>1</SplitHorizontal>
   <TopRowBottomPane>1</TopRowBottomPane>
   <ActivePane>2</ActivePane>
  </WorksheetOptions>
 </Worksheet>

 <!-- WORKSHEET 2: Teams Directory -->
 <Worksheet ss:Name="Teams Directory">
  <Table ss:ExpandedColumnCount="5" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="20">
   <Column ss:Width="50"/>
   <Column ss:Width="75"/>
   <Column ss:Width="80"/>
   <Column ss:Width="200"/>
   <Column ss:Width="90"/>
   <Row ss:Height="26">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Team ID</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Team Num</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Team Name</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Abbreviation</Data></Cell>
   </Row>
`;

teams.forEach((t, i) => {
  const style = i % 2 === 0 ? 'RowEven' : 'RowOdd';
  const center = i % 2 === 0 ? 'CenterTextEven' : 'CenterTextOdd';
  xml += `   <Row ss:Height="20">
    <Cell ss:StyleID="${center}"><Data ss:Type="Number">${i + 1}</Data></Cell>
    <Cell ss:StyleID="${center}"><Data ss:Type="Number">${t.id}</Data></Cell>
    <Cell ss:StyleID="${center}"><Data ss:Type="Number">${t.num}</Data></Cell>
    <Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXml(t.name)}</Data></Cell>
    <Cell ss:StyleID="${center}"><Data ss:Type="String">${escapeXml(t.abbr)}</Data></Cell>
   </Row>\n`;
});

xml += `  </Table>
 </Worksheet>
</Workbook>`;

fs.writeFileSync(path.join(__dirname, 'NHL95_Home_Away_Schedule.xml'), xml, 'utf8');
fs.writeFileSync(path.join(__dirname, 'NHL95_Home_Away_Schedule.xls'), xml, 'utf8');
console.log('Finished writing files.');
