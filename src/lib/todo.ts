import type { Priority, Task } from '@/types/task'

export const STORAGE_KEY = 'todo-workbench.tasks.v1'

export const PRESET_SUBJECTS = ['数学', '物理', '经济', '计算机', '英语', 'PPE阅读', '其他']

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 本地时区的 YYYY-MM-DD */
export function dateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function todayStr(): string {
  return dateStr(new Date())
}

/** 任务的截止时刻；未指定时间按当天 23:59 处理 */
export function dueDateTime(t: Task): Date {
  const [y, m, d] = t.dueDate.split('-').map(Number)
  if (t.dueTime) {
    const [hh, mm] = t.dueTime.split(':').map(Number)
    return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0)
  }
  return new Date(y, m - 1, d, 23, 59, 59, 999)
}

export function isOverdue(t: Task, now: Date = new Date()): boolean {
  return !t.completed && dueDateTime(t).getTime() < now.getTime()
}

export function overdueDays(t: Task, now: Date = new Date()): number {
  const due = dueDateTime(t)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.max(0, Math.round((nowDay - dueDay) / 86400000))
}

export function formatDue(t: Task): string {
  return t.dueTime ? `${t.dueDate} ${t.dueTime}` : t.dueDate
}

export interface Recommendation {
  task: Task
  reasons: string[]
}

/** 「现在该做什么」推荐：逾期优先 → 优先级 → 截止近 → 用时短；未完成锚点永远第一 */
export function pickRecommendation(tasks: Task[], now: Date = new Date()): Recommendation | null {
  const active = tasks.filter((t) => !t.completed)
  if (active.length === 0) return null

  const anchor = active.find((t) => t.isAnchor)
  if (anchor) {
    return { task: anchor, reasons: ['今日锚点', ...baseReasons(anchor, now)] }
  }

  const sorted = [...active].sort((a, b) => {
    const oa = isOverdue(a, now) ? 0 : 1
    const ob = isOverdue(b, now) ? 0 : 1
    if (oa !== ob) return oa - ob
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    }
    const da = dueDateTime(a).getTime()
    const db = dueDateTime(b).getTime()
    if (da !== db) return da - db
    return a.estimateMinutes - b.estimateMinutes
  })
  const top = sorted[0]
  return { task: top, reasons: baseReasons(top, now) }
}

function baseReasons(t: Task, now: Date): string[] {
  const reasons: string[] = []
  if (isOverdue(t, now)) {
    const days = overdueDays(t, now)
    reasons.push(days > 0 ? `已逾期 ${days} 天` : '今日已逾期')
  } else {
    const today = todayStr()
    if (t.dueDate === today) reasons.push('今天截止')
    else {
      const tomorrow = dateStr(new Date(now.getTime() + 86400000))
      if (t.dueDate === tomorrow) reasons.push('明天截止')
    }
  }
  reasons.push(`${PRIORITY_LABEL[t.priority]}优先级`)
  reasons.push(`预计 ${t.estimateMinutes} 分钟`)
  return reasons
}

export interface Stats {
  todayDone: number
  weekDone: number
  totalTasks: number
  totalDone: number
  rate: number // 0-100
  streak: number
}

export function computeStats(tasks: Task[], now: Date = new Date()): Stats {
  const done = tasks.filter((t) => t.completed && t.completedAt)
  const today = todayStr()
  const todayDone = done.filter((t) => t.completedAt && dateStr(new Date(t.completedAt)) === today).length

  // 本周（周一开始）
  const day = now.getDay() === 0 ? 7 : now.getDay()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day - 1))
  const mondayStr = dateStr(monday)
  const weekDone = done.filter(
    (t) => t.completedAt && dateStr(new Date(t.completedAt)) >= mondayStr && dateStr(new Date(t.completedAt)) <= today,
  ).length

  const totalDone = done.length
  const totalTasks = tasks.length
  const rate = totalTasks === 0 ? 0 : Math.round((totalDone / totalTasks) * 100)

  // 连续打卡：从今天（或昨天）往前数，每天至少完成 1 个任务
  const doneDays = new Set(done.map((t) => dateStr(new Date(t.completedAt!))))
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!doneDays.has(dateStr(cursor))) {
    cursor = new Date(cursor.getTime() - 86400000)
  }
  let streak = 0
  while (doneDays.has(dateStr(cursor))) {
    streak += 1
    cursor = new Date(cursor.getTime() - 86400000)
  }

  return { todayDone, weekDone, totalTasks, totalDone, rate, streak }
}

export interface BackupFile {
  version: number
  exportedAt: string
  tasks: Task[]
}

export function buildExport(tasks: Task[]): string {
  const data: BackupFile = { version: 1, exportedAt: new Date().toISOString(), tasks }
  return JSON.stringify(data, null, 2)
}

export function exportFileName(now: Date = new Date()): string {
  return `todo-backup-${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}.json`
}

const VALID_PRIORITIES: Priority[] = ['high', 'medium', 'low']

function normalizeTask(raw: unknown): Task | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id) return null
  if (typeof r.title !== 'string' || !r.title.trim()) return null
  const priority = VALID_PRIORITIES.includes(r.priority as Priority) ? (r.priority as Priority) : 'medium'
  const dueDate = typeof r.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.dueDate) ? r.dueDate : todayStr()
  const dueTime = typeof r.dueTime === 'string' && /^\d{2}:\d{2}$/.test(r.dueTime) ? r.dueTime : ''
  return {
    id: r.id,
    title: r.title.trim(),
    subject: typeof r.subject === 'string' && r.subject.trim() ? r.subject.trim() : '其他',
    priority,
    dueDate,
    dueTime,
    estimateMinutes:
      typeof r.estimateMinutes === 'number' && r.estimateMinutes > 0 ? Math.round(r.estimateMinutes) : 30,
    notes: typeof r.notes === 'string' ? r.notes : '',
    isAnchor: r.isAnchor === true,
    completed: r.completed === true,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    completedAt: typeof r.completedAt === 'string' ? r.completedAt : null,
  }
}

export type ParseResult = { ok: true; tasks: Task[] } | { ok: false; error: string }

/** 校验导入文本：需为本应用导出的 JSON（含 version + tasks 数组） */
export function parseImport(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: '不是合法的 JSON 文本，请确认粘贴/选择的是完整的备份内容。' }
  }
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: '备份内容格式不正确：顶层应为对象。' }
  }
  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.tasks)) {
    return { ok: false, error: '备份内容缺少 tasks 数组，可能不是本应用导出的文件。' }
  }
  const tasks: Task[] = []
  let skipped = 0
  for (const raw of obj.tasks) {
    const t = normalizeTask(raw)
    if (t) tasks.push(t)
    else skipped += 1
  }
  if (tasks.length === 0) {
    return { ok: false, error: skipped > 0 ? '备份中的任务全部缺少必要字段（id/标题），无法导入。' : '备份里没有任何任务。' }
  }
  return { ok: true, tasks }
}

export interface ImportResult {
  added: number
  updated: number
}

/** 合并：按 id 去重，新数据覆盖同 id */
export function mergeTasks(existing: Task[], incoming: Task[]): { tasks: Task[]; result: ImportResult } {
  const map = new Map(existing.map((t) => [t.id, t]))
  let added = 0
  let updated = 0
  for (const t of incoming) {
    if (map.has(t.id)) {
      updated += 1
      map.set(t.id, t)
    } else {
      added += 1
      map.set(t.id, t)
    }
  }
  // 锚点唯一：合并后只保留一个锚点（新来的优先）
  const anchors = [...map.values()].filter((t) => t.isAnchor && !t.completed)
  if (anchors.length > 1) {
    const keep = incoming.find((t) => t.isAnchor && !t.completed) ?? anchors[0]
    for (const a of anchors) {
      if (a.id !== keep.id) map.set(a.id, { ...a, isAnchor: false })
    }
  }
  return { tasks: [...map.values()], result: { added, updated } }
}
