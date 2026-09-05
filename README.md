# 待办工作台

高中生的待办事务工作台 · 学术风设计 · React + TypeScript + Vite + Tailwind CSS

**在线使用**：https://khelilshang78-web.github.io/todo-workbench/

## 功能

- 「现在该做什么」智能推荐（锚点 > 逾期 > 优先级 > 截止 > 用时）
- 锚点任务：每天锁定 1 个天塌下来也完成的任务
- 任务增删改查：科目 / 优先级 / 截止 / 预计用时 / 备注
- 筛选与搜索、完成统计、连续打卡
- localStorage 本地持久化；JSON 导出 / 导入，跨设备搬数据
- 明 / 暗（深夜书房）双主题，快捷键 `n` 新建、`/` 搜索

## 本地开发

```bash
npm install
npm run dev
```

## 部署

推送到 `main` 分支后由 GitHub Actions 自动构建并发布到 GitHub Pages。
