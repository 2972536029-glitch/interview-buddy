# 「面搭子」任务书 B:报告导出 + 移动端底部导航 + PWA + 焦点环

> 交接文档:自包含,可独立执行。版本 2026-11-16 v1
> 本任务书与其他任务书(A:面试页交互,C:数据备份)并行执行,协作规则见第 4 节,违反即返工

## 1. 项目速览(30 秒)

- 「面搭子」:大学生 AI 模拟面试 + 简历诊断工具。Next.js 15(App Router)+ TypeScript + Tailwind CSS 3.4,目录 `D:\面搭子-mvp\`
- 大模型调用全在服务端 API Routes;持久化 localStorage(键 `mdz.*`,schema 冻结)
- 启动 `npm run dev` → http://localhost:3000(依赖已装好);类型检查 `npx tsc --noEmit` 必须全绿
- UI 刚完成一轮视觉优化(设计 token 体系),你做的是**导出/导航/可达性增强**,不要重做视觉

## 2. 设计系统约定(必须遵守)

- 颜色一律用语义 token 类:`bg-page` `bg-surface` `bg-surface-inset` `bg-surface-muted` / `border-line` `border-line-strong` / `text-ink` `text-ink-secondary` `text-ink-tertiary` / `bg-primary` `bg-primary-hover` `bg-primary-soft` `text-primary` / `danger` `success` `warn`(各含 `-soft`)。**禁止写 slate/blue/emerald/amber 等硬编码色值**(manifest/theme_color 里的十六进制属于配置,不受此限)
- 主题体系:CSS 变量 + `html.light/html.dark` + `prefers-color-scheme`;globals.css 里已有 `:root` / `html.light` / `html.dark` 三组变量和 `@media (prefers-color-scheme: dark)`,**不许重组结构,只许追加**
- 图标:`@/components/icons` 的内联 SVG;本任务书**独占 icons.tsx 的追加权**(可加新图标如 Home,风格:24 viewBox、stroke currentColor、strokeWidth 2;不删不改现有导出)
- 骨架屏 `@/components/Skeleton`;动效 150-250ms;全中文 UI,现有文案不许改意思

## 3. 任务清单

### B-1 报告页「导出/打印」按钮
- 报告页(`src/app/report/page.tsx`)头部操作区(「历史记录」链接旁)加次级按钮「导出/打印」(border-line 系样式),onClick 调 `window.print()`
- 打印样式已就绪(globals.css `@media print`:`.no-print` 隐藏、卡片去阴影);按钮自身加 `no-print` 类
- 不引任何 PDF 库——浏览器"另存为 PDF"即导出

### B-2 移动端底部导航栏
- 现状:375px 下 header 导航已图标化,但拇指可达性差
- 要求:`sm` 断点以下显示**固定底部 tab bar**(4 项:首页/简历诊断/历史记录/设置,图标 + 10-12px 文字,当前路由高亮);`sm` 及以上隐藏,header 导航维持现状
- 新组件 `src/components/BottomTabBar.tsx`("use client",usePathname;图标复用 icons.tsx,首页图标可新增 Home);当前项样式 `text-primary`(可配 `bg-primary-soft` 小胶囊)
- `layout.tsx` 挂载;处理两件事:① 底部安全间距(`pb-16 sm:pb-0` 量级)+ `env(safe-area-inset-bottom)` 兼容刘海屏;② footer 不被 tab bar 遮挡
- tab bar 加 `no-print`;active 判断:首页 `/` 精确等值,其余等值即可(无子路由)

### B-3 PWA 基础(manifest + 主题色)
- 新建 `public/manifest.webmanifest`:`name` 面搭子、`short_name` 面搭子、`start_url /`、`display standalone`、`background_color #f8fafc`、`theme_color #4f46e5`、`icons` 用 `public/icon.svg`(type image/svg+xml、sizes any、purpose "any maskable",同一文件可写两条)
- `layout.tsx`:`metadata` 加 `manifest: "/manifest.webmanifest"`;新增 `export const viewport: Viewport`(Next 15 规范,别塞进 metadata):`width/initialScale/viewportFit:"cover"` + `themeColor` 双值(亮 `(prefers-color-scheme: light)` → `#4f46e5`,暗 → `#312e81`)
- **不要注册 Service Worker**(离线缓存超出范围,dev 模式 SW 反而碍事)

### B-4 键盘焦点环(无障碍)
- globals.css 追加(只追加,不动既有规则):
  - `:focus-visible` 全局 `outline: 2px rgb(var(--mdz-primary)); outline-offset: 2px`
  - `:focus:not(:focus-visible) { outline: none }`(鼠标点击无环,键盘 Tab 有环)
- 验证:Tab 走一遍首页/面试页,焦点清晰;鼠标点击无环

## 4. 红线与多窗口协作规则(违反即返工)

1. **业务逻辑冻结**:不动任何状态机/fetch/localStorage 结构/路由/`data-*`/`thin-scroll` 类名;不引组件库;Tailwind 只 extend
2. **文件所有权(只许动这几个文件)**:
   - `src/app/report/page.tsx`(仅 B-1,改动最小化)
   - `src/components/BottomTabBar.tsx`(新建)
   - `src/app/layout.tsx`(B-2/B-3)
   - `public/manifest.webmanifest`(新建)、`public/` 图标(如需)
   - `src/app/globals.css`(仅 B-4 追加 focus 样式)
   - `src/components/icons.tsx`(仅追加新图标)
   - `src/components/SiteNav.tsx`(仅当 sm 以下需要隐藏时微调,优先用 layout 包裹类实现)
   - **禁止动**:interview 页、ScoreCard、settings 页、history 页、resume 页、Skeleton、ThemeToggle(归其他窗口/已冻结)
3. **开工前置检查**:`git status --short` 若显示 `src/` 下已有未提交改动,停止并提醒用户先处理;任务书 .md 文件本身 untracked,忽略
4. **dev server 共享**:先 `curl http://localhost:3000/`,200 直接用;没活才自己后台起;别杀进程、别删 .next
5. **git 只读**:禁止 commit/push/branch/stash/add;汇报只展示自己所有权文件的 diff
6. **tsc 并行说明**:其他窗口可能同时改到一半,`npx tsc --noEmit` 只要求**自己文件 0 错**,他人文件的错误在汇报中注明,不要去修

## 5. 验收清单(全过才算完成)

- [ ] 报告页点「导出/打印」→ 打印对话框,预览无 header/footer/按钮,卡片排版干净(no-print 生效)
- [ ] 375px 宽:底部 tab bar 显示、当前页高亮、点按跳转正确、内容与 footer 不被遮挡;1280px:无 tab bar,header 导航原样
- [ ] Chrome DevTools → Application → Manifest 可识别、无报错;"添加到主屏幕"可用图标
- [ ] Tab 键盘导航焦点环清晰可见;鼠标点击无焦点环
- [ ] `npx tsc --noEmit` 自己文件 0 错误;六路由(`/` `/interview` `/resume` `/history` `/settings` `/report?id=x`)无控制台报错
- [ ] 汇报:改动文件清单 + 限定文件的 `git diff --stat` + 截图(打印预览 / 375px 底部导航 / 桌面 header)
