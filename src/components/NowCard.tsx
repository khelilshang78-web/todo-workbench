import { Anchor, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Recommendation } from '@/lib/todo'
import { formatDue } from '@/lib/todo'

interface Props {
  recommendation: Recommendation | null
  hasTasks: boolean
  onComplete: (id: string) => void
}

export default function NowCard({ recommendation, hasTasks, onComplete }: Props) {
  return (
    <section className="enter-scholarly" aria-label="现在该做什么">
      {/* 期刊栏题：hairline 双细线夹住栏名 */}
      <div className="border-t border-foreground/60 pt-1">
        <div className="border-t border-foreground/25 pt-2">
          <p className="section-label">今日课题 · The Day&rsquo;s Task</p>
        </div>
      </div>
      <div className="mt-4 pb-5">
        {recommendation ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
              <div className="min-w-0 flex-1 basis-64">
                <h2 className="dropcap font-title text-2xl font-semibold leading-snug sm:text-[1.75rem]">
                  {recommendation.task.title}
                </h2>
                <p className="mt-3 text-sm italic text-muted-foreground">
                  {recommendation.reasons.join(' · ')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {recommendation.task.subject} · 截止 {formatDue(recommendation.task)}
                </p>
              </div>
              <Button
                size="lg"
                className="min-h-11 shrink-0"
                onClick={() => onComplete(recommendation.task.id)}
              >
                <CheckCheck className="mr-1.5 size-4" />
                完成它
              </Button>
            </div>
            {recommendation.task.isAnchor && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--brass))]">
                <Anchor className="size-4" />
                今日锚点 —— 天塌下来也完成它
              </p>
            )}
          </div>
        ) : (
          <p className="italic text-muted-foreground">
            {hasTasks
              ? '任务全部完成了，今天可以安心收尾。'
              : '还没有任务。从下面添加第一件事，再把最重要的那件设为今日锚点。'}
          </p>
        )}
      </div>
      <div className="border-b border-foreground/25 pb-1">
        <div className="border-b border-foreground/60" />
      </div>
    </section>
  )
}
