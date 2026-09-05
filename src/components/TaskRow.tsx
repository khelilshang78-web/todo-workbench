import { Anchor, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { Task } from '@/types/task'
import { PRIORITY_LABEL, formatDue, isOverdue, overdueDays } from '@/lib/todo'
import { cn } from '@/lib/utils'

interface Props {
  task: Task
  now: Date
  /** 删除确认后播放离场动画 */
  leaving?: boolean
  onToggle: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onAnchor: (task: Task) => void
}

const PRIORITY_STYLE: Record<Task['priority'], string> = {
  high: 'text-destructive',
  medium: 'text-foreground',
  low: 'text-muted-foreground',
}

export default function TaskRow({ task, now, leaving, onToggle, onEdit, onDelete, onAnchor }: Props) {
  const overdue = isOverdue(task, now)
  return (
    <li
      data-flip-id={task.id}
      className={cn(
        'task-row flex items-start gap-3 py-4',
        task.completed && 'task-done',
        leaving && 'task-leaving',
        task.isAnchor && !task.completed && '-mx-3 rounded-md bg-[hsl(var(--brass-soft))] px-3',
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id)}
        aria-label={task.completed ? '标记为未完成' : '标记为已完成'}
        className="mt-1 size-6"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="task-title font-medium leading-snug">{task.title}</span>
          {task.isAnchor && !task.completed && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-[hsl(var(--brass))] px-1.5 py-0.5 text-xs font-medium text-white dark:text-[hsl(222_30%_10%)]">
              <Anchor className="size-3" />
              锚点
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>{task.subject}</span>
          <span className={PRIORITY_STYLE[task.priority]}>{PRIORITY_LABEL[task.priority]}优先级</span>
          <span className={cn(overdue && 'font-medium text-destructive')}>
            截止 {formatDue(task)}
            {overdue &&
              (overdueDays(task, now) > 0 ? `（逾期 ${overdueDays(task, now)} 天）` : '（已逾期）')}
          </span>
          <span className="numerals">约 {task.estimateMinutes} 分钟</span>
        </div>
        {task.notes && (
          <p className="mt-1 whitespace-pre-wrap text-sm italic text-muted-foreground">{task.notes}</p>
        )}
      </div>
      <div className="task-actions flex shrink-0 items-center">
        <Button
          variant="ghost"
          size="icon"
          className={cn('min-h-11 min-w-11', task.isAnchor && 'text-[hsl(var(--brass))]')}
          onClick={() => onAnchor(task)}
          title={task.isAnchor ? '取消锚点' : '设为今日锚点'}
          aria-label={task.isAnchor ? '取消锚点' : '设为今日锚点'}
        >
          <Anchor className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          onClick={() => onEdit(task)}
          aria-label="编辑任务"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(task.id)}
          aria-label="删除任务"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  )
}
