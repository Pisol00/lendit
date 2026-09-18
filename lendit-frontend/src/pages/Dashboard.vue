<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ChevronLeft, ChevronRight, Book, Tags, Users, BarChart3 } from '@lucide/vue'
import LEmpty from '../components/ui/LEmpty.vue'
import { useDashboard } from '../composables/useDashboard'
import type { DayCount } from '../types/api'

const { t } = useI18n()

const { data, loading, error, fetchDashboard } = useDashboard()

const stats = computed(() => data.value.stats)
const perDay = computed(() => data.value.perDay)
const booksByTag = computed(() => data.value.booksByTag)
const topBooks = computed(() => data.value.topBooks)
const topOwners = computed(() => data.value.topOwners)
const topBorrowers = computed(() => data.value.topBorrowers)

const ALL_TIME = 'all'
const YEARS_BACK = 2

const today = new Date()
const period = ref(ymOf(today))

function ymOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthOf(ym: string) {
  if (ym === ALL_TIME) return null
  const [y, m] = ym.split('-').map(Number)
  if (y === undefined || m === undefined) return null
  return new Date(y, m - 1, 1)
}

const chartMonth = computed(() => monthOf(period.value))

const periodLabel = computed(() => {
  const m = monthOf(period.value)
  return m ? m.toLocaleString('en-GB', { month: 'long', year: 'numeric' }) : t('dashboard.allTime')
})

const viewYear = ref((monthOf(period.value) ?? today).getFullYear())

const firstYear = today.getFullYear() - YEARS_BACK
const canPrevYear = computed(() => viewYear.value > firstYear)
const canNextYear = computed(() => viewYear.value < today.getFullYear())

const monthCells = computed(() =>
  Array.from({ length: 12 }, (_, i) => {
    const d = new Date(viewYear.value, i, 1)
    const value = ymOf(d)
    return {
      value,
      label: d.toLocaleString('en-GB', { month: 'short' }),
      selected: value === period.value,
      disabled:
        viewYear.value > today.getFullYear() ||
        (viewYear.value === today.getFullYear() && i > today.getMonth()),
    }
  }),
)

const periodOpen = ref(false)
const periodEl = ref<HTMLElement | null>(null)

function togglePeriod() {
  if (!periodOpen.value) viewYear.value = (monthOf(period.value) ?? today).getFullYear()
  periodOpen.value = !periodOpen.value
}

function onDocPointer(e: PointerEvent) {
  if (periodOpen.value && periodEl.value && !periodEl.value.contains(e.target as Node | null)) {
    periodOpen.value = false
  }
}
function onDocKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') periodOpen.value = false
}
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer)
  document.removeEventListener('keydown', onDocKeydown)
})

function load() {
  fetchDashboard({ month: period.value }).catch(() => {})
}

function onPeriodChange(value: string) {
  if (value === period.value) {
    periodOpen.value = false
    return
  }
  period.value = value
  periodOpen.value = false
  load()
}

onMounted(() => {
  load()
  document.addEventListener('pointerdown', onDocPointer)
  document.addEventListener('keydown', onDocKeydown)
})

const PALETTE_SIZE = 8
const palette = Array.from({ length: PALETTE_SIZE }, (_, i) =>
  getComputedStyle(document.documentElement)
    .getPropertyValue(`--chart-series-${i + 1}`)
    .trim(),
).filter(Boolean)

const statCards = computed(() => [
  {
    key: 'members',
    label: t('dashboard.stats.members'),
    value: stats.value.members,
    foot: t('dashboard.stats.membersFoot'),
    tint: 'accent',
  },
  {
    key: 'books',
    label: t('dashboard.stats.books'),
    value: stats.value.books,
    foot: t('dashboard.stats.booksFoot'),
    tint: 'good',
  },
  {
    key: 'pending',
    label: t('dashboard.stats.pending'),
    value: stats.value.pendingRequests,
    foot: t('dashboard.stats.pendingFoot'),
    tint: 'warn',
  },
  {
    key: 'active',
    label: t('dashboard.stats.active'),
    value: stats.value.activeBorrowings,
    foot: t('dashboard.stats.activeFoot'),
    tint: 'crit',
  },
])

const esc = (s: unknown) => String(s ?? '')

const daysInMonth = computed(() =>
  chartMonth.value
    ? new Date(chartMonth.value.getFullYear(), chartMonth.value.getMonth() + 1, 0).getDate()
    : 31,
)

function densify(rows: DayCount[] | undefined) {
  const arr = new Array(daysInMonth.value + 1).fill(0)
  ;(rows || []).forEach((d: DayCount) => {
    if (d.day >= 1 && d.day <= daysInMonth.value) arr[d.day] = d.count
  })
  return arr
}
const borrowedByDay = computed(() => densify(perDay.value.borrowed))
const returnedByDay = computed(() => densify(perDay.value.returned))

const sumBorrowed = computed(() => borrowedByDay.value.reduce((a, b) => a + b, 0))
const sumReturned = computed(() => returnedByDay.value.reduce((a, b) => a + b, 0))

function niceScale(maxVal: number, ticks: number) {
  maxVal = Math.max(maxVal, 1)
  const rawStep = maxVal / ticks
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const n = rawStep / pow
  let step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
  step = Math.max(1, Math.round(step))
  return { max: step * ticks, step }
}

const CHART = { W: 720, H: 185, padL: 30, padR: 12, padT: 12, padB: 24 }
const plotW = CHART.W - CHART.padL - CHART.padR
const plotH = CHART.H - CHART.padT - CHART.padB
const TICKS = 4
const baseY = CHART.padT + plotH

const slot = computed(() => plotW / daysInMonth.value)
const groupW = computed(() => slot.value * 0.66)
const gap = computed(() => Math.min(1.5, slot.value * 0.06))
const barW = computed(() => (groupW.value - gap.value) / 2)

const axisMax = computed(
  () => niceScale(Math.max(...borrowedByDay.value, ...returnedByDay.value, 1), TICKS).max,
)
const slotStart = (day: number) => CHART.padL + (day - 1) * slot.value
const hFor = (v: number) => (v <= 0 ? 0 : Math.max(1.5, (v / axisMax.value) * plotH))

const yTicks = computed(() =>
  Array.from({ length: TICKS + 1 }, (_, i) => {
    const v = (axisMax.value * i) / TICKS
    const y = CHART.padT + (1 - i / TICKS) * plotH
    return { v: Math.round(v), y, base: i === 0 }
  }),
)

const barGroups = computed(() =>
  Array.from({ length: daysInMonth.value }, (_, i) => {
    const d = i + 1
    const w = barW.value
    const gx = slotStart(d) + (slot.value - groupW.value) / 2
    const hb = hFor(borrowedByDay.value[d])
    const hr = hFor(returnedByDay.value[d])
    const rx = Math.min(2, w / 2)
    return {
      day: d,
      borrowed: { x: gx, y: baseY - hb, w, h: hb, rx, show: hb > 0 },
      returned: { x: gx + w + gap.value, y: baseY - hr, w, h: hr, rx, show: hr > 0 },
      showLabel: (d - 1) % 5 === 0 || d === daysInMonth.value,
      labelX: slotStart(d) + slot.value / 2,
    }
  }),
)

const monthShort = computed(() =>
  chartMonth.value ? chartMonth.value.toLocaleString('en-US', { month: 'short' }) : '',
)

interface BarTip {
  day: number
  hlX: number
  left: number
  top: number
  borrowed: number
  returned: number
}
const barTip = ref<BarTip | null>(null)
const chartWrap = ref<HTMLElement | null>(null)
const chartSvg = ref<SVGSVGElement | null>(null)

function onBarMove(clientX: number) {
  const svg = chartSvg.value
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const xVb = ((clientX - rect.left) / rect.width) * CHART.W
  let day = Math.floor((xVb - CHART.padL) / slot.value) + 1
  day = Math.max(1, Math.min(daysInMonth.value, day))

  const topV = Math.max(borrowedByDay.value[day], returnedByDay.value[day])
  const topY = CHART.padT + (1 - topV / axisMax.value) * plotH
  barTip.value = {
    day,
    hlX: slotStart(day),
    left: ((slotStart(day) + slot.value / 2) / CHART.W) * rect.width,
    top: (topY / CHART.H) * rect.height,
    borrowed: borrowedByDay.value[day],
    returned: returnedByDay.value[day],
  }
}
function onBarLeave() {
  barTip.value = null
}

const R = 15.915
const C = 2 * Math.PI * R
const PIE_SW = 5

const pieSlices = computed(() => {
  const rows = [...booksByTag.value].sort((a, b) => b.count - a.count)
  const N = 7
  let display = rows
  if (rows.length > N + 1) {
    const rest = rows.slice(N).reduce((s, r) => s + r.count, 0)
    display = rows.slice(0, N).concat([{ tag: 'Other', count: rest }])
  }
  const total = display.reduce((s, r) => s + r.count, 0) || 1
  let offset = 0
  return display.map((r, i) => {
    const frac = r.count / total
    const arc = {
      tag: r.tag,
      count: r.count,
      color: palette[i % palette.length],
      pct: Math.round(frac * 100),
      dash: `${(frac * C).toFixed(3)} ${(C - frac * C).toFixed(3)}`,
      dashoffset: (C * 0.25 - offset).toFixed(3),
    }
    offset += frac * C
    return arc
  })
})
const pieTotalTags = computed(() => booksByTag.value.length)
const pieHoverIdx = ref(-1)

const medal = ['m1', 'm2', 'm3']

function fullName(p: { firstName?: string; lastName?: string }) {
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || t('common.notSpecified')
}
</script>

<template>
  <div class="wrap">
    <header class="top">
      <div>
        <h1 class="top__title">{{ t('nav.dashboard') }}</h1>
        <p class="top__sub">{{ t('dashboard.subtitle') }}</p>
      </div>
      <div class="period">
        <span class="eyebrow">{{ t('dashboard.period') }}</span>
        <div ref="periodEl" class="period__picker">
          <button
            type="button"
            class="period__trigger"
            :aria-expanded="periodOpen"
            aria-haspopup="dialog"
            @click="togglePeriod"
          >
            {{ periodLabel }}
            <ChevronDown
              :size="14"
              :stroke-width="2.5"
              class="period__chevron"
              aria-hidden="true"
            />
          </button>

          <div v-show="periodOpen" class="period__panel">
            <div class="period__year">
              <button
                type="button"
                class="period__year-btn"
                :aria-label="t('dashboard.prevYear')"
                :disabled="!canPrevYear"
                @click="viewYear -= 1"
              >
                <ChevronLeft :size="15" :stroke-width="2.5" aria-hidden="true" />
              </button>
              <b aria-live="polite">{{ viewYear }}</b>
              <button
                type="button"
                class="period__year-btn"
                :aria-label="t('dashboard.nextYear')"
                :disabled="!canNextYear"
                @click="viewYear += 1"
              >
                <ChevronRight :size="15" :stroke-width="2.5" aria-hidden="true" />
              </button>
            </div>

            <div class="period__months">
              <button
                v-for="cell in monthCells"
                :key="cell.value"
                type="button"
                class="period__month"
                :class="{ 'is-selected': cell.selected }"
                :disabled="cell.disabled"
                @click="onPeriodChange(cell.value)"
              >
                {{ cell.label }}
              </button>
            </div>

            <button
              type="button"
              class="period__alltime"
              :class="{ 'is-selected': period === ALL_TIME }"
              @click="onPeriodChange(ALL_TIME)"
            >
              {{ t('dashboard.allTime') }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <p v-if="error" class="dash-error" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="dash-loading" aria-live="polite">
      {{ t('dashboard.loading') }}
    </p>

    <section class="stats" :aria-label="t('dashboard.keyFigures')">
      <div v-for="s in statCards" :key="s.key" class="stat" :class="`stat--${s.tint}`">
        <div class="text">
          <div class="label"><span class="dot" />{{ s.label }}</div>
          <div class="foot">{{ s.foot }}</div>
        </div>
        <div class="num">{{ s.value }}</div>
      </div>
    </section>

    <div class="grid">
      <section class="panel">
        <div class="chart-head">
          <div>
            <h2>{{ t('dashboard.chart.title') }}</h2>
            <div class="cap" style="margin-bottom: 0">
              {{ t('dashboard.chart.caption') }}
            </div>
          </div>
          <div class="chart-legend">
            <span
              ><span class="sw" style="background: var(--accent)" />{{
                t('dashboard.chart.borrowed')
              }}
              <b>{{ sumBorrowed }}</b></span
            >
            <span
              ><span class="sw" style="background: var(--success)" />{{
                t('dashboard.chart.returned')
              }}
              <b>{{ sumReturned }}</b></span
            >
          </div>
        </div>
        <LEmpty
          v-if="!sumBorrowed && !sumReturned"
          compact
          :icon="BarChart3"
          :title="t('dashboard.chart.empty')"
          :hint="t('dashboard.emptyHint')"
        />
        <div v-else ref="chartWrap" class="chart-wrap">
          <svg
            ref="chartSvg"
            :viewBox="`0 0 ${CHART.W} ${CHART.H}`"
            role="img"
            :aria-label="t('dashboard.chart.ariaLabel')"
            @mousemove="onBarMove($event.clientX)"
            @mouseleave="onBarLeave"
            @touchstart.passive="$event.touches[0] && onBarMove($event.touches[0].clientX)"
            @touchmove.passive="$event.touches[0] && onBarMove($event.touches[0].clientX)"
          >
            <g class="chart-grid">
              <line
                v-for="(tick, i) in yTicks"
                :key="`g${i}`"
                :class="{ base: tick.base }"
                :x1="CHART.padL"
                :y1="tick.y.toFixed(1)"
                :x2="CHART.W - CHART.padR"
                :y2="tick.y.toFixed(1)"
              />
            </g>

            <rect
              v-if="barTip"
              class="chart-hl"
              :x="barTip.hlX.toFixed(2)"
              :y="CHART.padT"
              :width="slot.toFixed(2)"
              :height="plotH"
              rx="3"
            />
            <template v-for="g in barGroups" :key="g.day">
              <rect
                v-if="g.borrowed.show"
                class="chart-bar b"
                :x="g.borrowed.x.toFixed(2)"
                :y="g.borrowed.y.toFixed(2)"
                :width="g.borrowed.w.toFixed(2)"
                :height="g.borrowed.h.toFixed(2)"
                :rx="g.borrowed.rx.toFixed(2)"
              />
              <rect
                v-if="g.returned.show"
                class="chart-bar r"
                :x="g.returned.x.toFixed(2)"
                :y="g.returned.y.toFixed(2)"
                :width="g.returned.w.toFixed(2)"
                :height="g.returned.h.toFixed(2)"
                :rx="g.returned.rx.toFixed(2)"
              />
            </template>
            <g class="chart-axis">
              <text
                v-for="(tick, i) in yTicks"
                :key="`y${i}`"
                :x="CHART.padL - 7"
                :y="(tick.y + 3).toFixed(1)"
                text-anchor="end"
              >
                {{ tick.v }}
              </text>
              <template v-for="g in barGroups" :key="`x${g.day}`">
                <text
                  v-if="g.showLabel"
                  :x="g.labelX.toFixed(1)"
                  :y="CHART.H - 8"
                  text-anchor="middle"
                >
                  {{ g.day }}
                </text>
              </template>
            </g>
          </svg>
          <div
            v-if="barTip"
            class="chart-tip"
            :style="{ left: `${barTip.left}px`, top: `${barTip.top}px` }"
          >
            <div class="td">{{ monthShort }} {{ barTip.day }}</div>
            <div class="tr">
              <i style="background: var(--accent)" />{{ t('dashboard.chart.borrowed') }}
              <b>{{ barTip.borrowed }}</b>
            </div>
            <div class="tr">
              <i style="background: var(--success)" />{{ t('dashboard.chart.returned') }}
              <b>{{ barTip.returned }}</b>
            </div>
          </div>
        </div>
      </section>

      <section class="panel tag-panel">
        <h2>{{ t('dashboard.tags.title') }}</h2>
        <div class="cap">{{ t('dashboard.tags.caption') }}</div>
        <LEmpty
          v-if="!pieSlices.length"
          compact
          :icon="Tags"
          :title="t('dashboard.tags.empty')"
          :hint="t('dashboard.tags.emptyHint')"
        />
        <div v-else class="pie-wrap">
          <svg class="pie-svg" viewBox="0 0 42 42" aria-hidden="true">
            <circle
              class="pie-track"
              cx="21"
              cy="21"
              :r="R"
              fill="none"
              stroke="var(--bg-subtle)"
              :stroke-width="PIE_SW"
            />
            <circle
              v-for="(a, i) in pieSlices"
              :key="a.tag"
              class="pie-arc"
              cx="21"
              cy="21"
              :r="R"
              fill="none"
              :stroke="a.color"
              :stroke-width="pieHoverIdx === i ? 7 : PIE_SW"
              :stroke-dasharray="a.dash"
              :stroke-dashoffset="a.dashoffset"
              stroke-linecap="butt"
              @mouseenter="pieHoverIdx = i"
              @mouseleave="pieHoverIdx = -1"
            />
            <text class="pie-total" x="21" y="20.5" text-anchor="middle">{{ pieTotalTags }}</text>
            <text class="pie-sub" x="21" y="25.2" text-anchor="middle">tags</text>
          </svg>
          <div class="pie-legend">
            <div
              v-for="(a, i) in pieSlices"
              :key="a.tag"
              class="row"
              @mouseenter="pieHoverIdx = i"
              @mouseleave="pieHoverIdx = -1"
            >
              <span class="lsw" :style="{ background: a.color }" />
              <span class="ln">{{ a.tag }}</span>
              <span class="lv"
                >{{ a.pct }}%<span class="lc">{{ a.count }}</span></span
              >
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="rank">
      <section class="panel">
        <h2>{{ t('dashboard.topBooks.title') }}</h2>
        <div class="cap">{{ t('dashboard.topBooks.caption') }}</div>
        <LEmpty
          v-if="!topBooks.length"
          compact
          :icon="Book"
          :title="t('dashboard.topBooks.empty')"
          :hint="t('dashboard.emptyHint')"
        />
        <ol v-else class="booklist">
          <li v-for="(b, i) in topBooks" :key="i">
            <span class="bk-rank" :class="medal[i]">{{ i + 1 }}</span>
            <div class="bk-main">
              <div class="bk-title">{{ esc(b.title) }}</div>
              <div class="bk-meta">{{ esc(b.author) }}</div>
            </div>
            <span class="bk-count">{{ b.count }}</span>
          </li>
        </ol>
      </section>

      <section class="panel">
        <h2>{{ t('dashboard.topOwners.title') }}</h2>
        <div class="cap">{{ t('dashboard.topOwners.caption') }}</div>
        <LEmpty
          v-if="!topOwners.length"
          compact
          :icon="Users"
          :title="t('dashboard.topOwners.empty')"
          :hint="t('dashboard.emptyHint')"
        />
        <ol v-else class="booklist">
          <li v-for="(p, i) in topOwners" :key="i">
            <span class="bk-rank" :class="medal[i]">{{ i + 1 }}</span>
            <div class="bk-main">
              <span class="bk-title">{{ fullName(p) }}</span>
            </div>
            <span class="bk-count">{{ p.count }}</span>
          </li>
        </ol>
      </section>

      <section class="panel">
        <h2>{{ t('dashboard.topBorrowers.title') }}</h2>
        <div class="cap">{{ t('dashboard.topBorrowers.caption') }}</div>

        <LEmpty
          v-if="!topBorrowers.length"
          compact
          :icon="Users"
          :title="t('dashboard.topBorrowers.empty')"
          :hint="t('dashboard.emptyHint')"
        />
        <ol v-else class="booklist">
          <li v-for="(p, i) in topBorrowers" :key="i">
            <span class="bk-rank" :class="medal[i]">{{ i + 1 }}</span>
            <div class="bk-main">
              <span class="bk-title">{{ fullName(p) }}</span>
            </div>
            <span class="bk-count">{{ p.count }}</span>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: var(--space-5) var(--page-pad-x) var(--space-7);
}

.dash-error,
.dash-loading {
  margin: 0 0 var(--space-4);
  padding: var(--space-3);
  font-size: var(--text-sm);
  border-radius: var(--radius);
}
.dash-error {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger) 22%, transparent);
}
.dash-loading {
  color: var(--ink-soft);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);

  padding-bottom: var(--space-4);
}

.top__title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-2xl);
  letter-spacing: var(--tracking-tight);
}
.top__sub {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
}
.period {
  text-align: right;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.11em;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--ink-faint);
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 14px;
}
.stat {
  --tint: var(--accent);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}
.stat--accent {
  --tint: var(--accent);
}
.stat--good {
  --tint: var(--success);
}
.stat--warn {
  --tint: var(--warning);
}
.stat--crit {
  --tint: var(--danger);
}

.stat .text {
  min-width: 0;
}
.stat .label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.74rem;
  color: var(--ink-soft);
}
.stat .num {
  margin-left: auto;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.stat .foot {
  font-size: 0.72rem;
  color: var(--ink-faint);
  margin-top: 1px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tint);
  flex: none;
}

.grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 14px;
  margin-top: 14px;
  align-items: stretch;
}
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 15px 16px;
}
.panel h2 {
  margin: 0 0 2px;
  font-size: 1rem;
  letter-spacing: -0.01em;
}
.panel .cap {
  color: var(--ink-faint);
  font-size: 0.76rem;
  margin-bottom: 12px;
}

.period__picker {
  position: relative;
}

.period__trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: 2px;
  padding: 0;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
  background: none;
  border: 0;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}
.period__trigger:hover {
  color: var(--accent);
}
.period__chevron {
  color: var(--ink-faint);
  transition: transform var(--dur) var(--ease);
}
.period__trigger[aria-expanded='true'] .period__chevron {
  transform: rotate(180deg);
}

.period__panel {
  position: absolute;
  z-index: var(--z-dropdown);
  top: calc(100% + var(--space-2));
  right: 0;
  width: 16rem;
  padding: var(--space-2);
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.period__year {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-1) 0 var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.period__year b {
  min-width: 3rem;
  text-align: center;
}
.period__year-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.period__year-btn:hover:not(:disabled) {
  background: var(--bg-subtle);
  color: var(--ink);
}
.period__year-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.period__months {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}
.period__month {
  padding: var(--space-2) 0;
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.period__month:hover:not(:disabled):not(.is-selected) {
  background: var(--bg-subtle);
  color: var(--ink);
}
.period__month:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.period__month.is-selected {
  color: var(--fg-inverse);
  background: var(--primary);
  font-weight: 600;
}

.period__alltime {
  width: 100%;
  margin-top: var(--space-2);
  padding: var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink-soft);
  background: none;
  border: 0;
  border-top: 1px solid var(--border);
  border-radius: 0 0 var(--radius) var(--radius);
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.period__alltime:hover {
  background: var(--bg-subtle);
  color: var(--ink);
}
.period__alltime.is-selected {
  color: var(--fg-inverse);
  background: var(--primary);
  font-weight: 600;
  border-top-color: transparent;
}

.chart-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.chart-legend {
  display: flex;
  gap: 16px;
  font-size: 0.78rem;
  color: var(--ink-soft);
}
.chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.chart-legend b {
  color: var(--ink);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.sw {
  width: 11px;
  height: 11px;
  border-radius: 3px;
}
.chart-wrap {
  position: relative;
  width: 100%;
}
.chart-wrap svg {
  width: 100%;
  height: auto;
  display: block;
  touch-action: none;
}
.chart-grid line {
  stroke: var(--border);
  stroke-width: 1;
}
.chart-grid line.base {
  stroke: var(--border-strong);
}
.chart-axis text {
  fill: var(--ink-faint);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}
.chart-bar.b {
  fill: var(--accent);
}
.chart-bar.r {
  fill: var(--success);
}
.chart-hl {
  fill: var(--bg-subtle);
}
.chart-tip {
  position: absolute;
  z-index: 5;
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 10px));
  background: var(--ink);
  color: var(--surface);
  padding: 8px 10px;
  border-radius: 9px;
  font-size: 0.72rem;
  line-height: 1.45;
  white-space: nowrap;
  box-shadow: var(--shadow);
}
.chart-tip .td {
  font-weight: 700;
  margin-bottom: 3px;
}
.chart-tip .tr {
  display: flex;
  align-items: center;
  gap: 7px;
}
.chart-tip .tr i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex: none;
}
.chart-tip .tr b {
  margin-left: auto;
  padding-left: 10px;
  font-variant-numeric: tabular-nums;
}

.tag-panel {
  display: flex;
  flex-direction: column;
}
.pie-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.pie-svg {
  width: 124px;
  height: 124px;
  flex: none;
}
.pie-arc {
  transition: stroke-width 0.12s ease;
  cursor: pointer;
}
.pie-total {
  fill: var(--ink);
  font-size: 8px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.pie-sub {
  fill: var(--ink-faint);
  font-size: 3.1px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
}
.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}
.pie-legend .row {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: center;
  gap: 9px;
  cursor: default;
}
.pie-legend .lsw {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.pie-legend .ln {
  font-size: 0.8rem;
  color: var(--ink-soft);
  text-transform: capitalize;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pie-legend .lv {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
}
.pie-legend .lc {
  font-size: 0.74rem;
  font-weight: 400;
  color: var(--ink-faint);
}
.pie-legend .lc::before {
  content: '(';
}
.pie-legend .lc::after {
  content: ' books)';
}

.booklist {
  list-style: none;
  margin: var(--space-3) 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.booklist li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  column-gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius);
  transition: background var(--dur) var(--ease);
}
.booklist li:hover {
  background: var(--bg-subtle);
}
.bk-rank {
  width: 1.375rem;
  height: 1.375rem;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: var(--bg-subtle);
  color: var(--ink-faint);
}

.bk-rank.m1 {
  background: var(--accent);
  color: var(--fg-inverse);
}
.bk-rank.m2 {
  background: var(--accent-tint);
  color: var(--accent);
}
.bk-rank.m3 {
  background: var(--border);
  color: var(--ink-soft);
}
.bk-main {
  min-width: 0;
}
.bk-title {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bk-meta {
  color: var(--ink-faint);
  font-size: var(--text-xs);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bk-count {
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.rank {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-top: 14px;
}
thead th.n,
tbody td.n {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 1040px) {
  .rank {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 860px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 480px) {
  .stats {
    grid-template-columns: 1fr;
  }
}
</style>
