# UI_SYSTEM — Sistema visual global

## Archivo del tema
`public/assets/css/theme.css` — tokens globales (`:root`). Carga: theme.css → app.css/auth.css/welcome.css → components.css → motion.css.

## Tipografías globales
- Fuente: Roboto variable (WOFF2), `font-display: swap`, autoalojada en `public/assets/fonts/`
- `--font-sans`: 'Roboto', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif
- `--font-mono`: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace
- Tamaños: `--text-2xs` (0.625rem) a `--text-3xl` (2.25rem)
- Pesos: 400, 500, 600, 700, 900
- Líneas: `--leading-tight` (1.2), `--leading-normal` (1.5), `--leading-relaxed` (1.7)

## Colores institucionales (no inventar)
- `--navy`: #152b41 | `--navy-soft`: #213b53
- `--teal`: #0b9b85 | `--teal-hover`: #087c6c
- `--brand-gold`: #A5832E | `--brand-gold-light`: #B9A867
- `--brand-secondary`: #BF8768 | `--brand-sand`: #E7DFC9 | `--brand-taupe`: #5E584E
- Semánticos derivados: `--color-primary` (#8f6f28), `--color-brand` (teal), `--color-success` (teal), `--color-warning` (amber), `--color-danger` (red), `--color-info` (blue)
- Fondos: `--color-canvas` (#f5f8fa), `--color-surface` (#fff), `--color-surface-muted` (#f9fbfc)

## Biblioteca de iconos
- Archivo: `public/assets/icons/lucide-sprite.svg` (sprite SVG local, generado con `npm run icons:build`)
- Uso correcto: `<svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#icon-name"></use></svg>`
- Clases: `.icon` (1.15em, stroke currentColor, stroke-width 2), `.icon-sm`, `.icon-lg`
- Los iconos heredan `color` y tamaño del contexto CSS.

## Componentes compartidos
- `.btn` (base), `.btn-primary`, `.btn-navy`, `.btn-danger`, `.btn-ghost`, `.btn-sm`, `.btn-full`
- `.form-item input/select/textarea`, `.search-wrap`, `.filter-select`, `.toggle-password`
- `.panel`, `.stat`, `.stat-progress`, `.modal`, `.modal-close`, `.modal-foot`
- `.table-scroll`, `.pill`, `.nav-counter`, `.auth-tag`
- `.notice`, `.auth-alert`, `.form-note`, `.toast`, `.connection-bar`
- `.empty`, `.skip-link`, `.block-caption`, `.field-caption.is-valid/is-invalid`
- `.skeleton-page`, `.skeleton-block`, `.skeleton-card`, `.skeleton-line`, `.skeleton-text`
- Tones de icono: `.stat-icon.tone-blue/teal/amber/gold/navy/violet` (components.css)

## Estilos de botones
- `.btn`: min-height 42px, padding 10px 20px, border 1px, border-radius píll, bg surface, color #375269, font-size sm, weight bold, transition fast
- `.btn-primary`: bg var(--color-primary) #8f6f28, color #fff, box-shadow brand
- `.btn-navy`: bg var(--navy), color #fff
- `.btn-danger`: bg var(--color-danger), color #fff
- `.btn-ghost`: transparente, borde rgba(255,255,255,0.46), color #fff
- `.btn .icon`: 1.1em

## Estilos de formularios
- `.form-item input/select/textarea`: min-height 42px, border 1px #dce5eb, radius sm, bg surface, focus: border primary + focus-ring
- `.search-wrap`: border píll, focus-within ring
- `.filter-select`: border píll, focus ring
- `.field-caption.is-valid`: color success; `.is-invalid`: color danger

## Espaciados
`--space-1` (4px) a `--space-12` (56px), paso 4px/8px/12px/16px/20px/24px/28px/32px/40px/48px/56px.

## Bordes y sombras
- Radios: xs 8px, sm 10px, md 14px, lg 18px, xl 23px, pill 999px, `--btn-radius`: píll
- Sombras: xs, sm, base, md, lg, brand (teal)
- Focus ring: `--focus-ring` (0 0 0 4px rgba(165,131,46,0.24)), `--focus-ring-primary`, `--focus-ring-secondary`

## Breakpoints
- Skeleton grid: max-width 960px → 2 columnas; max-width 560px → 1 columna
- Dashboard: max-width 1440px → 3 columnas stats; 1280px → sidebar 246px; 1100px → grid 1 columna; 1024px → sidebar 226px; 980px → navegación horizontal; 720px → dock inferior, sidebar fixed bottom
- Auth: max-width 1080px, 900px, 520px; también por altura (max-height 860px)

## Animaciones globales
- `--ease-standard`: cubic-bezier(0.2, 0.8, 0.2, 1)
- `--transition-fast`: 150ms, `--transition-base`: 200ms, `--transition-slow`: 320ms
- `lf-shimmer` (skeletons), `dash-rise` (vista entrada), `chart-draw` (línea actividad), `a-rise` (auth), `w-rise` / `w-float` (welcome), `boot-sweep` / `boot-failsafe` (precarga)
- `prefers-reduced-motion: reduce` → duraciones 0.001ms, animaciones desactivadas

## Reglas de accesibilidad
- `.sr-only` para contenido solo lectores de pantalla
- `:focus-visible` con outline 3px rgba(143,111,40,0.62), offset 2px
- `.skip-link` (enlace de salto al contenido)
- `aria-hidden="true"` en iconos decorativos, `focusable="false"`
- `color-scheme: light`, `scroll-behavior: smooth`, `-webkit-text-size-adjust: 100%`
- `text-rendering: optimizeLegibility`, `-webkit-font-smoothing: antialiased`
- Todo texto hereda `--color-text` (--ink) sobre `--color-canvas`
