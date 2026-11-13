# GlowUp

Rediseñamos webs de e-commerce **antes** de venderlas: la tienda recibe un enlace con su web nueva funcionando, la comparativa antes/después y una propuesta con precio cerrado y garantía.

## Estructura

```
/                     Landing de GlowUp
/para/<cliente>/      Propuesta personalizada (estructura tipo 224: por qué, carrera de carga, comparativas
                      de página completa, móviles, pedido, garantía con contrato, pasos, calculadora)
/demo/<cliente>/      La web rediseñada del cliente (vista previa, noindex)
/assets/              Design system compartido (glow.css, glow.js, logo, capturas)
/tools/               Scripts del pipeline (captura, métricas, extracción de catálogo, QA)
```

Todo es HTML/CSS/JS estático, sin build. Se despliega tal cual en Vercel (`vercel.json`: URLs limpias y `noindex` en `/para` y `/demo`).

## Primer caso: Teikit (sushi, 26 locales)

| Métrica (Lighthouse móvil) | teikit.es hoy | Glow up |
|---|---|---|
| Rendimiento | 67 | 99 |
| Accesibilidad | 85 | 99 |
| Buenas prácticas | 96 | 100 |
| LCP portada | 6,7 s | 1,7 s |
| Peso portada | 15,5 MB | 1,8 MB |

La carta (79 platos), los locales (26) y las fotos se extraen de la web actual con `tools/extract-menu.py`.

## Pipeline (hacia la automatización)

1. **Encontrar** tiendas candidatas (pendiente: scraper de directorios / Shopify stores).
2. **Capturar** la web actual: `node tools/capture-site.js <url> <salida>` (captura + texto + DOM).
3. **Medir**: `node tools/perf.js <url>` y Lighthouse para la línea base.
4. **Extraer catálogo** (productos, precios, fotos) → `demo/<cliente>/data/*.js`.
5. **Rediseñar** con el design system (`assets/glow.css`) y una plantilla por vertical.
6. **Comparar**: `node tools/capture-teikit.js <out> <demoUrl>` + `python3 tools/crop-shots.py <out> assets/shots/<cliente>` (portada y carta de página completa, pedido, locales, móvil) y `node tools/filmstrip.js <url> <out>` para la carrera de carga.
7. **QA**: `node tools/qa.js <url> <out> desktop|mobile` (errores de consola, overflow, capturas).
8. **Publicar** `/para/<cliente>` + `/demo/<cliente>` y **enviar** el enlace (email / Instagram).

## Pendiente

- Email/WhatsApp real de contacto en `window.GLOW` (`index.html`, `para/teikit/index.html`).
- Conectar el formulario a un backend (p. ej. Supabase + Resend).
- Validar precio de la landing (1.900 €). La propuesta no muestra precio (se da en la llamada).
- Garantía: si la conversión no sube, seguimos trabajando gratis (no hay devolución).
