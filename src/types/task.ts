export type Priority = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  title: string
  subject: string
  priority: Priority
  /** YYYY-MM-DD */
  dueDate: string
  /** HH:mm，空字符串表示未指定（按当天 23:59 处理） */
  dueTime: string
  estimateMinutes: number
  notes: string
  isAnchor: boolean
  completed: boolean
  createdAt: string
  completedAt: string | null
}

export type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'completed' | 'isAnchor'>

export type StatusFilter = 'all' | 'active' | 'done' | 'overdue'
