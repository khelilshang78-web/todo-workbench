import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MoonStar, Plus, Search, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Toaster } from '@/components/ui/sonner'
import NowCard from '@/components/NowCard'
import StatsBar from '@/components/StatsBar'
import TaskForm from '@/components/TaskForm'
import TaskRow from '@/components/TaskRow'
import DataPanel from '@/components/DataPanel'
import { useTodos } from '@/hooks/useTodos'
import type { StatusFilter, Task, TaskDraft } from '@/types/task'
import {
  PRESET_SUBJECTS,
  computeStats,
  dueDateTime,
  isOverdue,
  pickRecommendation,
} from '@/lib/todo'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const LEAVE_MS = 240

/** FLIP：列表重排时让行平滑滑向新位置 */
function useFlipList(idsKey: string) {
  const listRef = useRef<HTMLUListElement>(null)
  const positions = useRef(new Map<string, number>())
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const next = new Map<string, number>()
    list.querySelectorAll<HTMLElement>('[data-flip-id]').forEach((el) => {
      const id = el.dataset.flipId!
      const top = el.getBoundingClientRect().top
      const prev = positions.current.get(id)
      if (prev !== undefined && Math.abs(prev - top) > 1) {
        el.animate(
          [{ transform: `translateY(${prev - top}px)` }, { transform: 'translateY(0)' }],
          { duration: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        )
      }
      next.set(id, top)
    })
    positions.current = next
  }, [idsKey])
  return listRef
}

export default function Home() {
  const { tasks, addTask, updateTask, deleteTask, toggleComplete, setAnchor, clearAnchor, importTasks } =
    useTodos()
  const now = new Date()

  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [leavingId, setLeavingId] = useState<string | null>(null)
  const [anchorCandidate, setAnchorCandidate] = useState<Task | null>(null)

  const [subjectFilter, setSubjectFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [keyword, setKeyword] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // 键盘快捷键：n 新建任务，/ 聚焦搜索（输入框聚焦时不触发）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return
      const el = document.activeElement as HTMLElement | null
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      )
        return
      if (e.key === 'n') {
        e.preventDefault()
        setEditing(null)
        setFormOpen(true)
      } else if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const stats = useMemo(() => computeStats(tasks, now), [tasks]) // eslint-disable-line react-hooks/exhaustive-deps
  const recommendation = useMemo(() => pickRecommendation(tasks, now), [tasks]) // eslint-disable-line react-hooks/exhaustive-deps

  const subjects = useMemo(() => {
    const set = new Set<string>(PRESET_SUBJECTS)
    for (const t of tasks) set.add(t.subject)
    return [...set]
  }, [tasks])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const list = tasks.filter((t) => {
      if (subjectFilter !== 'all' && t.subject !== subjectFilter) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (statusFilter === 'active' && t.completed) return false
      if (statusFilter === 'done' && !t.completed) return false
      if (statusFilter === 'overdue' && !isOverdue(t, now)) return false
      if (kw && !t.title.toLowerCase().includes(kw) && !t.notes.toLowerCase().includes(kw)) return false
      return true
    })
    const rank = (t: Task) => {
      if (t.completed) return 1
      if (t.isAnchor) return -1
      return 0
    }
    const prio = { high: 0, medium: 1, low: 2 } as const
    return [...list].sort((a, b) => {
      const r = rank(a) - rank(b)
      if (r !== 0) return r
      if (a.completed && b.completed) {
        return new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime()
      }
      const oa = isOverdue(a, now) ? 0 : 1
      const ob = isOverdue(b, now) ? 0 : 1
      if (oa !== ob) return oa - ob
      if (prio[a.priority] !== prio[b.priority]) return prio[a.priority] - prio[b.priority]
      const d = dueDateTime(a).getTime() - dueDateTime(b).getTime()
      if (d !== 0) return d
      return a.estimateMinutes - b.estimateMinutes
    })
  }, [tasks, subjectFilter, priorityFilter, statusFilter, keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  const flipKey = filtered.map((t) => t.id).join('|')
  const listRef = useFlipList(flipKey)

  function handleSubmit(draft: TaskDraft, id?: string) {
    if (id) {
      updateTask(id, draft)
      toast.success('已保存修改')
    } else {
      addTask(draft)
      toast.success('任务已添加')
    }
  }

  function handleAnchorClick(task: Task) {
    if (task.isAnchor) {
      clearAnchor(task.id)
      toast.info('已取消锚点')
      return
    }
    const current = tasks.find((t) => t.isAnchor && t.id !== task.id)
    if (current) {
      setAnchorCandidate(task)
    } else {
      setAnchor(task.id)
      toast.success(`已把「${task.title}」设为今日锚点`)
    }
  }

  function confirmAnchorReplace() {
    if (!anchorCandidate) return
    const replaced = tasks.find((t) => t.isAnchor && t.id !== anchorCandidate.id)?.title ?? null
    setAnchor(anchorCandidate.id)
    toast.success(replaced ? `锚点已替换：「${replaced}」→「${anchorCandidate.title}」` : '已设为今日锚点')
    setAnchorCandidate(null)
  }

  function confirmDelete() {
    if (!deleting) return
    const id = deleting.id
    setDeleting(null)
    setLeavingId(id) // 先播放离场动画，再真正删除
    window.setTimeout(() => {
      deleteTask(id)
      setLeavingId(null)
      toast.success('任务已删除')
    }, LEAVE_MS)
  }

  const dateLabel = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${WEEKDAYS[now.getDay()]}`

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6 sm:pt-9">
      {/* 刊头：双细线 + 题字 */}
      <header>
        <div className="masthead-rule" aria-hidden />
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-title text-3xl font-bold tracking-[0.08em] sm:text-4xl">待办工作台</h1>
            <p className="mt-1.5 text-sm italic text-muted-foreground">{dateLabel}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? '切换为日间纸面' : '切换为深夜书房'}
            title={theme === 'dark' ? '日间纸面' : '深夜书房'}
          >
            {mounted && theme === 'dark' ? <MoonStar className="size-4" /> : <Sun className="size-4" />}
          </Button>
        </div>
      </header>

      <div className="mt-6">
        <NowCard
          recommendation={recommendation}
          hasTasks={tasks.length > 0}
          onComplete={(id) => {
            toggleComplete(id)
            toast.success('完成了，很好。')
          }}
        />
      </div>

      <StatsBar stats={stats} />

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="section-label">总目 · Tasks</p>
        </div>
        <Button
          className="min-h-11"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="mr-1.5 size-4" />
          添加任务
        </Button>
      </div>

      {tasks.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="relative col-span-2 sm:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索标题/备注"
              className="min-h-11 pl-9"
              aria-label="搜索标题或备注"
            />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="min-h-11" aria-label="按科目筛选">
              <SelectValue placeholder="科目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部科目</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="min-h-11" aria-label="按优先级筛选">
              <SelectValue placeholder="优先级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部优先级</SelectItem>
              <SelectItem value="high">高</SelectItem>
              <SelectItem value="medium">中</SelectItem>
              <SelectItem value="low">低</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="min-h-11" aria-label="按状态筛选">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">未完成</SelectItem>
              <SelectItem value="done">已完成</SelectItem>
              <SelectItem value="overdue">逾期</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="mt-10 border border-dashed border-border px-4 py-12 text-center">
          <p className="section-label">开卷 · Begin</p>
          <p className="mt-4 font-title text-xl font-semibold">工作台还是空的</p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            晚饭后第一件事：打开工作台，定下今天的锚点。 18:00–20:40
            的自习时间，从最重要的那件事开始。
          </p>
          <Button
            className="mt-6 min-h-11"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-1.5 size-4" />
            添加第一个任务
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-10 py-8 text-center text-sm italic text-muted-foreground">
          没有符合筛选条件的任务，试试调整筛选或关键词。
        </p>
      ) : (
        <ul ref={listRef} className="mt-1 divide-y divide-border">
          {filtered.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              now={now}
              leaving={leavingId === t.id}
              onToggle={toggleComplete}
              onEdit={(task) => {
                setEditing(task)
                setFormOpen(true)
              }}
              onDelete={(id) => setDeleting(tasks.find((x) => x.id === id) ?? null)}
              onAnchor={handleAnchorClick}
            />
          ))}
        </ul>
      )}

      <div className="mt-8">
        <DataPanel tasks={tasks} onImport={importTasks} />
      </div>

      <footer className="mt-10 border-t border-border pt-4 text-center text-xs text-muted-foreground">
        <span className="kbd">n</span> 新建任务
        <span className="mx-2 text-border">·</span>
        <span className="kbd">/</span> 聚焦搜索
      </footer>

      <TaskForm open={formOpen} onOpenChange={setFormOpen} editing={editing} onSubmit={handleSubmit} />

      <AlertDialog open={!!anchorCandidate} onOpenChange={(o) => !o && setAnchorCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-title">替换今日锚点？</AlertDialogTitle>
            <AlertDialogDescription>
              每天只锁定 1 个锚点任务（天塌下来也要完成的那件）。设为锚点后，「
              {tasks.find((t) => t.isAnchor)?.title}」将不再是锚点。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">取消</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={confirmAnchorReplace}>
              替换锚点
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-title">删除任务？</AlertDialogTitle>
            <AlertDialogDescription>「{deleting?.title}」将被删除，此操作无法撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">取消</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster position="top-center" />
    </div>
  )
}
