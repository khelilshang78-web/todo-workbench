import { Flame } from 'lucide-react'
import type { Stats } from '@/lib/todo'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

const NUMERALS = ['I', 'II', 'III', 'IV'] as const

function StatCell({ numeral, label, value }: { numeral: string; label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="numerals text-[0.65rem] tracking-wider text-muted-foreground/70">{numeral}.</span>
      <span className="numerals font-title text-xl font-semibold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export default function StatsBar({ stats }: { stats: Stats }) {
  const today = useCountUp(stats.todayDone)
  const week = useCountUp(stats.weekDone)
  const rate = useCountUp(stats.rate)
  const streak = useCountUp(stats.streak)

  return (
    <section
      aria-label="完成统计"
      className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border py-4 sm:gap-x-7"
    >
      <StatCell numeral={NUMERALS[0]} label="今日完成" value={String(today)} />
      <StatCell numeral={NUMERALS[1]} label="本周完成" value={String(week)} />
      <StatCell numeral={NUMERALS[2]} label="总完成率" value={`${rate}%`} />
      <div className="flex items-baseline gap-2">
        <span className="numerals text-[0.65rem] tracking-wider text-muted-foreground/70">IV.</span>
        <span
          className={cn(
            'numerals flex items-center gap-1 font-title text-xl font-semibold',
            stats.streak > 0 ? 'text-[hsl(var(--brass))]' : 'text-muted-foreground',
          )}
        >
          <Flame className={cn('size-4', stats.streak > 0 && 'flame-lit')} />
          {streak}
        </span>
        <span className="text-xs text-muted-foreground">连续打卡</span>
      </div>
    </section>
  )
}
