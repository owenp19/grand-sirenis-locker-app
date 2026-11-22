# Licencias y procedencia de recursos visuales — Grand Sirenis Locker App

Registro obligatorio de tipografías, iconos, imágenes, ilustraciones y modelos 3D
incorporados al proyecto. Toda incorporación debe ser **original, CC0 o con licencia
que permita expresamente uso comercial**; se prefieren licencias sin atribución
obligatoria. No se admiten recursos premium, con marca de agua o de licencia
desconocida.

## Política de recursos visuales

1. Verificar la licencia **antes** de descargar o incorporar el recurso.
2. Guardar la procedencia (URL, autor, versión) y la fecha de verificación en este archivo.
3. Alojar los recursos localmente; no usar CDN ni dependencias de red en tiempo de ejecución.
4. Optimizar el formato: SVG para iconos, WOFF2 para tipografía, WebP/AVIF para fotografías.
5. Evitar modelos 3D pesados o innecesarios; el 3D solo si aporta valor real.
6. Si la licencia exige atribución, mostrarla en `docs/` y en la documentación del proyecto.
7. Ningún recurso se obtiene de bancos premium, capturas de terceros o sitios sin licencia clara.

## Recursos en uso

| Recurso | Tipo | Versión / origen | Licencia | Uso comercial | Atribución | Archivos |
|---|---|---|---|---|---|---|
| Roboto (variable) | Tipografía | v51 · Google Fonts · subsets `latin` y `latin-ext` | Apache License 2.0 | Sí | No obligatoria (se acredita igualmente) | `public/assets/fonts/roboto-latin.woff2`, `public/assets/fonts/roboto-latin-ext.woff2` |
| Lucide Icons | Iconos SVG | `lucide-static@1.74.0` (npm) | ISC | Sí | No obligatoria (aviso de copyright incluido abajo) | `public/assets/icons/lucide-sprite.svg` (generado por `scripts/build-icons.js`) |
| Logo e iconos de la app | SVG/PNG originales | Diseño propio del proyecto | Original | Sí | No aplica | `public/icons/icon.svg`, `public/icons/icon-192.png`, `public/icons/icon-512.png` |
| Ilustración de bienvenida / inventario | HTML + CSS originales | Diseño propio (sin imágenes externas) | Original | Sí | No aplica | `public/login.php`, `public/register.php`, `public/assets/css/auth.css` |

**No se han incorporado** fotografías de stock, ilustraciones de terceros, modelos 3D,
vídeos ni recursos premium.

## Verificación de licencias

| Recurso | Fuente consultada | Fecha de verificación | Notas |
|---|---|---|---|
| Roboto | `https://fonts.google.com/specimen/Roboto` · `https://fonts.googleapis.com/css2?family=Roboto:wght@100..900` | 2026-11-17 | Variable, pesos 100–900, `font-display: swap`; descarga directa desde `fonts.gstatic.com` |
| Lucide | `https://lucide.dev/license` · `npm view lucide-static license` → `ISC` | 2026-11-17 | Solo se empaquetan los iconos usados; sin runtime ni CDN |

## Avisos de copyright

### Roboto

Copyright 2011 Google Inc. All Rights Reserved.
Licensed under the Apache License, Version 2.0 — `https://www.apache.org/licenses/LICENSE-2.0`.

### Lucide

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of
Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

ISC License:

> Permission to use, copy, modify, and/or distribute this software for any purpose
> with or without fee is hereby granted, provided that the above copyright notice
> and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
> REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
> FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
> INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
> OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
> TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
> THIS SOFTWARE.

## Cómo añadir un recurso nuevo

1. Confirmar licencia y uso comercial permitido; descartar el recurso si hay dudas.
2. Optimizar el archivo (SVG limpio, WebP/AVIF para fotos, WOFF2 para fuentes).
3. Guardarlo en `public/assets/` (o `public/icons/` si es un icono de app).
4. Añadir una fila a la tabla de recursos y otra a la tabla de verificación.
5. Si la licencia exige atribución, incluir el aviso en este documento.
6. Probar con Playwright que el recurso carga sin errores ni peticiones externas.
