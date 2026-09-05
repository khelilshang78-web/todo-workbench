import { useEffect, useState } from 'react'
import type { Task, TaskDraft } from '@/types/task'
import { STORAGE_KEY, mergeTasks, newId, parseImport } from '@/lib/todo'
import type { ImportResult } from '@/lib/todo'

function load(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = parseImport(raw.startsWith('{') ? raw : `{"version":1,"tasks":${raw}}`)
    return parsed.ok ? parsed.tasks : []
  } catch {
    return []
  }
}

export function useTodos() {
  const [tasks, setTasks] = useState<Task[]>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tasks }))
    } catch {
      // 存储失败（如隐私模式）时静默忽略，界面仍可用
    }
  }, [tasks])

  function addTask(draft: TaskDraft): Task {
    const task: Task = {
      ...draft,
      id: newId(),
      isAnchor: false,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    }
    setTasks((prev) => [task, ...prev])
    return task
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  function toggleComplete(id: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const completed = !t.completed
        return { ...t, completed, completedAt: completed ? new Date().toISOString() : null }
      }),
    )
  }

  /** 返回被替换掉的旧锚点标题（没有则为 null） */
  function setAnchor(id: string): string | null {
    let replaced: string | null = null
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) return { ...t, isAnchor: true }
        if (t.isAnchor) {
          replaced = t.title
          return { ...t, isAnchor: false }
        }
        return t
      }),
    )
    return replaced
  }

  function clearAnchor(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, isAnchor: false } : t)))
  }

  function importTasks(incoming: Task[], mode: 'merge' | 'overwrite'): ImportResult {
    if (mode === 'overwrite') {
      // 覆盖全部时保证锚点唯一
      const anchors = incoming.filter((t) => t.isAnchor && !t.completed)
      const fixed =
        anchors.length > 1
          ? incoming.map((t) => (t.isAnchor && t.id !== anchors[0].id ? { ...t, isAnchor: false } : t))
          : incoming
      setTasks(fixed)
      return { added: fixed.length, updated: 0 }
    }
    let result: ImportResult = { added: 0, updated: 0 }
    setTasks((prev) => {
      const merged = mergeTasks(prev, incoming)
      result = merged.result
      return merged.tasks
    })
    return result
  }

  return { tasks, addTask, updateTask, deleteTask, toggleComplete, setAnchor, clearAnchor, importTasks }
}
