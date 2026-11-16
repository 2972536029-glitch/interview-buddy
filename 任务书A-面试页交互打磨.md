# 「面搭子」任务书 A:面试页交互打磨

> 交接文档:自包含,可独立执行。版本 2026-11-16 v1
> 本任务书与其他任务书(B:报告导出/移动端导航/PWA,C:数据备份)并行执行,协作规则见第 4 节,违反即返工

## 1. 项目速览(30 秒)

- 「面搭子」:大学生 AI 模拟面试 + 简历诊断工具。Next.js 15(App Router)+ TypeScript + Tailwind CSS 3.4,目录 `D:\面搭子-mvp\`
- 大模型调用全在服务端 API Routes;持久化 localStorage(键 `mdz.*`,schema 冻结)
- 启动 `npm run dev` → http://localhost:3000(依赖已装好);类型检查 `npx tsc --noEmit` 必须全绿
- UI 刚完成一轮视觉优化(设计 token 体系),你做的是**交互层增强**,不要重做视觉

## 2. 设计系统约定(必须遵守,防止风格漂移)

- 颜色一律用语义 token 类:`bg-page` `bg-surface` `bg-surface-inset` `bg-surface-muted` / `border-line` `border-line-strong` / `text-ink` `text-ink-secondary` `text-ink-tertiary` / `bg-primary` `bg-primary-hover` `bg-primary-soft` `text-primary` / `danger` `success` `warn`(各含 `-soft`)。定义在 tailwind.config.ts。**禁止写 slate/blue/emerald/amber 等硬编码色值**
- 主题体系:CSS 变量 + `html.light/html.dark` + `prefers-color-scheme`,用语义类自动适配亮暗,无需关心
- 图标:`@/components/icons` 的内联 SVG(Volume2/Square/User/MessageSquare/Check/AlertTriangle/Loader/ArrowRight/Sparkles 等)。**本任务书禁止改动 icons.tsx**(归窗口 B 管);缺图标就在自己组件内内联手写(24 viewBox、stroke currentColor)
- 动效:150-250ms;`fade-in` `bubble-in` 类已在 globals.css。**禁止改 globals.css**(归窗口 B 管)
- 全中文 UI,现有文案不许改意思

## 3. 任务清单(全部围绕面试页)

### A-1 提交后输入框高度回落(bug 修复)
- 现状:输入区 textarea 的自适应增高写在 `onChange` 里(`el.style.height = Math.min(scrollHeight, 220)px`)。提交回答后 `setAnswer("")` 清空,但清空不触发 onChange,高度残留在 220px
- 要求:提交后高度回落到初始(rows=4 默认高度)。建议:textareaRef + 提交流程里重置内联高度(`height = "auto"`)

### A-2 流式输出不再"强拉"到底部
- 现状:`useEffect([session, streamBuf])` 每次都 `scrollTop = scrollHeight`;面试官流式出题时,用户往上翻看上一题会被不断拽回底部
- 要求:**仅当用户本来就停在底部附近(距底 ≤ 80px)时才自动滚动**;用户上翻后不再自动滚,直到手动滚回底部才恢复跟滚
- 建议实现:onScroll 里把"距底距离"写入 ref;effect 里读 ref 判断后再滚。不改任何业务状态机

### A-3 本场点评回看
- 现状:右侧 ScoreCard 只显示最新一条点评;答到第 3 题时无法回顾第 1 题的"欠缺"
- 要求:ScoreCard 下方新增「本场点评回顾」卡片,默认折叠(`<details>`,summary 带条数);展开后列出 `session.grades` 全部条目,每条显示:第 N 题 · 第 M 轮回答、四维分小徽章(色阶:`v>=4` success / `v>=3` primary / 其余 warn,参考报告页得分表写法)、欠缺 gaps 前 2 条
- 数据**只读** `session.grades`,不动其结构、不加 localStorage 键
- 建议新组件 `src/components/SessionGradesHistory.tsx`

### A-4 消息气泡 memo 化(性能)
- 现状:每条消息是 interview/page.tsx 内联 JSX;流式时 `setStreamBuf` 每个 chunk 触发整个对话区重渲染,约 15-20 条气泡全量 re-render
- 要求:抽 `src/components/ChatBubble.tsx`,`React.memo` 包裹;props 仅 `m`(消息对象)、`isSpeaking`(boolean)、`onToggleSpeak(id, text)`
- **关键坑(必看,做错 memo 就白做)**:现有 `speak()` 依赖 `speakingId` state 做"再点一次停止",直接传会把新函数引用传下去使 memo 失效。做法:新增 `speakingIdRef` 与 state 双写,`onToggleSpeak` 内部读 ref 判断当前是否正在朗读,从而 `useCallback([], ...)` 引用稳定;`isSpeaking` 变化时只有对应气泡重渲
- 气泡结构/样式/头像/朗读按钮保持现状,纯结构搬移

## 4. 红线与多窗口协作规则(违反即返工)

1. **业务逻辑冻结**:状态机(asking/await/finished)、fetch 与请求体、`sessionRef/patchSession`、#NOTES# 解析、`<新题>/<追问>/<结束>` 标签协议一律不动
2. **文件冻结**:`src/lib/`、`src/app/api/`、localStorage 键名与数据结构、路由路径、`data-*`/`thin-scroll` 类名不动;不引任何组件库
3. **文件所有权(只许动这几个文件)**:
   - `src/app/interview/page.tsx`
   - `src/components/ChatBubble.tsx`(新建)
   - `src/components/SessionGradesHistory.tsx`(新建)
   - `src/components/ScoreCard.tsx`(仅 A-3 需要时小幅配合)
   - **禁止动**:globals.css、icons.tsx、layout.tsx、其他页面(归其他窗口)
4. **开工前置检查**:`git status --short` 若显示 `src/` 下已有未提交改动,停止并提醒用户先处理(多窗口共享同一工作区,基线必须干净);任务书 .md 文件本身是 untracked,忽略即可
5. **dev server 共享**:先 `curl http://localhost:3000/`,200 则直接用(热更新,别杀进程别删 .next);没活才自己后台起
6. **git 只读**:禁止 commit/push/branch/stash/add;汇报只展示自己所有权文件的 diff(`git diff -- src/app/interview src/components/ChatBubble.tsx src/components/SessionGradesHistory.tsx src/components/ScoreCard.tsx`)
7. **tsc 并行说明**:其他窗口可能同时改到一半,`npx tsc --noEmit` 只要求**自己文件 0 错**,他人文件的错误在汇报中注明即可,不要去修

## 5. 验收清单(全过才算完成)

- [ ] 提交一次回答后,输入框高度回落(不留 220px 残留)
- [ ] 流式输出时上翻对话不被拉回底部;手动滚回底部后恢复自动跟滚
- [ ] 折叠卡可展开,看到本场全部已生成点评(含前面题),色阶徽章正确
- [ ] ChatBubble memo 生效:朗读状态切换时仅对应气泡重渲(可用 React DevTools Highlight updates 目验)
- [ ] `npx tsc --noEmit` 自己文件 0 错误
- [ ] 浏览器实测走通一题(出题→回答→点评→追问)无回归
- [ ] 汇报:改动文件清单 + 限定文件的 `git diff --stat` + 面试页截图(含展开的点评回顾)×2(亮/暗各一张,用 header 主题按钮切换)
