import { useRef, useState } from 'react'
import { ClipboardCopy, Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Task } from '@/types/task'
import { buildExport, exportFileName, parseImport } from '@/lib/todo'
import type { ImportResult } from '@/lib/todo'

interface Props {
  tasks: Task[]
  onImport: (tasks: Task[], mode: 'merge' | 'overwrite') => ImportResult
}

export default function DataPanel({ tasks, onImport }: Props) {
  const [importOpen, setImportOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [mode, setMode] = useState<'merge' | 'overwrite'>('merge')
  const [pending, setPending] = useState<Task[] | null>(null)
  const [resultMsg, setResultMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleDownload() {
    const blob = new Blob([buildExport(tasks)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFileName()
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`已下载 ${a.download}`)
  }

  async function handleCopy() {
    const text = buildExport(tasks)
    try {
      await navigator.clipboard.writeText(text)
      toast.success('备份已复制到剪贴板，可粘贴到微信/备忘录')
    } catch {
      // 剪贴板不可用时降级：显示文本让用户手动复制
      setPasteText(text)
      setImportOpen(true)
      toast.warning('无法直接写入剪贴板，已把备份内容放入文本框，请全选复制')
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseImport(String(reader.result ?? ''))
      if (parsed.ok) {
        setPending(parsed.tasks)
        setResultMsg(`校验通过：文件含 ${parsed.tasks.length} 条任务，请选择导入方式。`)
      } else {
        setPending(null)
        setResultMsg(parsed.error)
      }
    }
    reader.readAsText(file)
  }

  function handleValidatePaste() {
    const parsed = parseImport(pasteText)
    if (parsed.ok) {
      setPending(parsed.tasks)
      setResultMsg(`校验通过：共 ${parsed.tasks.length} 条任务，请选择导入方式。`)
    } else {
      setPending(null)
      setResultMsg(parsed.error)
    }
  }

  function handleConfirmImport() {
    if (!pending) return
    const res = onImport(pending, mode)
    toast.success(mode === 'merge' ? `合并完成：新增 ${res.added} 条，更新 ${res.updated} 条` : `已覆盖全部任务，共导入 ${res.added} 条`)
    setImportOpen(false)
    setPasteText('')
    setPending(null)
    setResultMsg('')
    setMode('merge')
  }

  return (
    <section className="border-t border-border py-5">
      <h2 className="font-title text-lg font-semibold">跨设备搬运数据</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        数据只存在当前设备的浏览器里。在平板导出的 JSON，到手机上「导入」即可同步（也可复制粘贴到微信传输）。
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-11" onClick={handleDownload}>
          <Download className="mr-1.5 size-4" />
          导出备份文件
        </Button>
        <Button variant="outline" className="min-h-11" onClick={handleCopy}>
          <ClipboardCopy className="mr-1.5 size-4" />
          复制到剪贴板
        </Button>
        <Button variant="outline" className="min-h-11" onClick={() => setImportOpen(true)}>
          <Upload className="mr-1.5 size-4" />
          导入
        </Button>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-title">导入备份</DialogTitle>
            <DialogDescription>
              选择备份文件，或把备份文本粘贴到下方。这是平板 → 手机搬数据的方式。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>从文件导入</Label>
              <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} className="hidden" />
              <Button variant="secondary" className="min-h-11" onClick={() => fileRef.current?.click()}>
                选择 todo-backup JSON 文件
              </Button>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="import-paste">粘贴文本导入</Label>
              <Textarea
                id="import-paste"
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value)
                  setPending(null)
                  setResultMsg('')
                }}
                rows={5}
                placeholder='粘贴完整的备份 JSON（形如 {"version":1,"tasks":[...]}）'
              />
              <Button variant="secondary" className="min-h-11" onClick={handleValidatePaste} disabled={!pasteText.trim()}>
                校验粘贴内容
              </Button>
            </div>
            {resultMsg && (
              <p className={pending ? 'text-sm text-primary' : 'text-sm text-destructive'}>{resultMsg}</p>
            )}
            <div className="grid gap-1.5">
              <Label>导入方式</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'merge' | 'overwrite')} className="grid gap-2">
                <Label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input px-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent">
                  <RadioGroupItem value="merge" id="mode-merge" />
                  <span>合并：按 id 去重，新数据覆盖同 id 的任务</span>
                </Label>
                <Label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input px-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent">
                  <RadioGroupItem value="overwrite" id="mode-overwrite" />
                  <span>覆盖全部：清空本设备现有任务</span>
                </Label>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setImportOpen(false)}>
              取消
            </Button>
            <Button className="min-h-11" onClick={handleConfirmImport} disabled={!pending}>
              确认导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
