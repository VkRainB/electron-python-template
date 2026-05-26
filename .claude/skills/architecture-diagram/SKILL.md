---
name: architecture-diagram
description: Create polished architecture diagrams in light or vibrant flat-icon styles as self-contained HTML+SVG files. Use when the user asks for system, infrastructure, cloud, security, or network topology diagrams.
---

# Architecture Diagram Skill

Create professional technical architecture diagrams as self-contained HTML files with inline SVG graphics and CSS styling.

> **Version 2.1** · MIT License · Authored by [Cocoon AI](mailto:hello@cocoon-ai.com)

## Available Themes

This skill provides two themes for architecture diagrams:

| Theme | File | Style | Best For |
|-------|------|-------|----------|
| **Light** (Default) | `resources/template-light.html` | Academic, subtle | Technical docs, presentations |
| **Vibrant** | `resources/template-vibrant.html` | Flat icon, energetic | Dashboards, modern docs |

**Default:** Use `resources/template-light.html` unless the user specifies otherwise.

## Design System

### Color Palette - Light Theme (Default)

Academic style with subtle, professional colors:

| Component Type | Fill | Stroke |
|---------------|------|--------|
| Frontend | `rgba(3, 105, 161, 0.08)` | `#0369a1` |
| Backend | `rgba(4, 120, 87, 0.08)` | `#047857` |
| Database | `rgba(109, 40, 217, 0.08)` | `#6d28d9` |
| AWS/Cloud | `rgba(180, 83, 9, 0.08)` | `#b45309` |
| Security | `rgba(190, 18, 60, 0.08)` | `#be123c` |

### Color Palette - Vibrant Theme

Flat icon style with tinted backgrounds (inspired by draw.io):

| Component Type | Fill | Stroke |
|---------------|------|--------|
| Frontend | `#eff6ff` | `#bfdbfe` |
| Backend | `#f0fdf4` | `#dcfce7` |
| Database | `#faf5ff` | `#ede9fe` |
| AWS/Cloud | `#fff7ed` | `#fed7aa` |
| Security | `#fef2f2` | `#fee2e2` |

**Semantic Arrow Colors (Vibrant):**
| Flow | Color | Use |
|------|-------|-----|
| A (Main) | `#2563eb` | Primary connections |
| B (Alt) | `#dc2626` | Auth/security flows |
| C (Data) | `#16a34a` | Data transfers |
| D (Async) | `#9333ea` | Async/messaging |

### Typography

**Light Theme:** Inter font family
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Vibrant Theme:** System fonts (no external dependency)
```css
font-family: 'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;
```

Font sizes: 14px labels, 12px sub-labels, 16px titles (Vibrant) / 11px, 9px, 12px (Light)

### Component Boxes

**Light Theme:** Rounded rectangles with subtle fills
```svg
<rect rx="6" fill="white" stroke="#cbd5e1" stroke-width="1.5"/>
```

**Vibrant Theme:** Rounded rectangles with tinted backgrounds
```svg
<rect rx="8" ry="8" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5"/>
```

### Arrows

**Light Theme:** Single arrowhead color
```svg
<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
  <polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/>
</marker>
```

**Vibrant Theme:** Semantic arrow colors
```svg
<marker id="arrow-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
  <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb"/>
</marker>
<marker id="arrow-red" ... fill="#dc2626"/>
<marker id="arrow-green" ... fill="#16a34a"/>
<marker id="arrow-purple" ... fill="#9333ea"/>
```

### Spacing Rules

**CRITICAL:** When stacking components vertically, ensure proper spacing to avoid overlaps:

- **Standard component height:** 60px for services, 80-120px for larger components
- **Minimum vertical gap between components:** 40px
- **Inline connectors (message buses):** Place IN the gap between components, not overlapping

**Example vertical layout:**
```
Component A: y=70,  height=60  → ends at y=130
Gap:         y=130 to y=170   → 40px gap, place bus at y=140 (20px tall)
Component B: y=170, height=60  → ends at y=230
```

### Legend Placement

**CRITICAL:** Place legends OUTSIDE all boundary boxes (region boundaries, cluster boundaries, security groups).

- Calculate where all boundaries end (y position + height)
- Place legend at least 20px below the lowest boundary
- Expand SVG viewBox height if needed to accommodate

### Layout Structure

1. **Header** - Title with icon badge (Vibrant) or dot indicator (Light), subtitle, and export toolbar
2. **Main SVG diagram** - Contained in bordered card
3. **Summary cards** - Grid of 3 cards below diagram with key details
4. **Footer** - Minimal metadata line

### Export Toolbar (built-in)

Every diagram ships with a `⋯` toggle in the header. Click to reveal Copy/PNG/PDF buttons. The toolbar collapses by default.

Keep these intact in templates:
- CDN scripts with SRI hashes (html2canvas, jsPDF)
- `id="report-container"` on container div
- `.toolbar` markup and CSS
- Export functions: `copyAsImage()`, `downloadPNG()`, `downloadPDF()`

### Info Card Pattern

**Light Theme:**
```html
<div class="card">
  <div class="card-header">
    <div class="card-dot COLOR"></div>
    <h3>Title</h3>
  </div>
  <ul><li>Item</li></ul>
</div>
```

**Vibrant Theme:**
```html
<div class="card">
  <div class="card-header">
    <div class="card-icon COLOR">
      <svg><!-- icon --></svg>
    </div>
    <h3>Title</h3>
  </div>
  <ul><li>Item</li></ul>
</div>
```

## Templates

Copy and customize the appropriate template:

- **Light Theme (Default):** `resources/template-light.html`
- **Vibrant Theme:** `resources/template-vibrant.html`

Key customization points:

1. Update the `<title>` and header text
2. Modify SVG viewBox dimensions if needed (default: `1000 x 680`)
3. Add/remove/reposition component boxes
4. Draw connection arrows between components
5. Update the three summary cards
6. Update footer metadata

## Theme Selection Guide

| Use Case | Recommended Theme |
|----------|-------------------|
| Technical documentation | Light |
| Screen presentations | Light |
| Academic papers | Light |
| Modern dashboards | Vibrant |
| Developer docs | Vibrant |
| Product diagrams | Vibrant |

## Output

Always produce a single self-contained `.html` file with:
- Embedded CSS (no external stylesheets except Google Fonts for Light theme)
- Inline SVG (no external images)
- Export toolbar with CDN scripts (html2canvas and jsPDF)

The file should render correctly when opened directly in any modern browser.
