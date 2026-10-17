import type { EngineInterface, PluginOptions, Register, SessionUsage } from 'claude-code'

type Figures = Pick<SessionUsage, 'context' | 'rateLimits' | 'cost'>
type SessionSpend = { date: string; base: number; usd: number }

const WINDOWS: [kind: string, label: string][] = [
  ['five_hour', '5h'],
  ['seven_day', 'week'],
]
const KEEP_DAYS = 8

const pad = (n: number) => String(n).padStart(2, '0')
const localDate = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const bar = (percent: number, width = 10) => {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width)
  return '▰'.repeat(filled) + '▱'.repeat(width - filled)
}
export const dot = (percent: number) => (percent >= 85 ? '🔴' : percent >= 60 ? '🟡' : '🟢')
export const tokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`
export const until = (iso: string, now: number) => {
  const mins = Math.round((Date.parse(iso) - now) / 60_000)
  if (!Number.isFinite(mins) || mins <= 0) return 'now'
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  return d > 0 ? `${d}d${h}h` : h > 0 ? `${h}h${pad(m)}m` : `${m}m`
}

// One line: context fill, each plan window with its reset countdown, and today's spend.
export const line = (u: Figures, now: number, today: number | undefined, width = 10) => {
  const parts: string[] = []
  const c = u.context
  parts.push(
    c.percent === undefined
      ? `ctx —/${tokens(c.window)}`
      : `${dot(c.percent)} ctx ${bar(c.percent, width)} ${Math.round(c.percent)}%` +
          (c.tokens === undefined ? '' : ` ${tokens(c.tokens)}/${tokens(c.window)}`),
  )
  for (const [kind, label] of WINDOWS) {
    const w = u.rateLimits.find(r => r.kind === kind)
    parts.push(
      w
        ? `${dot(w.percentUsed)} ${label} ${bar(w.percentUsed, width)} ${w.percentUsed}%` +
            (w.resetsAt ? ` ↻${until(w.resetsAt, now)}` : '')
        : `${label} —`,
    )
  }
  if (today !== undefined) parts.push(`today $${today.toFixed(2)}`)

  return parts.join('  │  ')
}

// Records this session's spend for today and returns today's total across every session.
// A session that crosses midnight starts the new day from what it had spent by then.
const todaySpend = async ($: EngineInterface, usd: number | undefined, now: number) => {
  if (usd === undefined) return undefined
  const date = localDate(now)
  const key = `sess:${await $.session.id()}`
  const held = (await $.store.get(key)) as SessionSpend | undefined
  const next: SessionSpend =
    held === undefined
      ? { date, base: 0, usd }
      : held.date === date
        ? { ...held, usd }
        : { date, base: held.usd, usd }
  if (held?.usd !== next.usd || held?.date !== next.date) await $.store.set(key, next)

  const oldest = localDate(now - KEEP_DAYS * 86_400_000)
  let total = 0
  for (const k of await $.store.keys()) {
    if (!k.startsWith('sess:')) continue
    const rec = k === key ? next : ((await $.store.get(k)) as SessionSpend | undefined)
    if (!rec) continue
    if (rec.date < oldest) await $.store.delete(k)
    else if (rec.date === date) total += Math.max(0, rec.usd - rec.base)
  }

  return total
}

const show = async ($: EngineInterface, options: PluginOptions, figures?: Figures) => {
  const u = figures ?? (await $.session.usage())
  const now = await $.clock.now()
  const today = options.showToday === false ? undefined : await todaySpend($, u.cost?.usd, now)
  const width = Math.min(20, Math.max(0, Math.round(Number(options.barWidth ?? 10))))
  $.ui.status(line(u, now, today, width))
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const ran = await next(e)
    await show($, options)
    // Keeps the reset countdowns current between measurements; the plain usage call is free.
    $.clock.every(60_000, () => void show($, options))

    return ran
  })

  on('session.measure', async ($, e, next) => {
    await show($, options, e)
    return next(e)
  })
}
