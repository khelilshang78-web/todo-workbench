import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Priority, Task, TaskDraft } from '@/types/task'
import { PRESET_SUBJECTS, todayStr } from '@/lib/todo'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 传入则为编辑模式 */
  editing: Task | null
  onSubmit: (draft: TaskDraft, id?: string) => void
}

export default function TaskForm({ open, onOpenChange, editing, onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState(todayStr())
  const [dueTime, setDueTime] = useState('')
  const [estimate, setEstimate] = useState('30')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title)
      setSubject(editing.subject)
      setPriority(editing.priority)
      setDueDate(editing.dueDate)
      setDueTime(editing.dueTime)
      setEstimate(String(editing.estimateMinutes))
      setNotes(editing.notes)
    } else {
      setTitle('')
      setSubject('')
      setPriority('medium')
      setDueDate(todayStr())
      setDueTime('')
      setEstimate('30')
      setNotes('')
    }
  }, [open, editing])

  const valid = title.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)

  function handleSubmit() {
    if (!valid) return
    const draft: TaskDraft = {
      title: title.trim(),
      subject: subject.trim() || '其他',
      priority,
      dueDate,
      dueTime: dueTime || '',
      estimateMinutes: Math.max(5, Math.round(Number(estimate) || 30)),
      notes: notes.trim(),
    }
    onSubmit(draft, editing?.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-title">{editing ? '编辑任务' : '添加任务'}</DialogTitle>
          <DialogDescription>标题和截止日期必填，其余可留空。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="tf-title">标题 *</Label>
            <Input
              id="tf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：完成 P1 力学练习册 3.2 节"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="tf-subject">科目</Label>
              <Input
                id="tf-subject"
                list="subject-presets"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="选择或输入自定义科目"
              />
              <datalist id="subject-presets">
                {PRESET_SUBJECTS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tf-estimate">预计用时（分钟）</Label>
              <Input
                id="tf-estimate"
                type="number"
                min={5}
                step={5}
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="tf-due-date">截止日期 *</Label>
              <Input
                id="tf-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tf-due-time">时间（可选）</Label>
              <Input
                id="tf-due-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>优先级</Label>
            <RadioGroup
              value={priority}
              onValueChange={(v) => setPriority(v as Priority)}
              className="flex gap-2"
            >
              {(
                [
                  ['high', '高'],
                  ['medium', '中'],
                  ['low', '低'],
                ] as const
              ).map(([v, label]) => (
                <Label
                  key={v}
                  className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-input has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
                >
                  <RadioGroupItem value={v} id={`tf-prio-${v}`} />
                  <span>{label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tf-notes">备注</Label>
            <Textarea
              id="tf-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="页码、资料位置、卡点……"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button className="min-h-11" onClick={handleSubmit} disabled={!valid}>
            {editing ? '保存修改' : '添加任务'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
