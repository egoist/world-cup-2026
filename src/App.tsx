import { ArrowDown, ArrowUp, Check, Download, Eye, LoaderCircle, RotateCcw, Trophy } from "lucide-react"
import type { TFunction } from "i18next"
import { type CSSProperties, type DragEvent, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import QRCode from "qrcode"
import { toPng } from "html-to-image"
import { Button } from "@/components/ui/button"
import { groups, knockoutRounds, type GroupKey, type Match, type Slot, type Team } from "./data/worldCup2026"
import { isLocale, localeStorageKey, locales, type Locale } from "./i18n"
import { cn } from "./lib/utils"

type Ranking = Record<GroupKey, string[]>
type Winners = Record<number, string>
type Stage = "groups" | "thirds" | "knockout" | "share"
type SavedState = {
  version: number
  ranking: Ranking
  thirdGroups: GroupKey[]
  winners: Winners
  stage: Stage
}

const initialRanking = Object.fromEntries(groups.map((group) => [group.key, group.teams.map((team) => team.id)])) as Ranking
const initialThirdGroups: GroupKey[] = ["A", "B", "C", "D", "E", "F", "G", "H"]
const storageVersion = 2
const storageKey = "world-cup-2026-predictor-state"
const shareUrl = "https://wc2026.egoist.dev"
const twemojiSvgBase = "/twemoji/svg"
const teamMap = new Map(groups.flatMap((group) => group.teams.map((team) => [team.id, team])))
const groupKeys = new Set(groups.map((group) => group.key))
const stages: { id: Stage }[] = [{ id: "groups" }, { id: "thirds" }, { id: "knockout" }, { id: "share" }]

function isStage(value: unknown): value is Stage {
  return typeof value === "string" && stages.some((stage) => stage.id === value)
}

function isRanking(value: unknown): value is Ranking {
  if (!value || typeof value !== "object") return false
  return groups.every((group) => {
    const ids = (value as Record<string, unknown>)[group.key]
    return Array.isArray(ids) && ids.length === group.teams.length && ids.every((id) => typeof id === "string")
  })
}

function isThirdGroups(value: unknown): value is GroupKey[] {
  return Array.isArray(value) && value.length <= 8 && value.every((key) => typeof key === "string" && groupKeys.has(key as GroupKey))
}

function isWinners(value: unknown): value is Winners {
  return Boolean(value && typeof value === "object" && Object.values(value).every((id) => typeof id === "string"))
}

function loadSavedState(): Partial<SavedState> {
  if (typeof localStorage === "undefined") return {}

  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<SavedState>
    if (parsed.version !== storageVersion) return {}
    return {
      ranking: isRanking(parsed.ranking) ? parsed.ranking : undefined,
      thirdGroups: isThirdGroups(parsed.thirdGroups) ? parsed.thirdGroups : undefined,
      winners: isWinners(parsed.winners) ? parsed.winners : undefined,
      stage: isStage(parsed.stage) ? parsed.stage : undefined,
    }
  } catch {
    return {}
  }
}

function getTeam(id?: string) {
  return id ? teamMap.get(id) : undefined
}

function getTeamName(team: Team, locale: Locale) {
  if (locale === "en") return team.name
  if (locale === "ja") return team.ja
  return team.zh
}

function getVenueName(venue: string, t: TFunction) {
  return t(`venues.${venue}`, { defaultValue: venue })
}

function getSlotFallback(slot: Slot, t: TFunction) {
  if (slot.type === "winner") return t("slotWinner", { match: slot.match })

  if (slot.place === 3) {
    const candidates = thirdSlotCandidates(slot)
    const groupsLabel = candidates.length ? candidates.join("/") : slot.group
    return t("slotGroupThird", { groups: groupsLabel })
  }

  return t(slot.place === 1 ? "slotGroupWinner" : "slotGroupRunnerUp", { group: slot.group })
}

function twemojiCodepoint(team: Team) {
  if (team.id === "england") return "1f3f4-e0067-e0062-e0065-e006e-e0067-e007f"
  if (team.id === "scotland") return "1f3f4-e0067-e0062-e0073-e0063-e0074-e007f"

  return Array.from(team.flag)
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join("-")
}

function FlagIcon({ team, className }: { team: Team; className?: string }) {
  return <img className={cn("twemoji-flag", className)} src={`${twemojiSvgBase}/${twemojiCodepoint(team)}.svg`} alt="" loading="eager" draggable={false} />
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.36 6.84 9.72.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.35 1.11 2.92.85.09-.66.35-1.11.64-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.98c.85 0 1.7.12 2.5.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.05 10.05 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z" />
    </svg>
  )
}

function getRankedTeams(ranking: Ranking, groupKey: GroupKey) {
  return ranking[groupKey].map((id) => teamMap.get(id)!).filter(Boolean)
}

function thirdSlotCandidates(slot: Slot) {
  return slot.type === "group" && slot.place === 3 ? (slot.label.match(/[A-L]/g) as GroupKey[] | null) ?? [] : []
}

function getThirdSlotKey(slot: Extract<Slot, { type: "group" }>) {
  return `${slot.group}:${slot.label}`
}

function getThirdGroupAssignments(thirdGroups: GroupKey[]) {
  const thirdSlots = knockoutRounds
    .filter((match) => match.round === "r32")
    .flatMap((match) => [match.left, match.right])
    .filter((slot): slot is Extract<Slot, { type: "group" }> => slot.type === "group" && slot.place === 3)

  const selected = new Set(thirdGroups)
  const assignments = new Map<string, GroupKey>()
  const used = new Set<GroupKey>()

  const assign = (index: number): boolean => {
    if (index >= thirdSlots.length) return true

    const slot = thirdSlots[index]
    const candidates = thirdSlotCandidates(slot).filter((groupKey) => selected.has(groupKey) && !used.has(groupKey))
    for (const groupKey of candidates) {
      assignments.set(getThirdSlotKey(slot), groupKey)
      used.add(groupKey)
      if (assign(index + 1)) return true
      used.delete(groupKey)
      assignments.delete(getThirdSlotKey(slot))
    }

    return false
  }

  assign(0)
  return assignments
}

function slotCandidates(slot: Slot, ranking: Ranking, thirdGroups: GroupKey[], winners: Winners): Team[] {
  if (slot.type === "winner") {
    const winner = getTeam(winners[slot.match])
    return winner ? [winner] : []
  }

  if (slot.place !== 3) {
    return [getRankedTeams(ranking, slot.group)[slot.place - 1]].filter(Boolean)
  }

  const groupKey = getThirdGroupAssignments(thirdGroups).get(getThirdSlotKey(slot))
  return groupKey ? [getRankedTeams(ranking, groupKey)[2]].filter(Boolean) : []
}

function slotLabel(slot: Slot, ranking: Ranking, thirdGroups: GroupKey[], winners: Winners, locale: Locale, t: TFunction) {
  const team = slotCandidates(slot, ranking, thirdGroups, winners)[0]
  return team ? getTeamName(team, locale) : getSlotFallback(slot, t)
}

function isMatchReady(match: Match, ranking: Ranking, thirdGroups: GroupKey[], winners: Winners) {
  return slotCandidates(match.left, ranking, thirdGroups, winners).length > 0 && slotCandidates(match.right, ranking, thirdGroups, winners).length > 0
}

function TeamRow({
  team,
  locale,
  t,
  index,
  canUp,
  canDown,
  onMove,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  team: Team
  locale: Locale
  t: TFunction
  index: number
  canUp: boolean
  canDown: boolean
  onMove: (direction: -1 | 1) => void
  isDragging: boolean
  isDropTarget: boolean
  onDragStart: () => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDragLeave: () => void
  onDrop: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      className={cn("team-row", isDragging && "team-row-dragging", isDropTarget && "team-row-drop-target")}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", team.id)
        onDragStart()
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault()
        onDrop()
      }}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-sm font-semibold">{index + 1}</div>
      <FlagIcon team={team} className="team-row-flag" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{getTeamName(team, locale)}</div>
        <div className="text-xs text-muted-foreground">{team.code}</div>
      </div>
      <button className="icon-button" disabled={!canUp} title={t("moveUp")} onClick={() => onMove(-1)}>
        <ArrowUp size={13} />
      </button>
      <button className="icon-button" disabled={!canDown} title={t("moveDown")} onClick={() => onMove(1)}>
        <ArrowDown size={13} />
      </button>
    </div>
  )
}

function App() {
  const { t, i18n } = useTranslation()
  const [savedState] = useState(loadSavedState)
  const [stage, setStage] = useState<Stage>(savedState.stage ?? "groups")
  const [ranking, setRanking] = useState<Ranking>(savedState.ranking ?? initialRanking)
  const [thirdGroups, setThirdGroups] = useState<GroupKey[]>(savedState.thirdGroups ?? initialThirdGroups)
  const [winners, setWinners] = useState<Winners>(savedState.winners ?? {})
  const [dragging, setDragging] = useState<{ group: GroupKey; teamId: string } | null>(null)
  const [dropTarget, setDropTarget] = useState<{ group: GroupKey; teamId: string } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportRequestId, setExportRequestId] = useState(0)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const exportRef = useRef<HTMLDivElement>(null)
  const locale = isLocale(i18n.language) ? i18n.language : "en"

  const champion = getTeam(winners[104])
  const completedMatches = knockoutRounds.filter((match) => winners[match.id]).length
  const readyMatches = knockoutRounds.filter((match) => isMatchReady(match, ranking, thirdGroups, winners))
  const stageReady: Record<Stage, boolean> = {
    groups: true,
    thirds: thirdGroups.length === 8,
    knockout: Boolean(champion),
    share: false,
  }

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ranking,
        thirdGroups,
        winners,
        stage,
        version: storageVersion,
      } satisfies SavedState),
    )
  }, [ranking, thirdGroups, winners, stage])

  useEffect(() => {
    localStorage.setItem(localeStorageKey, locale)
    document.documentElement.lang = locales.find((item) => item.id === locale)?.htmlLang ?? "en"
    document.title = t("metaTitle")
  }, [locale, t])

  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 8,
      color: {
        dark: "#16000a",
        light: "#ffffff",
      },
    }).then(setQrCodeUrl)
  }, [])

  useEffect(() => {
    if (!exportRequestId || stage !== "share" || !exportRef.current) return

    let cancelled = false

    const runExport = async () => {
      const startedAt = performance.now()
      await new Promise((resolve) => requestAnimationFrame(resolve))
      if (cancelled || !exportRef.current) return

      try {
        const dataUrl = await toPng(exportRef.current, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#7f002c",
        })
        const link = document.createElement("a")
        link.download = "world-cup-2026-knockout-prediction.png"
        link.href = dataUrl
        link.click()
      } catch (error) {
        console.error("Failed to export image", error)
      } finally {
        const remaining = Math.max(0, 300 - (performance.now() - startedAt))
        if (remaining) await new Promise((resolve) => window.setTimeout(resolve, remaining))
        if (!cancelled) setIsExporting(false)
      }
    }

    void runExport()

    return () => {
      cancelled = true
    }
  }, [exportRequestId, stage])

  const moveTeam = (groupKey: GroupKey, teamId: string, direction: -1 | 1) => {
    setRanking((current) => {
      const next = [...current[groupKey]]
      const index = next.indexOf(teamId)
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...current, [groupKey]: next }
    })
    setWinners({})
  }

  const reorderTeam = (groupKey: GroupKey, fromTeamId: string, toTeamId: string) => {
    if (fromTeamId === toTeamId) return

    setRanking((current) => {
      const next = [...current[groupKey]]
      const fromIndex = next.indexOf(fromTeamId)
      const toIndex = next.indexOf(toTeamId)
      if (fromIndex === -1 || toIndex === -1) return current
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return { ...current, [groupKey]: next }
    })
    setWinners({})
  }

  const toggleThird = (groupKey: GroupKey) => {
    setThirdGroups((current) => {
      if (current.includes(groupKey)) return current.filter((key) => key !== groupKey)
      if (current.length >= 8) return current
      return [...current, groupKey]
    })
    setWinners({})
  }

  const pickWinner = (matchId: number, teamId: string) => {
    const affected = new Set<number>([matchId])
    let changed = true
    while (changed) {
      changed = false
      for (const match of knockoutRounds) {
        const dependsOn = [match.left, match.right].some((slot) => slot.type === "winner" && affected.has(slot.match))
        if (dependsOn && !affected.has(match.id)) {
          affected.add(match.id)
          changed = true
        }
      }
    }

    setWinners((current) => {
      const next = { ...current, [matchId]: teamId }
      for (const id of affected) {
        if (id !== matchId) delete next[id]
      }
      return next
    })
  }

  const reset = () => {
    setRanking(initialRanking)
    setThirdGroups(initialThirdGroups)
    setWinners({})
    setStage("groups")
  }

  const showShareGraphic = () => {
    setStage("share")
  }

  const exportImage = () => {
    if (isExporting) return
    if (stage !== "share") {
      showShareGraphic()
      return
    }
    setIsExporting(true)
    setExportRequestId((id) => id + 1)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-hero">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded border border-white/25 bg-white/10 px-2.5 py-1 text-xs text-white/85">
                  {t("heroKicker")}
                </div>
                <select className="locale-select" value={locale} onChange={(event) => void i18n.changeLanguage(event.target.value)} aria-label={t("language")}>
                  {locales.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <h1 className="text-3xl font-semibold tracking-normal text-white md:text-5xl">{t("title")}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                {t("subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" asChild>
                <a href="https://github.com/egoist/world-cup-2026" target="_blank" rel="noreferrer" aria-label="GitHub">
                  <GitHubIcon /> GitHub
                </a>
              </Button>
              <Button variant="secondary" onClick={reset}>
                <RotateCcw size={16} /> {t("reset")}
              </Button>
              <Button variant="outline" onClick={exportImage} disabled={isExporting}>
                {isExporting ? <LoaderCircle className="animate-spin" size={16} /> : stage === "share" ? <Download size={16} /> : <Eye size={16} />}
                {isExporting ? t("exporting") : stage === "share" ? t("exportImage") : t("viewShare")}
              </Button>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            {stages.map((item, index) => {
              const ready = stageReady[item.id]
              return (
                <button
                  key={item.id}
                  className={cn("stage-button", stage === item.id && "stage-button-active", ready && "stage-button-ready")}
                  onClick={() => setStage(item.id)}
                >
                  <span className="stage-button-marker">{ready ? <Check size={14} strokeWidth={3} /> : index + 1}</span>
                  {t(`stages.${item.id}`)}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="min-w-0">
          {stage === "groups" && (
            <div>
              <div className="section-heading">
                <h2>{t("groupsTitle")}</h2>
                <p>{t("groupsDescription")}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {groups.map((group) => (
                  <div key={group.key} className="panel">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-base font-semibold">{t("groupLabel", { group: group.key })}</h3>
                    </div>
                    <div className="grid gap-2">
                      {getRankedTeams(ranking, group.key).map((team, index) => (
                        <TeamRow
                          key={team.id}
                          team={team}
                          locale={locale}
                          t={t}
                          index={index}
                          canUp={index > 0}
                          canDown={index < 3}
                          onMove={(direction) => moveTeam(group.key, team.id, direction)}
                          isDragging={dragging?.group === group.key && dragging.teamId === team.id}
                          isDropTarget={dropTarget?.group === group.key && dropTarget.teamId === team.id}
                          onDragStart={() => setDragging({ group: group.key, teamId: team.id })}
                          onDragOver={(event) => {
                            if (dragging?.group !== group.key || dragging.teamId === team.id) return
                            event.preventDefault()
                            event.dataTransfer.dropEffect = "move"
                            setDropTarget({ group: group.key, teamId: team.id })
                          }}
                          onDragLeave={() => {
                            setDropTarget((current) =>
                              current?.group === group.key && current.teamId === team.id ? null : current,
                            )
                          }}
                          onDrop={() => {
                            if (dragging?.group === group.key) {
                              reorderTeam(group.key, dragging.teamId, team.id)
                            }
                            setDragging(null)
                            setDropTarget(null)
                          }}
                          onDragEnd={() => {
                            setDragging(null)
                            setDropTarget(null)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage === "thirds" && (
            <div>
              <div className="section-heading">
                <h2>{t("thirdsTitle")}</h2>
                <p>{t("thirdsDescription")}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                {groups.map((group) => {
                  const third = getRankedTeams(ranking, group.key)[2]
                  const selected = thirdGroups.includes(group.key)
                  return (
                    <button
                      key={group.key}
                      className={cn("third-card", selected && "third-card-selected")}
                      disabled={!selected && thirdGroups.length >= 8}
                      onClick={() => toggleThird(group.key)}
                    >
                      <span className="text-xs text-muted-foreground">{t("groupThird", { group: group.key })}</span>
                      <FlagIcon team={third} className="third-card-flag" />
                      <span className="font-semibold">{getTeamName(third, locale)}</span>
                      {selected && <span className="mt-2 text-xs">{t("advanced")}</span>}
                    </button>
                  )
                })}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">{t("selectedCount", { count: thirdGroups.length })}</div>
            </div>
          )}

          {stage === "knockout" && (
            <div>
              <div className="section-heading">
                <h2>{t("knockoutTitle")}</h2>
                <p>{t("knockoutDescription")}</p>
              </div>
              <KnockoutPicker locale={locale} t={t} ranking={ranking} thirdGroups={thirdGroups} winners={winners} onPick={pickWinner} />
            </div>
          )}

          {stage === "share" && (
            <div>
              <div className="section-heading">
                <h2>{t("shareTitle")}</h2>
                <p>{t("shareDescription")}</p>
              </div>
              <ShareGraphic locale={locale} t={t} refEl={exportRef} ranking={ranking} thirdGroups={thirdGroups} winners={winners} qrCodeUrl={qrCodeUrl} />
            </div>
          )}
        </div>

        <aside className={cn("space-y-4", stage === "share" && "hidden")}>
          <div className="panel sticky top-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-primary-foreground">
                <Trophy size={20} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("championPrediction")}</div>
                <div className="flex items-center gap-2 font-semibold">
                  {champion ? (
                    <>
                      <FlagIcon team={champion} className="summary-flag" />
                      <span>{getTeamName(champion, locale)}</span>
                    </>
                  ) : (
                    t("noChampion")
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-muted p-3">
                <div className="text-muted-foreground">{t("readyMatches")}</div>
                <div className="mt-1 text-xl font-semibold">{readyMatches.length}</div>
              </div>
              <div className="rounded-md bg-muted p-3">
                <div className="text-muted-foreground">{t("completed")}</div>
                <div className="mt-1 text-xl font-semibold">{completedMatches}/31</div>
              </div>
            </div>
            <Button className="mt-4 w-full" onClick={showShareGraphic}>
              {t("viewShare")}
            </Button>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("dataNote")}</p>
          </div>
        </aside>
      </section>
    </main>
  )
}

const knockoutRoundOrder = ["r32", "r16", "qf", "sf", "final"] as const

function KnockoutPicker({
  locale,
  t,
  ranking,
  thirdGroups,
  winners,
  onPick,
}: {
  locale: Locale
  t: TFunction
  ranking: Ranking
  thirdGroups: GroupKey[]
  winners: Winners
  onPick: (matchId: number, teamId: string) => void
}) {
  return (
    <div className="knockout-picker">
      {knockoutRoundOrder.map((round) => {
        const matches = knockoutRounds.filter((match) => match.round === round)
        const completed = matches.filter((match) => winners[match.id]).length
        return (
          <section key={round} className="knockout-round-section">
            <div className="knockout-round-heading">
              <h3>{t(`roundLabels.${round}`)}</h3>
              <span>
                {completed}/{matches.length}
              </span>
            </div>
            <div className="knockout-match-grid">
              {matches.map((match) => (
                <KnockoutMatchCard
                  key={match.id}
                  locale={locale}
                  t={t}
                  match={match}
                  ranking={ranking}
                  thirdGroups={thirdGroups}
                  winners={winners}
                  onPick={onPick}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function KnockoutMatchCard({
  locale,
  t,
  match,
  ranking,
  thirdGroups,
  winners,
  onPick,
}: {
  locale: Locale
  t: TFunction
  match: Match
  ranking: Ranking
  thirdGroups: GroupKey[]
  winners: Winners
  onPick: (matchId: number, teamId: string) => void
}) {
  const leftTeam = slotCandidates(match.left, ranking, thirdGroups, winners)[0]
  const rightTeam = slotCandidates(match.right, ranking, thirdGroups, winners)[0]
  const winner = getTeam(winners[match.id])
  const ready = Boolean(leftTeam && rightTeam)

  return (
    <article className={cn("knockout-match-card", !ready && "knockout-match-card-locked")}>
      <div className="knockout-match-meta">
        <span>{t("matchNumber", { id: match.id })}</span>
        <span>{getVenueName(match.venue, t)}</span>
      </div>
      <div className="knockout-team-choices">
        {[
          { team: leftTeam, label: slotLabel(match.left, ranking, thirdGroups, winners, locale, t) },
          { team: rightTeam, label: slotLabel(match.right, ranking, thirdGroups, winners, locale, t) },
        ].map((item, index) => {
          const selected = Boolean(item.team && winner && item.team.id === winner.id)
          return (
            <button
              key={`${match.id}-${index}`}
              className={cn("knockout-team-choice", selected && "knockout-team-choice-selected")}
              disabled={!ready || !item.team}
              onClick={() => item.team && onPick(match.id, item.team.id)}
            >
              <span className="knockout-team-main">
                {item.team ? <FlagIcon team={item.team} className="knockout-team-flag" /> : <span>·</span>}
                <span>{item.team ? getTeamName(item.team, locale) : item.label}</span>
              </span>
              {selected ? (
                <span className="knockout-winner-badge">
                  <Trophy size={13} />
                  {t("winner")}
                </span>
              ) : (
                <span className="knockout-team-code">{item.team?.code ?? t("pending")}</span>
              )}
            </button>
          )
        })}
      </div>
    </article>
  )
}

function ShareGraphic({
  locale,
  t,
  refEl,
  ranking,
  thirdGroups,
  winners,
  qrCodeUrl,
}: {
  locale: Locale
  t: TFunction
  refEl: React.RefObject<HTMLDivElement | null>
  ranking: Ranking
  thirdGroups: GroupKey[]
  winners: Winners
  qrCodeUrl: string
}) {
  const champion = getTeam(winners[104])

  return (
    <div ref={refEl} className="share-graphic">
      <div className="poster-ornament poster-ornament-left" aria-hidden="true" />
      <div className="poster-ornament poster-ornament-right" aria-hidden="true" />
      <header className="poster-header">
        <div className="poster-kicker">2026 FIFA WORLD CUP</div>
        <h2>{t("posterTitle")}</h2>
        <p>{t("posterSubtitle")}</p>
      </header>
      <section className="poster-bracket" aria-label={t("posterAriaLabel")}>
        <PosterBracketGraph locale={locale} ranking={ranking} thirdGroups={thirdGroups} winners={winners} />
        <div className="poster-champion">
          {champion ? (
            <div className="poster-champion-team">
              <FlagIcon team={champion} className="poster-champion-flag" />
              <span className="poster-champion-name">{getTeamName(champion, locale)}</span>
            </div>
          ) : (
            <div className="poster-champion-empty">{t("posterEmpty")}</div>
          )}
          <div className="poster-champion-label">CHAMPIONS</div>
        </div>
        <div className="poster-trophy">
          <img className="poster-trophy-image" src="/world-cup-trophy.png" alt="" />
        </div>
      </section>
      <footer className="poster-footer">
        {qrCodeUrl ? <img className="poster-qr" src={qrCodeUrl} alt={t("posterQrAlt")} /> : <div className="poster-qr" aria-hidden="true" />}
        <div>
          <div className="poster-footer-main">{t("posterFooterMain")}</div>
          <div className="poster-footer-sub">WORLD CUP 2026 PREDICTOR</div>
          <div className="poster-footer-url">{shareUrl}</div>
        </div>
      </footer>
    </div>
  )
}

const posterWidth = 692
const posterHeight = 664
const posterNodeWidth = 64
const posterNodeHeight = 38
const posterFinalCenterX = posterWidth / 2
const posterLeftColumnX = [0, 150, 223, 260]
const posterRightColumnX = [628, 542, 469, 432]
const posterFinalY = 326
const posterChampionLineTop = 262
const posterBasePathProps = {
  fill: "none",
  stroke: "rgb(255 39 91)",
  strokeWidth: 3,
  strokeLinecap: "butt",
  strokeLinejoin: "miter",
} as const
const posterActivePathProps = {
  fill: "none",
  stroke: "rgb(255 225 45)",
  strokeWidth: 4,
  strokeLinecap: "butt",
  strokeLinejoin: "miter",
} as const
const posterRoundY = {
  r32: [0, 78, 156, 234, 312, 390, 468, 546],
  r16: [39, 195, 351, 507],
  qf: [117, 429],
  sf: [307],
}
const posterMatchIds = {
  left: {
    r32: [74, 77, 73, 75, 83, 84, 81, 82],
    r16: [89, 90, 93, 94],
    qf: [97, 98],
    sf: [101],
  },
  right: {
    r32: [76, 78, 79, 80, 86, 88, 85, 87],
    r16: [91, 92, 95, 96],
    qf: [99, 100],
    sf: [102],
  },
}

function PosterBracketGraph({ locale, ranking, thirdGroups, winners }: { locale: Locale; ranking: Ranking; thirdGroups: GroupKey[]; winners: Winners }) {
  const matches = new Map(knockoutRounds.map((match) => [match.id, match]))
  return (
    <div className="poster-bracket-board">
      <PosterLines side="left" />
      <PosterLines side="right" />
      <PosterFinalLines winners={winners} />
      <PosterActiveLines ranking={ranking} thirdGroups={thirdGroups} winners={winners} />
      <PosterBracketSide side="left" locale={locale} matchIds={posterMatchIds.left} matches={matches} ranking={ranking} thirdGroups={thirdGroups} winners={winners} />
      <PosterBracketSide side="right" locale={locale} matchIds={posterMatchIds.right} matches={matches} ranking={ranking} thirdGroups={thirdGroups} winners={winners} />
    </div>
  )
}

function PosterBracketSide({
  side,
  locale,
  matchIds,
  matches,
  ranking,
  thirdGroups,
  winners,
}: {
  side: "left" | "right"
  locale: Locale
  matchIds: { r32: number[]; r16: number[]; qf: number[]; sf: number[] }
  matches: Map<number, Match>
  ranking: Ranking
  thirdGroups: GroupKey[]
  winners: Winners
}) {
  const columnX = side === "left" ? posterLeftColumnX : posterRightColumnX
  const nodeStyle = (column: number, top: number): CSSProperties => ({
    left: column === 0 ? columnX[column] : columnX[column] - posterNodeWidth / 2,
    top,
  })

  return (
    <>
      {matchIds.r32.map((id, index) => (
        <PosterMatch key={id} side={side} locale={locale} match={matches.get(id)!} ranking={ranking} thirdGroups={thirdGroups} winners={winners} style={nodeStyle(0, posterRoundY.r32[index])} showPair />
      ))}
      {matchIds.r16.map((id, index) => (
        <PosterMatch key={id} side={side} locale={locale} match={matches.get(id)!} ranking={ranking} thirdGroups={thirdGroups} winners={winners} style={nodeStyle(1, posterRoundY.r16[index])} />
      ))}
      {matchIds.qf.map((id, index) => (
        <PosterMatch key={id} side={side} locale={locale} match={matches.get(id)!} ranking={ranking} thirdGroups={thirdGroups} winners={winners} style={nodeStyle(2, posterRoundY.qf[index])} />
      ))}
      {matchIds.sf.map((id, index) => (
        <PosterMatch key={id} side={side} locale={locale} match={matches.get(id)!} ranking={ranking} thirdGroups={thirdGroups} winners={winners} style={nodeStyle(3, posterRoundY.sf[index])} />
      ))}
    </>
  )
}

function PosterMatch({
  side,
  locale,
  match,
  ranking,
  thirdGroups,
  winners,
  style,
  showPair,
}: {
  side: "left" | "right"
  locale: Locale
  match: Match
  ranking: Ranking
  thirdGroups: GroupKey[]
  winners: Winners
  style: CSSProperties
  showPair?: boolean
}) {
  const leftTeam = slotCandidates(match.left, ranking, thirdGroups, winners)[0]
  const rightTeam = slotCandidates(match.right, ranking, thirdGroups, winners)[0]
  const winner = getTeam(winners[match.id])
  const teams = (showPair ? [leftTeam, rightTeam] : [winner]).filter(Boolean) as Team[]

  return (
    <div className={cn("poster-match", `poster-match-${match.round}`, side === "right" && "poster-match-right", !teams.length && "poster-match-empty")} style={style}>
      {teams.length ? (
        teams.map((team) => (
          <div key={team.id} className={cn("poster-team", !showPair && "poster-team-flag-only", team.id === winner?.id && "poster-team-winner")}>
            <FlagIcon team={team} className="poster-team-flag" />
            {showPair && <span>{getTeamName(team, locale)}</span>}
          </div>
        ))
      ) : (
        <span className="poster-slot" />
      )}
    </div>
  )
}

function PosterLines({ side }: { side: "left" | "right" }) {
  const columnX = side === "left" ? posterLeftColumnX : posterRightColumnX
  const pairBridge = side === "left" ? columnX[0] + posterNodeWidth + 12 : columnX[0] - 12
  const sourceX = (column: number) => {
    return column === 0 ? pairBridge : columnX[column]
  }
  const targetX = (column: number) => columnX[column]
  const linePair = (fromColumn: number, fromY: number, toColumn: number, toY: number) => {
    return { fromX: sourceX(fromColumn), fromY, toX: targetX(toColumn), toY }
  }
  const connections = [
    ...posterRoundY.r16.flatMap((targetY, index) => [
      linePair(0, posterRoundY.r32[index * 2] + posterNodeHeight / 2, 1, targetY + posterNodeHeight / 2),
      linePair(0, posterRoundY.r32[index * 2 + 1] + posterNodeHeight / 2, 1, targetY + posterNodeHeight / 2),
    ]),
    ...posterRoundY.qf.flatMap((targetY, index) => [
      linePair(1, posterRoundY.r16[index * 2] + posterNodeHeight / 2, 2, targetY + posterNodeHeight / 2),
      linePair(1, posterRoundY.r16[index * 2 + 1] + posterNodeHeight / 2, 2, targetY + posterNodeHeight / 2),
    ]),
  ]
  const sfConnections = posterRoundY.qf.map((qfTop) => ({
    fromX: sourceX(2),
    fromY: qfTop + posterNodeHeight / 2,
    toX: targetX(3),
    toY: posterRoundY.sf[0] + posterNodeHeight / 2,
  }))

  return (
    <svg className="poster-lines" width={posterWidth} height={posterHeight} viewBox={`0 0 ${posterWidth} ${posterHeight}`} aria-hidden="true">
      {posterRoundY.r32.map((top, index) => {
        const y1 = top + 10
        const y2 = top + 28
        const centerY = top + posterNodeHeight / 2
        const nodeEdge = side === "left" ? columnX[0] + posterNodeWidth : columnX[0]
        return (
          <path key={`pair-${index}`} {...posterBasePathProps} d={`M ${nodeEdge} ${y1} H ${pairBridge} V ${y2} H ${nodeEdge} M ${pairBridge} ${centerY} H ${sourceX(0)}`} />
        )
      })}
      {connections.map((line, index) => {
        const midX = line.fromX + (line.toX - line.fromX) / 2
        return <path key={index} {...posterBasePathProps} d={`M ${line.fromX} ${line.fromY} H ${midX} V ${line.toY} H ${line.toX}`} />
      })}
      {sfConnections.map((line, index) => (
        <path key={`sf-${index}`} {...posterBasePathProps} d={`M ${line.fromX} ${line.fromY} H ${line.toX} V ${line.toY}`} />
      ))}
    </svg>
  )
}

function PosterFinalLines({ winners }: { winners: Winners }) {
  const championId = winners[104]
  const leftFinalistId = winners[101]
  const rightFinalistId = winners[102]
  const activeSide = championId && championId === leftFinalistId ? "left" : championId && championId === rightFinalistId ? "right" : undefined

  return (
    <svg className="poster-lines poster-final-lines" width={posterWidth} height={posterHeight} viewBox={`0 0 ${posterWidth} ${posterHeight}`} aria-hidden="true">
      <path className="poster-final-base" {...posterBasePathProps} d={`M ${posterLeftColumnX[3]} ${posterFinalY} H ${posterFinalCenterX}`} />
      <path className="poster-final-base" {...posterBasePathProps} d={`M ${posterRightColumnX[3]} ${posterFinalY} H ${posterFinalCenterX}`} />
      {activeSide === "left" && <path className="poster-final-active" {...posterActivePathProps} d={`M ${posterLeftColumnX[3]} ${posterFinalY} H ${posterFinalCenterX} V ${posterChampionLineTop}`} />}
      {activeSide === "right" && <path className="poster-final-active" {...posterActivePathProps} d={`M ${posterRightColumnX[3]} ${posterFinalY} H ${posterFinalCenterX} V ${posterChampionLineTop}`} />}
    </svg>
  )
}

function getPosterMatchPoint(matchId: number) {
  for (const side of ["left", "right"] as const) {
    const matchIds = posterMatchIds[side]
    const columnX = side === "left" ? posterLeftColumnX : posterRightColumnX
    const rounds = ["r32", "r16", "qf", "sf"] as const

    for (const round of rounds) {
      const index = matchIds[round].indexOf(matchId)
      if (index === -1) continue
      const y = posterRoundY[round][index] + posterNodeHeight / 2
      if (round === "r32") {
        return {
          side,
          x: side === "left" ? columnX[0] + posterNodeWidth + 12 : columnX[0] - 12,
          y,
        }
      }
      return { side, x: columnX[rounds.indexOf(round)], y }
    }
  }

  return undefined
}

function getPosterPath(fromMatchId: number, toMatchId: number) {
  const from = getPosterMatchPoint(fromMatchId)
  const to = toMatchId === 104 ? { x: posterFinalCenterX, y: posterFinalY } : getPosterMatchPoint(toMatchId)
  if (!from || !to) return undefined
  if (toMatchId === 101 || toMatchId === 102) {
    return `M ${from.x} ${from.y} H ${to.x} V ${to.y}`
  }
  const midX = from.x + (to.x - from.x) / 2
  return `M ${from.x} ${from.y} H ${midX} V ${to.y} H ${to.x}`
}

function getPosterR32WinnerPath(match: Match, winnerId: string, ranking: Ranking, thirdGroups: GroupKey[], winners: Winners) {
  for (const side of ["left", "right"] as const) {
    const index = posterMatchIds[side].r32.indexOf(match.id)
    if (index === -1) continue

    const leftTeam = slotCandidates(match.left, ranking, thirdGroups, winners)[0]
    const rightTeam = slotCandidates(match.right, ranking, thirdGroups, winners)[0]
    const winnerIndex = leftTeam?.id === winnerId ? 0 : rightTeam?.id === winnerId ? 1 : -1
    if (winnerIndex === -1) return undefined

    const columnX = side === "left" ? posterLeftColumnX : posterRightColumnX
    const top = posterRoundY.r32[index]
    const y = top + (winnerIndex === 0 ? 10 : 28)
    const centerY = top + posterNodeHeight / 2
    const nodeEdge = side === "left" ? columnX[0] + posterNodeWidth : columnX[0]
    const pairBridge = side === "left" ? columnX[0] + posterNodeWidth + 12 : columnX[0] - 12
    return `M ${nodeEdge} ${y} H ${pairBridge} V ${centerY}`
  }

  return undefined
}

function PosterActiveLines({ ranking, thirdGroups, winners }: { ranking: Ranking; thirdGroups: GroupKey[]; winners: Winners }) {
  const paths: string[] = []
  const matches = new Map(knockoutRounds.map((match) => [match.id, match]))

  const collect = (matchId: number) => {
    const match = matches.get(matchId)
    const winnerId = winners[matchId]
    if (!match || !winnerId) return

    if (match.round === "r32") {
      const path = getPosterR32WinnerPath(match, winnerId, ranking, thirdGroups, winners)
      if (path) paths.push(path)
      return
    }

    const advancingSlot = [match.left, match.right].find((slot) => slot.type === "winner" && winners[slot.match] === winnerId)
    if (advancingSlot?.type !== "winner") return

    const path = getPosterPath(advancingSlot.match, matchId)
    if (path) paths.push(path)
    collect(advancingSlot.match)
  }

  collect(104)

  return (
    <svg className="poster-lines poster-active-lines" width={posterWidth} height={posterHeight} viewBox={`0 0 ${posterWidth} ${posterHeight}`} aria-hidden="true">
      {paths.map((path, index) => (
        <path key={index} {...posterActivePathProps} d={path} />
      ))}
    </svg>
  )
}

const nodeWidth = 184
const nodeHeight = 62
const bracketHeight = 584
const bracketWidth = 1520
const leftColumnX = [0, 198, 396, 572]
const rightColumnX = [1336, 1138, 940, 764]
const finalX = 668
const roundY = {
  r32: [0, 74, 148, 222, 296, 370, 444, 518],
  r16: [37, 185, 333, 481],
  qf: [111, 407],
  sf: [259],
}

function BracketGraph({
  locale,
  t,
  ranking,
  thirdGroups,
  winners,
  onPick,
}: {
  locale: Locale
  t: TFunction
  ranking: Ranking
  thirdGroups: GroupKey[]
  winners: Winners
  onPick?: (matchId: number, teamId: string) => void
}) {
  return (
    <>
      <div className="bracket-rounds" aria-hidden="true">
        <span>{t("roundLabels.r32")}</span>
        <span>{t("roundLabels.r16")}</span>
        <span>{t("roundLabels.qf")}</span>
        <span>{t("roundLabels.sf")}</span>
        <span>{t("roundLabels.final")}</span>
        <span>{t("roundLabels.sf")}</span>
        <span>{t("roundLabels.qf")}</span>
        <span>{t("roundLabels.r16")}</span>
        <span>{t("roundLabels.r32")}</span>
      </div>
      <div className={cn("bracket-board", onPick && "bracket-board-interactive")}>
        <BracketHalf
          side="left"
          title={t("leftHalf")}
          locale={locale}
          t={t}
          matchIds={{
            r32: [74, 77, 73, 75, 83, 84, 81, 82],
            r16: [89, 90, 93, 94],
            qf: [97, 98],
            sf: [101],
          }}
          ranking={ranking}
          thirdGroups={thirdGroups}
          winners={winners}
          onPick={onPick}
        />
        <div className="final-center">
          <svg className="final-lines" width={bracketWidth} height={bracketHeight} viewBox={`0 0 ${bracketWidth} ${bracketHeight}`} aria-hidden="true">
            <path d="M 756 292 H 668" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 852 292 H 948" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <BracketNode
            match={knockoutRounds.find((match) => match.id === 104)!}
            ranking={ranking}
            thirdGroups={thirdGroups}
            winners={winners}
            onPick={onPick}
            className="final-node"
            locale={locale}
            t={t}
          />
        </div>
        <BracketHalf
          side="right"
          title={t("rightHalf")}
          locale={locale}
          t={t}
          matchIds={{
            r32: [76, 78, 79, 80, 86, 88, 85, 87],
            r16: [91, 92, 95, 96],
            qf: [99, 100],
            sf: [102],
          }}
          ranking={ranking}
          thirdGroups={thirdGroups}
          winners={winners}
          onPick={onPick}
        />
      </div>
    </>
  )
}

function BracketHalf({
  side,
  title,
  locale,
  t,
  matchIds,
  ranking,
  thirdGroups,
  winners,
  onPick,
}: {
  side: "left" | "right"
  title: string
  locale: Locale
  t: TFunction
  matchIds: { r32: number[]; r16: number[]; qf: number[]; sf: number[] }
  ranking: Ranking
  thirdGroups: GroupKey[]
  winners: Winners
  onPick?: (matchId: number, teamId: string) => void
}) {
  const matches = new Map(knockoutRounds.map((match) => [match.id, match]))
  const columnX = side === "left" ? leftColumnX : rightColumnX

  return (
    <div className={cn("bracket-half", side === "right" && "bracket-half-right")}>
      <div className="bracket-half-title">{title}</div>
      <BracketLines side={side} />
      {matchIds.r32.map((id, index) => (
        <BracketNode
          key={id}
          match={matches.get(id)!}
          locale={locale}
          t={t}
          ranking={ranking}
          thirdGroups={thirdGroups}
          winners={winners}
          onPick={onPick}
          style={{ left: columnX[0], top: roundY.r32[index] }}
        />
      ))}
      {matchIds.r16.map((id, index) => (
        <BracketNode
          key={id}
          match={matches.get(id)!}
          locale={locale}
          t={t}
          ranking={ranking}
          thirdGroups={thirdGroups}
          winners={winners}
          onPick={onPick}
          style={{ left: columnX[1], top: roundY.r16[index] }}
        />
      ))}
      {matchIds.qf.map((id, index) => (
        <BracketNode
          key={id}
          match={matches.get(id)!}
          locale={locale}
          t={t}
          ranking={ranking}
          thirdGroups={thirdGroups}
          winners={winners}
          onPick={onPick}
          style={{ left: columnX[2], top: roundY.qf[index] }}
        />
      ))}
      {matchIds.sf.map((id, index) => (
        <BracketNode
          key={id}
          match={matches.get(id)!}
          locale={locale}
          t={t}
          ranking={ranking}
          thirdGroups={thirdGroups}
          winners={winners}
          onPick={onPick}
          style={{ left: columnX[3], top: roundY.sf[index] }}
        />
      ))}
    </div>
  )
}

function BracketLines({ side }: { side: "left" | "right" }) {
  const columnX = side === "left" ? leftColumnX : rightColumnX
  const linePair = (fromColumn: number, fromY: number, toColumn: number, toY: number) => {
    if (side === "left") {
      return { fromX: columnX[fromColumn] + nodeWidth, fromY, toX: columnX[toColumn], toY }
    }
    return { fromX: columnX[fromColumn], fromY, toX: columnX[toColumn] + nodeWidth, toY }
  }
  const connections = [
    ...roundY.r16.flatMap((targetY, index) => [
      linePair(0, roundY.r32[index * 2] + nodeHeight / 2, 1, targetY + nodeHeight / 2),
      linePair(0, roundY.r32[index * 2 + 1] + nodeHeight / 2, 1, targetY + nodeHeight / 2),
    ]),
    ...roundY.qf.flatMap((targetY, index) => [
      linePair(1, roundY.r16[index * 2] + nodeHeight / 2, 2, targetY + nodeHeight / 2),
      linePair(1, roundY.r16[index * 2 + 1] + nodeHeight / 2, 2, targetY + nodeHeight / 2),
    ]),
    ...roundY.sf.flatMap((targetY) => [
      linePair(2, roundY.qf[0] + nodeHeight / 2, 3, targetY + nodeHeight / 2),
      linePair(2, roundY.qf[1] + nodeHeight / 2, 3, targetY + nodeHeight / 2),
    ]),
  ]

  return (
    <svg className="bracket-lines" width={bracketWidth} height={bracketHeight} viewBox={`0 0 ${bracketWidth} ${bracketHeight}`} aria-hidden="true">
      {connections.map((line, index) => {
        const midX = line.fromX + (line.toX - line.fromX) / 2
        return (
          <path
            key={index}
            d={`M ${line.fromX} ${line.fromY} H ${midX} V ${line.toY} H ${line.toX}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}
    </svg>
  )
}

function BracketNode({
  match,
  locale,
  ranking,
  thirdGroups,
  winners,
  onPick,
  className,
  style,
  t,
}: {
  match: Match
  locale: Locale
  ranking: Ranking
  thirdGroups: GroupKey[]
  winners: Winners
  onPick?: (matchId: number, teamId: string) => void
  className?: string
  style?: CSSProperties
  t: TFunction
}) {
  const leftTeam = slotCandidates(match.left, ranking, thirdGroups, winners)[0]
  const rightTeam = slotCandidates(match.right, ranking, thirdGroups, winners)[0]
  const winner = getTeam(winners[match.id])
  const ready = Boolean(leftTeam && rightTeam)
  const canPick = Boolean(onPick && ready)

  return (
    <div className={cn("bracket-node", canPick && "bracket-node-ready", !ready && "bracket-node-locked", className)} style={style}>
      <div className="bracket-node-meta">#{match.id}</div>
      <div className="bracket-node-teams">
      {[
        { team: leftTeam, label: leftTeam ? getTeamName(leftTeam, locale) : getSlotFallback(match.left, t) },
        { team: rightTeam, label: rightTeam ? getTeamName(rightTeam, locale) : getSlotFallback(match.right, t) },
      ].map((item, index) => {
        const selected = item.team?.id === winner?.id
        return (
          <button
            key={`${match.id}-${index}`}
            className={cn("bracket-node-team", !item.team && "bracket-node-team-empty", selected && "bracket-node-winner")}
            disabled={!canPick || !item.team}
            onClick={() => item.team && onPick?.(match.id, item.team.id)}
          >
            <span className="bracket-node-team-label">
              {item.team && <FlagIcon team={item.team} className="bracket-node-team-flag" />}
              <span>{item.label}</span>
            </span>
          </button>
        )
      })}
      </div>
    </div>
  )
}

export default App
