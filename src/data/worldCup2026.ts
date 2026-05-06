export type GroupKey =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"

export type Team = {
  id: string
  name: string
  zh: string
  code: string
  flag: string
}

export type Group = {
  key: GroupKey
  teams: Team[]
}

export type Slot =
  | { type: "group"; group: GroupKey; place: 1 | 2 | 3; label: string }
  | { type: "winner"; match: number; label: string }

export type Match = {
  id: number
  round: "r32" | "r16" | "qf" | "sf" | "third" | "final"
  title: string
  venue: string
  left: Slot
  right: Slot
}

export const groups: Group[] = [
  {
    key: "A",
    teams: [
      { id: "mexico", name: "Mexico", zh: "墨西哥", code: "MEX", flag: "🇲🇽" },
      { id: "south-africa", name: "South Africa", zh: "南非", code: "RSA", flag: "🇿🇦" },
      { id: "south-korea", name: "South Korea", zh: "韩国", code: "KOR", flag: "🇰🇷" },
      { id: "czechia", name: "Czechia", zh: "捷克", code: "CZE", flag: "🇨🇿" },
    ],
  },
  {
    key: "B",
    teams: [
      { id: "canada", name: "Canada", zh: "加拿大", code: "CAN", flag: "🇨🇦" },
      { id: "switzerland", name: "Switzerland", zh: "瑞士", code: "SUI", flag: "🇨🇭" },
      { id: "qatar", name: "Qatar", zh: "卡塔尔", code: "QAT", flag: "🇶🇦" },
      { id: "bosnia-herzegovina", name: "Bosnia and Herzegovina", zh: "波黑", code: "BIH", flag: "🇧🇦" },
    ],
  },
  {
    key: "C",
    teams: [
      { id: "brazil", name: "Brazil", zh: "巴西", code: "BRA", flag: "🇧🇷" },
      { id: "morocco", name: "Morocco", zh: "摩洛哥", code: "MAR", flag: "🇲🇦" },
      { id: "haiti", name: "Haiti", zh: "海地", code: "HAI", flag: "🇭🇹" },
      { id: "scotland", name: "Scotland", zh: "苏格兰", code: "SCO", flag: "🏴" },
    ],
  },
  {
    key: "D",
    teams: [
      { id: "united-states", name: "United States", zh: "美国", code: "USA", flag: "🇺🇸" },
      { id: "paraguay", name: "Paraguay", zh: "巴拉圭", code: "PAR", flag: "🇵🇾" },
      { id: "australia", name: "Australia", zh: "澳大利亚", code: "AUS", flag: "🇦🇺" },
      { id: "turkiye", name: "Turkiye", zh: "土耳其", code: "TUR", flag: "🇹🇷" },
    ],
  },
  {
    key: "E",
    teams: [
      { id: "germany", name: "Germany", zh: "德国", code: "GER", flag: "🇩🇪" },
      { id: "curacao", name: "Curacao", zh: "库拉索", code: "CUW", flag: "🇨🇼" },
      { id: "ivory-coast", name: "Ivory Coast", zh: "科特迪瓦", code: "CIV", flag: "🇨🇮" },
      { id: "ecuador", name: "Ecuador", zh: "厄瓜多尔", code: "ECU", flag: "🇪🇨" },
    ],
  },
  {
    key: "F",
    teams: [
      { id: "netherlands", name: "Netherlands", zh: "荷兰", code: "NED", flag: "🇳🇱" },
      { id: "japan", name: "Japan", zh: "日本", code: "JPN", flag: "🇯🇵" },
      { id: "tunisia", name: "Tunisia", zh: "突尼斯", code: "TUN", flag: "🇹🇳" },
      { id: "sweden", name: "Sweden", zh: "瑞典", code: "SWE", flag: "🇸🇪" },
    ],
  },
  {
    key: "G",
    teams: [
      { id: "belgium", name: "Belgium", zh: "比利时", code: "BEL", flag: "🇧🇪" },
      { id: "egypt", name: "Egypt", zh: "埃及", code: "EGY", flag: "🇪🇬" },
      { id: "iran", name: "Iran", zh: "伊朗", code: "IRN", flag: "🇮🇷" },
      { id: "new-zealand", name: "New Zealand", zh: "新西兰", code: "NZL", flag: "🇳🇿" },
    ],
  },
  {
    key: "H",
    teams: [
      { id: "spain", name: "Spain", zh: "西班牙", code: "ESP", flag: "🇪🇸" },
      { id: "cape-verde", name: "Cape Verde", zh: "佛得角", code: "CPV", flag: "🇨🇻" },
      { id: "saudi-arabia", name: "Saudi Arabia", zh: "沙特阿拉伯", code: "KSA", flag: "🇸🇦" },
      { id: "uruguay", name: "Uruguay", zh: "乌拉圭", code: "URU", flag: "🇺🇾" },
    ],
  },
  {
    key: "I",
    teams: [
      { id: "france", name: "France", zh: "法国", code: "FRA", flag: "🇫🇷" },
      { id: "senegal", name: "Senegal", zh: "塞内加尔", code: "SEN", flag: "🇸🇳" },
      { id: "norway", name: "Norway", zh: "挪威", code: "NOR", flag: "🇳🇴" },
      { id: "iraq", name: "Iraq", zh: "伊拉克", code: "IRQ", flag: "🇮🇶" },
    ],
  },
  {
    key: "J",
    teams: [
      { id: "argentina", name: "Argentina", zh: "阿根廷", code: "ARG", flag: "🇦🇷" },
      { id: "algeria", name: "Algeria", zh: "阿尔及利亚", code: "ALG", flag: "🇩🇿" },
      { id: "austria", name: "Austria", zh: "奥地利", code: "AUT", flag: "🇦🇹" },
      { id: "jordan", name: "Jordan", zh: "约旦", code: "JOR", flag: "🇯🇴" },
    ],
  },
  {
    key: "K",
    teams: [
      { id: "portugal", name: "Portugal", zh: "葡萄牙", code: "POR", flag: "🇵🇹" },
      { id: "uzbekistan", name: "Uzbekistan", zh: "乌兹别克斯坦", code: "UZB", flag: "🇺🇿" },
      { id: "colombia", name: "Colombia", zh: "哥伦比亚", code: "COL", flag: "🇨🇴" },
      { id: "dr-congo", name: "DR Congo", zh: "民主刚果", code: "COD", flag: "🇨🇩" },
    ],
  },
  {
    key: "L",
    teams: [
      { id: "england", name: "England", zh: "英格兰", code: "ENG", flag: "🏴" },
      { id: "croatia", name: "Croatia", zh: "克罗地亚", code: "CRO", flag: "🇭🇷" },
      { id: "ghana", name: "Ghana", zh: "加纳", code: "GHA", flag: "🇬🇭" },
      { id: "panama", name: "Panama", zh: "巴拿马", code: "PAN", flag: "🇵🇦" },
    ],
  },
]

const g = (group: GroupKey, place: 1 | 2 | 3, label: string): Slot => ({ type: "group", group, place, label })
const w = (match: number): Slot => ({ type: "winner", match, label: `第 ${match} 场胜者` })

export const roundOf32: Match[] = [
  { id: 73, round: "r32", title: "32 强", venue: "洛杉矶", left: g("A", 2, "A 组第二"), right: g("B", 2, "B 组第二") },
  { id: 74, round: "r32", title: "32 强", venue: "波士顿", left: g("E", 1, "E 组第一"), right: g("A", 3, "A/B/C/D/F 组第三") },
  { id: 75, round: "r32", title: "32 强", venue: "蒙特雷", left: g("F", 1, "F 组第一"), right: g("C", 2, "C 组第二") },
  { id: 76, round: "r32", title: "32 强", venue: "休斯敦", left: g("C", 1, "C 组第一"), right: g("F", 2, "F 组第二") },
  { id: 77, round: "r32", title: "32 强", venue: "纽约/新泽西", left: g("I", 1, "I 组第一"), right: g("C", 3, "C/D/F/G/H 组第三") },
  { id: 78, round: "r32", title: "32 强", venue: "达拉斯", left: g("E", 2, "E 组第二"), right: g("I", 2, "I 组第二") },
  { id: 79, round: "r32", title: "32 强", venue: "墨西哥城", left: g("A", 1, "A 组第一"), right: g("C", 3, "C/E/F/H/I 组第三") },
  { id: 80, round: "r32", title: "32 强", venue: "亚特兰大", left: g("L", 1, "L 组第一"), right: g("E", 3, "E/H/I/J/K 组第三") },
  { id: 81, round: "r32", title: "32 强", venue: "旧金山湾区", left: g("D", 1, "D 组第一"), right: g("B", 3, "B/E/F/I/J 组第三") },
  { id: 82, round: "r32", title: "32 强", venue: "西雅图", left: g("G", 1, "G 组第一"), right: g("A", 3, "A/E/H/I/J 组第三") },
  { id: 83, round: "r32", title: "32 强", venue: "多伦多", left: g("K", 2, "K 组第二"), right: g("L", 2, "L 组第二") },
  { id: 84, round: "r32", title: "32 强", venue: "洛杉矶", left: g("H", 1, "H 组第一"), right: g("J", 2, "J 组第二") },
  { id: 85, round: "r32", title: "32 强", venue: "温哥华", left: g("B", 1, "B 组第一"), right: g("E", 3, "E/F/G/I/J 组第三") },
  { id: 86, round: "r32", title: "32 强", venue: "迈阿密", left: g("J", 1, "J 组第一"), right: g("H", 2, "H 组第二") },
  { id: 87, round: "r32", title: "32 强", venue: "堪萨斯城", left: g("K", 1, "K 组第一"), right: g("D", 3, "D/E/I/J/L 组第三") },
  { id: 88, round: "r32", title: "32 强", venue: "达拉斯", left: g("D", 2, "D 组第二"), right: g("G", 2, "G 组第二") },
]

export const knockoutRounds: Match[] = [
  ...roundOf32,
  { id: 89, round: "r16", title: "16 强", venue: "费城", left: w(74), right: w(77) },
  { id: 90, round: "r16", title: "16 强", venue: "休斯敦", left: w(73), right: w(75) },
  { id: 91, round: "r16", title: "16 强", venue: "纽约/新泽西", left: w(76), right: w(78) },
  { id: 92, round: "r16", title: "16 强", venue: "墨西哥城", left: w(79), right: w(80) },
  { id: 93, round: "r16", title: "16 强", venue: "达拉斯", left: w(83), right: w(84) },
  { id: 94, round: "r16", title: "16 强", venue: "西雅图", left: w(81), right: w(82) },
  { id: 95, round: "r16", title: "16 强", venue: "亚特兰大", left: w(86), right: w(88) },
  { id: 96, round: "r16", title: "16 强", venue: "温哥华", left: w(85), right: w(87) },
  { id: 97, round: "qf", title: "1/4 决赛", venue: "波士顿", left: w(89), right: w(90) },
  { id: 98, round: "qf", title: "1/4 决赛", venue: "洛杉矶", left: w(93), right: w(94) },
  { id: 99, round: "qf", title: "1/4 决赛", venue: "迈阿密", left: w(91), right: w(92) },
  { id: 100, round: "qf", title: "1/4 决赛", venue: "堪萨斯城", left: w(95), right: w(96) },
  { id: 101, round: "sf", title: "半决赛", venue: "达拉斯", left: w(97), right: w(98) },
  { id: 102, round: "sf", title: "半决赛", venue: "亚特兰大", left: w(99), right: w(100) },
  { id: 104, round: "final", title: "决赛", venue: "纽约/新泽西", left: w(101), right: w(102) },
]

export const dataNote =
  "数据基于 2026-05-03 可检索的 FIFA 赛程页与近期小组名单索引。32 强中“最佳第三”的精确落位会按 FIFA 最终第三名组合规则变动。"
