# 「面搭子」任务书 C:数据备份/恢复

> 交接文档:自包含,可独立执行。版本 2026-11-16 v1
> 本任务书与其他任务书(A:面试页交互,B:报告导出/移动端导航)并行执行,协作规则见第 4 节,违反即返工

## 1. 项目速览(30 秒)

- 「面搭子」:大学生 AI 模拟面试 + 简历诊断工具。Next.js 15(App Router)+ TypeScript + Tailwind CSS 3.4,目录 `D:\面搭子-mvp\`
- 大模型调用全在服务端 API Routes;**全部数据存 localStorage(键 `mdz.*` 前缀),清缓存/换浏览器即丢失**——本任务就是解决这个
- 现有键(只读参考,禁止改结构):`mdz.sessions.v1`(会话数组)、`mdz.resume.last.v1`(上次诊断)、`mdz.settings.v1`(模型设置)、`mdz.theme.v1`(主题偏好,可能不存在)
- 启动 `npm run dev` → http://localhost:3000;类型检查 `npx tsc --noEmit` 必须全绿

## 2. 设计系统约定(必须遵守)

- 颜色一律用语义 token 类:`bg-surface` `border-line` `text-ink`/`text-ink-secondary`/`text-ink-tertiary`、`bg-primary`/`bg-primary-soft`/`text-primary`、`danger`/`warn`(各含 `-soft`)。**禁止写 slate/blue/emerald/amber 等硬编码色值**
- 图标:`@/components/icons` 内联 SVG(XCircle/Check/Loader/ArrowRight 已有)。**禁止改动 icons.tsx**(归窗口 B 管),缺什么在自己组件内内联手写
- 主题体系:CSS 变量 + html.light/html.dark,语义类自动适配;**禁止改 globals.css**
- 全中文 UI;危险/不可逆操作要有明确的视觉警示与二次确认(项目现有风格用 window.confirm,保持一致)

## 3. 任务清单:设置页新增「数据管理」卡片

### C-1 导出备份
- 位置:`src/app/settings/page.tsx`,现有「关于模型与费用」卡片之后
- 建议新组件 `src/components/DataBackupCard.tsx`("use client"),设置页引入;设置页原有模型切换/保存逻辑**一行不动**
- 行为:点击「导出备份」→ 遍历 `window.localStorage`,收集所有 **`mdz.` 前缀**键值 → 组装:
  `{ "app": "mian-dazi", "version": 1, "exportedAt": <ISO 字符串>, "entries": { "<键>": "<原值字符串>", ... } }`
  → `Blob` + `URL.createObjectURL` + `<a download>` 触发下载,文件名 `mdz-backup-YYYYMMDD-HHmm.json`(本地时间)
- 注意 entries 存**原始字符串**(localStorage 本来就是字符串),导入时原样写回,不要 parse 再 stringify

### C-2 导入恢复
- 同卡片内次级按钮「导入恢复」(warn 色系,弱于导出)→ 触发隐藏 `<input type="file" accept=".json">`
- 读取( FileReader )→ 校验链,任何一步失败都在卡片内联提示(text-danger + XCircle 图标),不弹 alert、不崩页面:
  1. JSON.parse 失败 → "文件格式不对,请选择由面搭子导出的备份文件"
  2. 结构校验:必须是非空对象且有 `entries` 对象 → 同上提示
  3. **安全校验:`entries` 的每个键必须以 `mdz.` 开头,否则整包拒绝**(提示"备份文件包含未知数据,已取消导入")——这一步防止把任意键写进用户 localStorage
- 校验通过 → `window.confirm("将用备份覆盖当前全部练习记录、诊断结果与设置,确定继续吗?")`
  - 取消 → 不做任何写入
  - 确定 → 逐键 `localStorage.setItem(key, entries[key])` → 卡片内提示"导入成功,正在刷新…" → `location.reload()`
- 覆盖语义:**同键整体覆盖**(如 sessions 数组整体替换),不做合并——confirm 文案必须把这一点说清
- 选中文件后无论成功失败,清空 input.value(允许重复选同一文件)

### 边界与错误处理
- localStorage 不可用(隐私模式等):try/catch,导出时提示"当前浏览器不允许读取本地存储"
- 导出的备份里包含 DeepSeek API Key(在 mdz.settings.v1 里):在卡片说明文案中注明"备份文件包含模型设置(含 DeepSeek Key,若填过),请妥善保管,不要发给别人"

## 4. 红线与多窗口协作规则(违反即返工)

1. **禁止 import 或修改 `src/lib/storage.ts` 及 `src/lib/` 任何文件**——直接用 `window.localStorage` 读写,不新增任何 `mdz.*` 键
2. 业务逻辑/路由/`data-*`/`thin-scroll` 类名冻结;不引组件库
3. **文件所有权(只许动这几个文件)**:
   - `src/app/settings/page.tsx`(仅追加卡片引入)
   - `src/components/DataBackupCard.tsx`(新建)
   - **禁止动**:其他一切文件(面试页/报告页/layout/globals.css/icons.tsx/SiteNav 等归其他窗口或已冻结)
4. **开工前置检查**:`git status --short` 若显示 `src/` 下已有未提交改动,停止并提醒用户先处理;任务书 .md 文件本身 untracked,忽略
5. **dev server 共享**:先 `curl http://localhost:3000/`,200 直接用(热更新);没活才自己后台起;别杀进程、别删 .next
6. **git 只读**:禁止 commit/push/branch/stash/add;汇报只展示自己文件的 diff
7. **tsc 并行说明**:其他窗口可能同时改到一半,`npx tsc --noEmit` 只要求**自己文件 0 错**,他人文件的错误在汇报中注明,不要去修

## 5. 验收清单(全过才算完成)

- [ ] 导出:生成 `mdz-backup-*.json`,内容含 `mdz.sessions.v1` / `mdz.resume.last.v1` / `mdz.settings.v1`(及 `mdz.theme.v1`,若存在)
- [ ] 导入闭环:在历史页删几条记录 → 导入备份 → 自动刷新 → 记录恢复
- [ ] 恶意文件防御:非 JSON 文件、含非 `mdz.` 前缀键的 JSON → 各自友好提示,localStorage 未被改动
- [ ] confirm 取消 → 零写入
- [ ] 设置页原功能(模型切换/保存/DeepSeek Key 输入)无回归
- [ ] `npx tsc --noEmit` 自己文件 0 错误
- [ ] 汇报:改动文件清单 + 限定文件的 `git diff --stat` + 截图(卡片 / 导出的 JSON 内容摘要 / 导入前后历史页对比)
