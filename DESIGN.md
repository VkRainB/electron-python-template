---
version: alpha
name: Unified-Dark-Stripe-design-language
description: A dark-first design language that fuses two influences — Stripe's editorial-grade layout discipline (generous whitespace, thin display type with negative tracking, pill CTAs, tabular numerics) with CanIRun's calibrated dark color hierarchy (four-tier surface stack on near-pure black, single-emerald accent that doubles as the success signal, three-tier ink text). The result is an elegant, terminal-aware application surface that reads like a Stripe dashboard re-skinned for a developer tool that lives mostly in the dark.

colors:
  primary: "#22c55e"
  primary-deep: "#16a34a"
  primary-press: "#15803d"
  primary-soft: "#4ade80"
  primary-glow: "rgba(34, 197, 94, 0.08)"
  primary-bg-subdued: "rgba(34, 197, 94, 0.12)"
  info: "#3b82f6"
  surface: "#000000"
  surface-raised: "#0a0a0a"
  surface-card: "#111111"
  surface-hover: "#181818"
  surface-overlay: "#1c1c1f"
  edge-subtle: "#1a1a1a"
  edge: "#222222"
  edge-strong: "#2a2a2e"
  ink-primary: "#ededef"
  ink-secondary: "#a1a1aa"
  ink-mute: "#8a8a97"
  ink-disabled: "#56565f"
  on-primary: "#000000"
  on-dark: "#ededef"
  success: "#22c55e"
  danger: "#ef4444"
  warning: "#f59e0b"
  info-soft: "rgba(59, 130, 246, 0.12)"
  danger-soft: "rgba(239, 68, 68, 0.12)"
  warning-soft: "rgba(245, 158, 11, 0.12)"

typography:
  display-xxl:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 56px
    fontWeight: 300
    lineHeight: 1.03
    letterSpacing: -1.4px
    fontFeature: ss01
  display-xl:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 48px
    fontWeight: 300
    lineHeight: 1.15
    letterSpacing: -0.96px
    fontFeature: ss01
  display-lg:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 32px
    fontWeight: 300
    lineHeight: 1.1
    letterSpacing: -0.64px
    fontFeature: ss01
  display-md:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 26px
    fontWeight: 300
    lineHeight: 1.12
    letterSpacing: -0.26px
    fontFeature: ss01
  heading-lg:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 22px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: -0.2px
    fontFeature: ss01
  heading-md:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: -0.1px
    fontFeature: ss01
  heading-sm:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
    fontFeature: ss01
  body-lg:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
    fontFeature: ss01
  body-md:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
    fontFeature: ss01
  body-tabular:
    fontFamily: "'JetBrains Mono', 'Geist Mono', ui-monospace, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.2px
    fontFeature: tnum
  button-md:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: 0
    fontFeature: ss01
  button-sm:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: 0
    fontFeature: ss01
  caption:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
    fontFeature: ss01
  micro:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
    fontFeature: ss01
  micro-cap:
    fontFamily: "sohne-var, 'SF Pro Display', Inter, system-ui, -apple-system, sans-serif"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.06em
    fontFeature: ss01

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  huge: 64px

shadows:
  level-1: "0 1px 2px rgba(0, 0, 0, 0.4)"
  level-2: "0 4px 12px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)"
  level-3: "0 16px 32px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.35)"
  focus-ring: "0 0 0 3px rgba(34, 197, 94, 0.25)"

components:
  button-primary-pill:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
  button-primary-pill-hover:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
  text-input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 8px 12px
  text-input-focused:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 8px 12px
  card-feature:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  card-raised:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-dashboard:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.body-tabular}"
    rounded: "{rounded.lg}"
    padding: 24px
  pill-tag-soft:
    backgroundColor: "{colors.primary-bg-subdued}"
    textColor: "{colors.primary-soft}"
    typography: "{typography.micro-cap}"
    rounded: "{rounded.pill}"
    padding: 2px 8px
  pill-tag-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.micro-cap}"
    rounded: "{rounded.pill}"
    padding: 2px 8px
  pill-tag-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.micro-cap}"
    rounded: "{rounded.pill}"
    padding: 2px 8px
  nav-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xs}"
    padding: 12px 24px
  link-inline:
    backgroundColor: "transparent"
    textColor: "{colors.primary-soft}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xs}"
    padding: 0px
  footer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-mute}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 48px 24px
---

## Overview

这套设计语言把两种相反的气质粘到了一起:**Stripe 的明亮、克制、editorial 排版** —— 大留白、细体大字、负字距、pill 按钮、tabular 数字;以及 **CanIRun 那种暗色的、有层次的、像数据屏的色彩系统** —— 四级灰阶表面、单一祖母绿、三阶文本、几乎不可见的 hairline。

落地后是一个**暗色优先(dark-first)的应用界面**:页面底色是真正的 `#000`,内容靠着 `#0a / #11 / #18` 的四级灰阶抬升;CTA 是 emerald `#22c55e` 的 pill 按钮(Stripe 几何 + CanIRun 色相);标题是 Sohne(或 Inter)thin 300 weight,带负字距,落在 `#ededef`(微暖近白)上;数字一律 mono + tnum;卡片是 12px 圆角(Stripe),不是方角(CanIRun)。

成功 / 失败 / 警告三态颜色都从同一套语义库出来,且**主色直接复用为成功色** —— 这是 CanIRun 的核心简化:你不需要为"链接"另开一个蓝色,绿色既是品牌也是"对"。

**Key Characteristics:**
- 真黑底(`#000`)+ 4 级灰阶抬升(`#0a / #11 / #18 / #1c`),用更亮的灰拉层级,而不是依赖阴影。
- 单一 emerald `#22c55e` 主色:CTA、链接、品牌、成功状态四角色合一;一屏出现 3–6 次为佳。
- Sohne thin 300 显示字 + 负字距(`-0.2px` 到 `-1.4px` 随尺寸缩放),保留 Stripe 的编辑级排版气质。
- Pill 按钮(`9999px`)+ 卡片 12–16px 圆角:几何上跟 Stripe 完全一致,跟 CanIRun 的方角取反。
- Tabular 数字(`JetBrains Mono` + `tnum`):任何数值列、money、计数、版本号都走 mono。
- Hairline 边线(`#1a1a1a` 几乎贴底)与中线(`#222`)分级:`#1a` 卡片轮廓、`#222` 表格分隔、`#2a` 浮层强调。
- CTA 是绿底黑字(`#000` on `#22c55e`)—— 比白字对比度更高,WCAG AA 通过。
- 浮层(Dialog/Popover/Dropdown)在抬升表面之上**叠加暗阴影**(`rgba(0,0,0,0.55)`),静态卡片不加 shadow。

## Colors

### Brand & Accent
- **Primary** (`{colors.primary}` — `#22c55e`):品牌唯一强调色。承担 CTA 按钮、链接、品牌标识、成功态四重身份。一屏典型 3–6 次。
- **Primary Soft** (`{colors.primary-soft}` — `#4ade80`):用作内联链接 / 文字 emphasis(在 emerald 上往亮的方向偏移以提升暗底可读性)。Hover 时按钮也走这个色。
- **Primary Deep** (`{colors.primary-deep}` — `#16a34a`):按钮 active / 沉态。
- **Primary Press** (`{colors.primary-press}` — `#15803d`):最深陷态,极少使用。
- **Primary Glow** (`{colors.primary-glow}` — `rgba(34,197,94,0.08)`):背景晕染、focus halo。
- **Primary Subdued** (`{colors.primary-bg-subdued}` — `rgba(34,197,94,0.12)`):彩色徽章背景。
- **Info Blue** (`{colors.info}` — `#3b82f6`):中性信息提示;不作品牌色用。

### Surface(深度系统 / 暗色四级灰阶)

暗色 elevation 的核心:**用更亮的灰替代阴影**。同时在浮层上叠加 shadow 强化感知。

- **Surface 0 / Base** (`{colors.surface}` — `#000000`):`<html> / <body>` 绝对底色。
- **Surface 1 / Raised** (`{colors.surface-raised}` — `#0a0a0a`):次级面板、Input 内底、容器内子区。
- **Surface 2 / Card** (`{colors.surface-card}` — `#111111`):**标准卡片背景** —— 用得最多的内容块。
- **Surface 3 / Hover** (`{colors.surface-hover}` — `#181818`):卡片/行的 hover 态。
- **Surface 4 / Overlay** (`{colors.surface-overlay}` — `#1c1c1f`):Dialog、Popover、Dropdown 等浮层。配合 `shadow-level-3` 一起使用。

### Edge(边线)
- **Edge Subtle** (`{colors.edge-subtle}` — `#1a1a1a`):卡片 1px hairline,几乎与背景融合,只作微弱分割。
- **Edge** (`{colors.edge}` — `#222222`):表格行分隔、输入框默认边、悬浮卡片轮廓。
- **Edge Strong** (`{colors.edge-strong}` — `#2a2a2e`):Dialog / Popover 的外缘,提供与底色的明确分离。

### Ink(文本)

四阶,在 `#000–#18` 各级表面上都保证 WCAG AA。

- **Ink Primary** (`{colors.ink-primary}` — `#ededef`):默认正文与标题。**不是纯白** —— 微微偏暖的近白,在纯黑底上更柔和。
- **Ink Secondary** (`{colors.ink-secondary}` — `#a1a1aa`):副文本、说明、表格标签。
- **Ink Mute** (`{colors.ink-mute}` — `#8a8a97`):placeholder、辅助元数据、时间戳。
- **Ink Disabled** (`{colors.ink-disabled}` — `#56565f`):禁用态文字、极弱注释。
- **On Primary** (`{colors.on-primary}` — `#000000`):**落在绿色 CTA 上的文字** —— 黑字,WCAG 对比度 5.6:1(白字仅 2.5:1)。
- **On Dark** (`{colors.on-dark}` — `#ededef`):落在卡片/浮层上的标准文字,等同 Ink Primary。

### Semantic(状态色)

主色直接复用为成功色,是该体系的核心简化:

- **Success** (`{colors.success}` — `#22c55e`):与品牌色同值。表示"成功 / 在线 / 可用"。
- **Danger** (`{colors.danger}` — `#ef4444`):错误 / 不可用。
- **Warning** (`{colors.warning}` — `#f59e0b`):警告 / 待定 / 部分支持。
- **Info** (`{colors.info}` — `#3b82f6`):中性信息。

每个语义色都配套一个 `*-soft` 半透明背景版本(`*-soft: rgba(*, *, *, 0.12)`),配合 100% 不透明的文字使用,组成彩色徽章。

## Typography

### Font Family

**两套字体,职责严格分离**:

- **`Sohne`** (Klim 商业字体) → 主体:UI、标题、正文、按钮。降级到 **`Inter`**(开源,Google Fonts),再降级到 `SF Pro Display` / system-ui。
- **`JetBrains Mono`** (开源) → 数据:任何会出现列对齐的内容(money、版本号、参数、命令)。可降级到 **`Geist Mono`** / `ui-monospace`。

**全局启用**:
- 在 `body` 上设置 `font-feature-settings: "ss01"`,激活 Sohne / Inter 的 stylistic set 1(单层 `a` 等替代字形)。
- 在数据元素上**单独**启用 `font-feature-settings: "tnum"`。

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xxl}` | 56px | 300 | 1.03 | -1.4px | 首屏 Hero |
| `{typography.display-xl}` | 48px | 300 | 1.15 | -0.96px | 页面 H1 / Section opener |
| `{typography.display-lg}` | 32px | 300 | 1.1 | -0.64px | 卡片标题 / 强调段 |
| `{typography.display-md}` | 26px | 300 | 1.12 | -0.26px | 紧凑卡片标题 |
| `{typography.heading-lg}` | 22px | 400 | 1.3 | -0.2px | 区块标题(`Stripe pricing tier name`) |
| `{typography.heading-md}` | 18px | 500 | 1.4 | -0.1px | Section sub-heading |
| `{typography.heading-sm}` | 16px | 500 | 1.4 | 0 | Mini-section label |
| `{typography.body-lg}` | 16px | 400 | 1.5 | 0 | Marketing 引导 |
| `{typography.body-md}` | 14px | 400 | 1.5 | 0 | **默认 UI 正文** |
| `{typography.body-tabular}` | 13px | 400 | 1.5 | -0.2px | money / 数值表(Mono + `tnum`) |
| `{typography.button-md}` | 14px | 500 | 1.0 | 0 | Pill 按钮 |
| `{typography.button-sm}` | 13px | 500 | 1.0 | 0 | 紧凑按钮 |
| `{typography.caption}` | 12px | 400 | 1.4 | 0 | 辅助 / 元数据 |
| `{typography.micro}` | 11px | 400 | 1.4 | 0 | 极小注释 |
| `{typography.micro-cap}` | 10px | 500 | 1.2 | 0.06em | All-caps eyebrow / Badge |

### Principles
- **大字号 thin 300**。这是 Stripe 的灵魂。任何 ≥ 22px 的标题保留 `font-weight: 300`,**禁止上 600/700** —— 否则会丢掉品牌空气感。
- **小字号 400/500**。正文 400,按钮和小标题 500,在暗底上提供足够的笔画密度。
- **负字距随尺寸缩放**。`-1.4px @56px` → `-0.96 @48` → `-0.64 @32` → `-0.26 @26` → `-0.2 @22` → `0 @ ≤ 18px`。
- **tabular 数字**。任何 money、count、version、timestamp 一律 `JetBrains Mono` + `tnum`。这是该体系的"工程师血统"信号。
- **行高**。display 紧(1.03–1.15),heading 1.3–1.4,body 1.5。让密度跟着字体类别走。

### 颜色 × 字体的搭配

文字色不要随意选,严格按照场景:

| 场景 | 字体 token | 颜色 token |
|---|---|---|
| 首屏标题 | `display-xl / xxl` | `ink-primary` |
| 卡片标题 | `display-lg / heading-lg` | `ink-primary` |
| 段落正文 | `body-md / body-lg` | `ink-primary` |
| 副文本 / 说明 | `body-md / caption` | `ink-secondary` |
| placeholder / 时间戳 | `body-md / caption` | `ink-mute` |
| 数值 / money | `body-tabular` | `ink-primary` |
| 内联链接 | `body-md` | `primary-soft` |
| 禁用文字 | (任意) | `ink-disabled` |
| Badge 文字 | `micro-cap` | `primary / danger / warning` (对应语义) |
| Eyebrow / 标签 | `micro-cap` | `ink-secondary` |

## Layout

### Spacing System
- **Base unit**:8px(子分位 2/4/12)。
- **Tokens**:`{spacing.xxs}` 2px · `{spacing.xs}` 4px · `{spacing.sm}` 8px · `{spacing.md}` 12px · `{spacing.lg}` 16px · `{spacing.xl}` 24px · `{spacing.xxl}` 32px · `{spacing.huge}` 64px。
- **Section padding (marketing)**:64–96px 纵向,32–48px 横向。
- **Section padding (dashboard)**:32–48px 纵向,24px 横向。
- **Card internal padding**:32px(`card-feature`)/ 24px(`card-raised`、`card-dashboard`)。
- **Form field gap**:12px 纵向(label → input → helper)。

### Grid & Container
- 应用主区域容器最大 1200px 居中。
- 表格 / 数据密集区可铺满至 1440px。
- 响应栅格 12 列,以 `gap: 24px` 为默认列间。

### Whitespace Philosophy
**双速节奏**:Marketing / 引导页慢呼吸(section gap 64–96px,卡片 padding 32px);Dashboard / 数据页快呼吸(section gap 24–32px,卡片 padding 24px)。**永远不要把两种节奏混在同一屏**。

## Elevation & Depth

混合方案:**用 4 级灰阶替代静态阴影,只在浮层使用 shadow**。

| Level | 表面色 | Border | Shadow | Use |
|---|---|---|---|---|
| 0 | `surface` `#000` | — | — | Body |
| 1 | `surface-raised` `#0a0a0a` | 1px `edge-subtle` | — | 二级面板 / Input 内底 |
| 2 | `surface-card` `#111` | 1px `edge-subtle` | — | **标准卡片** |
| 3 | `surface-hover` `#181818` | 1px `edge-subtle` | — | Hover 态 |
| 4 (Float) | `surface-overlay` `#1c1c1f` | 1px `edge-strong` | `{shadows.level-3}` | Dialog / Popover / Dropdown |
| 5 (Toast) | `surface-overlay` `#1c1c1f` | 1px `edge` | `{shadows.level-3}` + glow | Toast / 通知 |

- **静态卡片不加 shadow**。在 `#000` 底上,`rgba(0,0,0,*)` 是隐形的。
- **浮层使用深阴影**:`shadow-level-3 = 0 16px 32px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)`。注意 alpha 必须够深,不然在暗底上看不见。
- **Focus ring**:`0 0 0 3px rgba(34, 197, 94, 0.25)` —— 用主色的 25% halo,而不是默认的蓝色 focus。

### Decorative Depth(可选)

如果需要"气氛感",可以在 hero 区叠加一组**低饱和度径向渐变 blob**:
- `radial-gradient(circle 480px at 50% -20%, rgba(34,197,94,0.10), transparent 60%)` (emerald glow)
- `radial-gradient(circle 360px at 80% 100%, rgba(139,92,246,0.06), transparent 55%)` (violet glow)
- `radial-gradient(circle 300px at 20% 100%, rgba(59,130,246,0.05), transparent 55%)` (info glow)

合成出 CanIRun 没有、但暗色 Stripe 应该有的"屏幕氛围"。**这是装饰层,不是必需**。

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | hairline 标签、表格 chip |
| `{rounded.sm}` | 6px | **Input / Textarea / Select** |
| `{rounded.md}` | 8px | 紧凑卡片、Alert、Menu item |
| `{rounded.lg}` | 12px | **标准卡片**(Stripe 灵魂) |
| `{rounded.xl}` | 16px | Hero 区大卡 / Dialog |
| `{rounded.pill}` | 9999px | **所有按钮、所有 Badge** |

**几何规则**:
- 大块面用 `lg/xl`,小标签用 `pill`,Input 用 `sm`。
- **永远不要把按钮做成圆角矩形**(`md/lg`)。要么 pill,要么不做按钮。
- 卡片之间嵌套时,内卡比外卡圆角小一档,保持视觉层级。

## Components

### Buttons

**`button-primary-pill`** —— 主 CTA。
- `bg: primary` `#22c55e`,`text: on-primary` `#000`(黑字),padding `{spacing.sm} {spacing.lg}` (8×16),`{rounded.pill}`,`button-md` 14/500。
- Hover:`bg → primary-soft` `#4ade80`。
- Active:`bg → primary-deep` `#16a34a`。
- Focus:加 `{shadows.focus-ring}`。
- **一屏 1–2 个上限**。

**`button-secondary`** —— 次级,暗色卡片底。
- `bg: surface-card` `#111`,`text: ink-primary` `#ededef`,1px `edge` 边,同 pill 几何。
- Hover:`bg → surface-hover` `#181818`。

**`button-ghost`** —— 纯文本按钮。
- `bg: transparent`,`text: ink-secondary`,pill。
- Hover:`bg → surface-hover` + `text → ink-primary`。

**`button-danger`** —— 破坏性操作。
- `bg: danger` `#ef4444`,`text: #ffffff`(注意红底用白字),pill。少用,仅删除 / 销毁场景。

### Cards & Containers

**`card-feature`** —— 标准特性卡片。
- `bg: surface-card` `#111`,1px `edge-subtle` border,padding `{spacing.xxl}` 32px,`{rounded.lg}` 12px,无 shadow。
- Hover:`bg → surface-hover`,border 不变。

**`card-raised`** —— 二级容器(嵌套于 card-feature 内的子区)。
- `bg: surface-raised` `#0a0a0a`,1px `edge-subtle`,padding 24px,`{rounded.lg}`。

**`card-dashboard`** —— 数据卡。
- `bg: surface-card` `#111`,padding 24px,`{rounded.lg}`,内部 `body-tabular` 字体,1px `edge` 分隔表头与内容。

### Inputs & Forms

**`text-input`** —— 标准输入。
- `bg: surface-raised` `#0a0a0a`,`text: ink-primary`,1px `edge`,`{rounded.sm}` 6px,padding `8px 12px`,字体 `body-md`。
- Placeholder 用 `ink-mute`。
- Focus:border → `primary`,加 `{shadows.focus-ring}`。

**Textarea**:同 `text-input` 几何,`min-height: 80px`。

**Select / Combobox**:同 `text-input`,触发后弹层走 `Surface 4 (Overlay)` 规则。

### Navigation

**`nav-bar`** —— 顶部 / 侧栏导航。
- `bg: surface` `#000` 或 `surface-raised`,`text: ink-primary`,padding `{spacing.md} {spacing.xl}` (12×24)。
- Active 项:`bg: primary` + `text: on-primary` (绿底黑字)。
- Hover 项:`bg: surface-hover`,`text: ink-primary`。

### Pills, Tags, Badges

**`pill-tag-soft`** —— 成功 / 正向徽章。
- `bg: primary-bg-subdued` `rgba(34,197,94,0.12)`,`text: primary-soft` `#4ade80`,`{rounded.pill}`,字号 10px,padding `2px 8px`。
- 注意 `text` 用 `primary-soft` 而不是 `primary`,在暗底上更易读。

**`pill-tag-danger`** —— 同结构,色相换 `danger`。

**`pill-tag-warning`** —— 同结构,色相换 `warning`。

### Signature Components

**`link-inline`** —— 内联链接。
- `text: primary-soft` `#4ade80`,无下划线。
- Hover:加 underline 或 `text → primary`。

**Money / Numeric cell** —— 数值单元。
- 字体 `body-tabular`(JetBrains Mono + tnum),`text: ink-primary`。
- 表格列右对齐,文字列左对齐(对齐 Excel 视觉惯例)。

**Status dot** —— 圆点状态指示。
- `size: 8px`,`{rounded.pill}`,色相按语义:`success` / `danger` / `warning` / `ink-mute (idle)`。
- 跟文字配对使用:`● Connected` `● Offline` `● Pending`。

## Do's and Don'ts

### Do
- 保留 thin 300 在所有 ≥ 22px 的标题上,这是 Stripe 灵魂。
- 用 4 级灰阶(`#000 / #0a / #11 / #18`)堆 elevation,只在浮层加 shadow。
- 把绿色 `#22c55e` 同时当作品牌、CTA、链接、成功色 —— 一色四用,简化语义。
- CTA 用绿底**黑字**,对比度更高。
- 数字一律 mono + tnum,跟正文做"内容 vs 数据"的明确分流。
- Pill 按钮配 12px 圆角卡片 —— 大方小圆的几何反差。
- 在 `body` 上全局 `ss01`,在数字元素单独 `tnum`。

### Don't
- 不要在 ≥ 22px 字段把字重提升到 400 以上,Stripe 的空气感来自 thin。
- 不要在静态卡片加 shadow —— 在 `#000` 底上是隐形的,只浪费样式。
- 不要把按钮做成圆角矩形(`rounded-md/lg`),要么 pill 要么没意义。
- 不要为"链接"另开一种蓝色 —— 用 `primary-soft` 即可。
- 不要把 `primary` 作为大面积背景(只是 CTA 强调色,大色块会冲淡)。
- 不要混合两种节奏:marketing(慢呼吸)和 dashboard(快呼吸)不要出现在同一屏。
- 不要用纯白 `#fff` 作正文色 —— 用 `#ededef`,暖一档。
- 不要用纯白 CTA 文字 —— `#000` on `#22c55e` 对比度更高。

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Wide | ≥ 1440px | 表格 3-col;Hero 56–48px |
| Desktop | 1024–1440px | 默认布局;Hero 48px |
| Tablet | 768–1023px | 卡片 2-up,Hero 36px |
| Mobile | < 768px | 单列;Hero 28px;Pill 按钮 padding 上调至 12×20 |

### Touch Targets
- Pill 按钮最小高度 36px,移动端 44px。
- Input 高度 40px 起,移动端 44px。
- Status dot 周围预留 8px 不可点击 buffer,避免误触。

### Type Step-down
Display tier 在断点上阶梯式缩小:
- xxl 56 → 48 → 40 → 32
- xl 48 → 40 → 32 → 28
- lg 32 → 28 → 24 → 22
- 负字距同步缩到 `-0.4px / -0.2px / 0`,避免移动端字间挤压。

### Collapsing Strategy
- Marketing 多列 → 2-up → 1-up。
- Dashboard 3-col stat 卡片 → 2-up → 1-up,但 stat 卡片自身**不再缩字号**,保证数据可读。
- 表格在 ≤ 768 改为"标签 + 值"的行式列表,放弃横向对齐。

## Iteration Guide

1. **从一个组件开始**。优先确定:Button(pill / 绿 / 黑字)+ Card(`#111` / 12px / 32px padding)+ Input(`#0a` 内底 / 6px / focus ring)。其余组件从这三个推导。
2. **严格用 token,不要写死 hex**。引用形如 `bg-[var(--color-surface-card)]` 或 Tailwind `bg-card`(经 `@theme` 映射)。
3. **新加状态色?**先回答:为什么不能复用 `primary / danger / warning / info`?
4. **新加几何?**先回答:为什么不能用现有 `xs / sm / md / lg / xl / pill` 之一?
5. **Sohne 不可用时**降级到 Inter,但保留 weight 300 + 负字距;**绝对不要**降到 system-ui default。
6. **Tailwind v4 落地 `@theme`**:

```css
@theme {
  /* Surface */
  --color-surface: #000;
  --color-surface-raised: #0a0a0a;
  --color-card: #111;
  --color-surface-hover: #181818;
  --color-popover: #1c1c1f;
  --color-overlay: #1c1c1f;

  /* Edge */
  --color-border: #1a1a1a;
  --color-edge: #222;
  --color-edge-strong: #2a2a2e;

  /* Ink */
  --color-foreground: #ededef;
  --color-muted-foreground: #a1a1aa;
  --color-mute: #8a8a97;
  --color-disabled: #56565f;

  /* Brand / Semantic */
  --color-primary: #22c55e;
  --color-primary-foreground: #000;
  --color-primary-soft: #4ade80;
  --color-destructive: #ef4444;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;
  --color-ring: #22c55e;

  /* Type */
  --font-sans: 'Sohne', 'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Geist Mono', ui-monospace, monospace;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}

@layer base {
  body {
    background: var(--color-surface);
    color: var(--color-foreground);
    font-family: var(--font-sans);
    font-feature-settings: "ss01";
  }

  .tabular { font-feature-settings: "tnum"; font-family: var(--font-mono); }
}
```

7. **shadcn-vue 落地映射**(更新 `web/src/assets/main.css` 的 `:root` 块,**不需要保留 `.dark`** —— 这套设计是 dark-first,亮色版本不在范围):

```css
:root {
  --background: oklch(0 0 0);              /* #000 */
  --foreground: oklch(0.94 0.005 264);     /* #ededef */
  --card: oklch(0.16 0 0);                 /* #111 */
  --card-foreground: oklch(0.94 0.005 264);
  --popover: oklch(0.21 0 0);              /* #1c1c1f */
  --popover-foreground: oklch(0.94 0.005 264);
  --primary: oklch(0.72 0.18 142.5);       /* #22c55e */
  --primary-foreground: oklch(0 0 0);      /* #000 黑字 */
  --secondary: oklch(0.16 0 0);            /* #111 */
  --secondary-foreground: oklch(0.94 0.005 264);
  --muted: oklch(0.12 0 0);                /* #0a0a0a */
  --muted-foreground: oklch(0.72 0.005 264); /* #a1a1aa */
  --accent: oklch(0.18 0 0);               /* #181818 */
  --accent-foreground: oklch(0.94 0.005 264);
  --destructive: oklch(0.66 0.21 25);      /* #ef4444 */
  --border: oklch(0.18 0 0 / 60%);         /* #1a 在 #000 上 */
  --input: oklch(0.18 0 0);
  --ring: oklch(0.72 0.18 142.5 / 30%);    /* #22c55e at 30% */
  --radius: 0.75rem;                       /* 12px lg */
}
```

8. **focus-visible 优先**:键盘聚焦时显示 `{shadows.focus-ring}`,鼠标点击时不显示(用 `:focus-visible` 而不是 `:focus`)。
9. **CTA 文字色**:在所有 `bg-primary` 的元素上,强制 `text-primary-foreground`(黑色)。不要用 `text-white`。
10. **数字组件抽一个 `<TabularText>`** 或 `font-mono tabular-nums` 工具类,让"数字一律 mono"成为团队默认。
