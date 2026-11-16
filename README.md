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

## Pipeline automático (tiendas Shopify)

Una orden por tienda: extrae catálogo y marca, genera la demo (portada + ficha + carrito), mide y captura el antes/después, escribe la propuesta y deja el mensaje listo para enviar. Unos **4–5 minutos por tienda**, sin intervención.

### Requisitos (una vez)

- Node 20+ y Python 3 (opcional, solo para tools/).
- `cd pipeline && npm install && npx playwright install chromium`
- Red abierta: el pipeline visita cada tienda. Se ejecuta en tu ordenador, en un servidor o en GitHub Actions.

### Uso

```bash
node pipeline/glowup.js new pompeiibrand.com --slug pompeii   # una tienda
node pipeline/glowup.js batch tiendas.txt                      # una URL por línea (# = comentario)
node pipeline/glowup.js render pompeii                         # regenerar tras editar clients/pompeii.json
```

`--no-lighthouse` lo hace más rápido (sin medir velocidad). `GLOWUP_BASE_URL` cambia el dominio de los enlaces.

### Qué genera

| Ruta | Qué es |
|---|---|
| `demo/<slug>/` | La tienda rediseñada con su catálogo real (checkout real de Shopify vía permalink del carrito) |
| `para/<slug>/` | La propuesta: antes/después, móvil, velocidad, garantía, WhatsApp |
| `assets/shots/<slug>/` | Capturas y fotogramas de la carrera de carga |
| `clients/<slug>.json` | Datos de la propuesta + textos editables (`copy.pitch`, `copy.demo.*`) y estado de revisión |
| `pipeline/out/outreach/<slug>.md` | DM de Instagram y texto para formulario, listos para copiar |
| `pipeline/out/prospects.csv` | Registro de todas las tiendas y su estado |

### Flujo diario (20–50 propuestas)

1. **Lista**: apunta tiendas Shopify españolas en `tiendas.txt`.
2. **Generar**: `batch tiendas.txt` (deja el ordenador trabajando; ~50 tiendas ≈ 4 h, o en paralelo en varias máquinas).
3. **Revisar (2–5 min cada una)**: abre `para/<slug>/` y `demo/<slug>/`. Si un texto no encaja, edítalo en `clients/<slug>.json` y `render <slug>`. Descarta las que no salgan bien.
4. **Publicar**: commit + deploy.
5. **Enviar a mano** desde Instagram o el formulario de la web con el texto de `pipeline/out/outreach/<slug>.md` (no se envían emails automáticos: la LSSI lo prohíbe sin consentimiento).

### Límites conocidos

- Solo Shopify con `products.json` público (algunas tiendas lo bloquean → se saltan con error).
- Precios: se fuerza el mercado España (`localization=ES`) para que coincidan con los de la web.
- Los textos automáticos son genéricos si la tienda no tiene descripción en español; conviene revisarlos.

## Pendiente

- Email/WhatsApp real de contacto en `window.GLOW` (`index.html`, `para/teikit/index.html`).
- Conectar el formulario a un backend (p. ej. Supabase + Resend).
- Precio: no se publica (ni en la landing ni en la propuesta). Se da cerrado y por escrito tras una llamada de 20 min.
- Garantía: si la conversión no sube, seguimos trabajando gratis (no hay devolución).
