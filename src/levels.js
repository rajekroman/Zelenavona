export const WORLD = Object.freeze({ width: 1920, height: 1440 });

export const LEVELS = Object.freeze({
  chlum: Object.freeze({
    id: "chlum",
    number: 1,
    label: "CHLUM",
    title: "Chlum",
    plate: "./assets/chlum/chlum-v7-plate-prod.svg",
    foreground: "./assets/chlum/chlum-v7-foreground.svg",
    spawn: { x: 820, y: 1050 },
    npc: { id: "vaclav", x: 1070, y: 930 },
    search: { x: 1330, y: 765 },
    finding: { x: 1420, y: 725 },
    speed: 230,
    minY: 430,
    objectives: ["Promluv s Václavem", "Prohledej mokré brázdy", "Seber nalezený vltavín", "Chlum dokončen"],
    actions: [
      { step: 0, target: "npc", radius: 100, kind: "talk", label: "MLUVIT" },
      { step: 1, target: "search", radius: 135, kind: "search", label: "HLEDAT" },
      { step: 2, target: "finding", radius: 95, kind: "collect", label: "SEBRAT" }
    ]
  }),
  nesmen: Object.freeze({
    id: "nesmen",
    number: 2,
    label: "NESMĚŇ",
    title: "Nesměň",
    plate: "./assets/nesmen/nesmen-v7-plate.svg",
    foreground: "./assets/nesmen/nesmen-v7-foreground.svg",
    spawn: { x: 500, y: 1090 },
    npc: { id: "forester", x: 770, y: 970 },
    search: { x: 1215, y: 805 },
    finding: { x: 1425, y: 705 },
    speed: 218,
    minY: 365,
    pressure: {
      zone: { x: 1030, y: 560, width: 620, height: 420 },
      gainPerSecond: 34,
      recoverPerSecond: 26,
      threshold: 100,
      catchRadius: 74
    },
    objectives: ["Promluv s lesníkem", "Najdi odkrytý profil", "Prohledej kořeny a štěrk", "Nesměň dokončena"],
    actions: [
      { step: 0, target: "npc", radius: 105, kind: "talk", label: "MLUVIT" },
      { step: 1, target: "search", radius: 145, kind: "search", label: "PROHLÉDNOUT" },
      { step: 2, target: "finding", radius: 105, kind: "collect", label: "SEBRAT" }
    ]
  }),
  besednice: Object.freeze({
    id: "besednice",
    number: 3,
    label: "BESEDNICE",
    title: "Besednice",
    plate: "./assets/besednice/besednice-v7-plate.svg",
    foreground: "./assets/besednice/besednice-v7-foreground.svg",
    spawn: { x: 470, y: 1110 },
    npc: { id: "pitkeeper", x: 760, y: 1000 },
    search: { x: 1220, y: 825 },
    finding: { x: 1480, y: 760 },
    speed: 212,
    minY: 390,
    instability: {
      zone: { x: 1090, y: 625, width: 620, height: 330 },
      gainPerSecond: 31,
      recoverPerSecond: 28,
      threshold: 100
    },
    objectives: ["Promluv se správcem", "Najdi čerstvý jílový řez", "Prohledej štěrkovou kapsu", "Besednice dokončena"],
    actions: [
      { step: 0, target: "npc", radius: 108, kind: "talk", label: "MLUVIT" },
      { step: 1, target: "search", radius: 150, kind: "search", label: "PROHLÉDNOUT" },
      { step: 2, target: "finding", radius: 110, kind: "collect", label: "SEBRAT" }
    ]
  }),
  slavie: Object.freeze({
    id: "slavie",
    number: 4,
    label: "SLÁVIE",
    title: "Slávie",
    plate: "./assets/slavie/slavie-v7-plate.svg",
    foreground: "./assets/slavie/slavie-v7-foreground.svg",
    spawn: { x: 520, y: 1100 },
    npc: { id: "organizer", x: 720, y: 980 },
    search: { x: 1200, y: 875 },
    finding: { x: 1470, y: 820 },
    speed: 224,
    minY: 360,
    crowdRisk: {
      zone: { x: 980, y: 690, width: 620, height: 360 },
      gainPerSecond: 29,
      recoverPerSecond: 32,
      threshold: 100
    },
    objectives: ["Promluv s pořadatelem", "Najdi stánek s vltavíny", "Prověř pravost kamene", "Slávie dokončena"],
    actions: [
      { step: 0, target: "npc", radius: 110, kind: "talk", label: "MLUVIT" },
      { step: 1, target: "search", radius: 150, kind: "search", label: "PROHLÉDNOUT" },
      { step: 2, target: "finding", radius: 110, kind: "collect", label: "OVĚŘIT" }
    ]
  })
});

export function resolveLevel(id = "chlum") {
  return LEVELS[id] ?? LEVELS.chlum;
}
