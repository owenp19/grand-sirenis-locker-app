# welcome.md — Memoria de pantalla

## 1. Objetivo
Portada pública de la app. Muestra información del sistema, acceso a login y registro. Redirige al dashboard si hay sesión activa.

## 2. Archivos principales
- `public/welcome.php` — PHP + HTML de la pantalla
- `public/assets/css/welcome.css` — Estilos exclusivos de welcome
- `public/assets/css/theme.css` — Tokens globales
- `public/assets/css/components.css` — Componentes globales (carga final)
- `public/assets/css/motion.css` — Animaciones
- `public/assets/js/motion.js` — JS de movimiento

## 3. Componentes
- `.welcome-page` (contenedor principal)
- `.welcome-stage` (área principal con overflow clip)
- `.welcome-main` (grid 2 columnas)
- `.welcome-copy` (columna contenido)
- `.welcome-visual` (columna visual con placa de lockers)
- `.welcome-cta` (botón acción principal)
- `.welcome-plate` (placa ilustrativa de lockers)
- `.locker-grid` / `.locker-door` (cuadrícula de lockers CSS)
- `.welcome-features` (lista de características)
- `.welcome-float` (tarjetas flotantes animadas)
- `.welcome-skip` (enlace de salto)
- `.boot` (precarga)

## 4. Dependencias
- theme.css (tokens, tipografía Roboto, iconos .icon)
- welcome.css (estilos welcome-page)
- components.css (componentes globales)
- motion.css (animaciones w-rise, w-float, boot)
- lucide-sprite.svg (iconos: arrow-right, lock, shield-check, layout-dashboard, history, heart)

## 5. Estado actual
- Funcional, pantalla pública sin autenticación
- 32 puertas de locker ilustradas con CSS (estados: used, free, warn)
- Redirige a index.php si `current_user()` existe

## 6. Decisiones visuales
- Paleta arena + oro: `--w-ink` #2B2620, `--w-gold` var(--brand-gold) #A5832E
- Fondo degradado radial + lineal arena/oro
- CTA botón oro profundo #8F6F28
- Placa de lockers rotada -1.4deg, blanca con sombra
- Animaciones de revelado progresivo

## 7. Cambios realizados
- (Ninguno aún)

## 8. Problemas conocidos
- (Ninguno documentado)

## 9. Pendientes
- (Ninguno)
