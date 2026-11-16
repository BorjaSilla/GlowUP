# Rutina diaria de GlowUp (la ejecuta Claude cada mañana)

Objetivo: que cada mañana el panel **GlowUp Leads** (https://claude.ai/artifact/DZVLeyhT5qAAVUzd8VD3gL) tenga hasta **20 tiendas nuevas** con su demo y su propuesta publicadas, revisadas con criterio y con el mensaje listo, más los seguimientos que tocan. La persona solo copia, envía y marca.

Reglas que no se saltan:
- **Nunca contactes a nadie.** No envíes emails, DMs ni formularios. Solo preparas; envía la persona.
- No pongas precios en ninguna página ni mensaje. El único contacto es WhatsApp (ya está en las plantillas).
- La garantía se escribe siempre así: «Si la conversión no sube, seguimos trabajando gratis».
- No cambies el `estado` de tiendas que ya estaban en el panel: eso lo decide la persona.
- No inventes datos (clientes, cifras, premios). Las cifras salen de las mediciones.
- No toques la landing ni las propuestas ya enviadas, salvo para arreglar algo roto.

## 0 · Preparar

```bash
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo glowup)"
git fetch origin claude/affectionate-turing-wyt60d && git checkout -B claude/affectionate-turing-wyt60d FETCH_HEAD
npm i --silent --prefix /tmp/lh lighthouse@12.8.2
export NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt LIGHTHOUSE_BIN=/tmp/lh/node_modules/.bin/lighthouse META_TOKEN=proxy
```

Playwright ya viene instalado: no lo instales (no hagas `npm i` dentro de `pipeline/`). El token de Meta y el de Netlify los pone el proxy del entorno (`META_TOKEN=proxy` es solo un valor de relleno).

Comprueba la red: `curl -sS -o /dev/null -w '%{http_code}' https://www.zara.com/` debe dar un código HTTP (no `000`), y `curl -sS -o /dev/null -w '%{http_code}' 'https://graph.facebook.com/v23.0/ads_archive?search_terms=cafe&ad_reached_countries=[%22ES%22]&fields=id&limit=1'` debe dar `200`. Si falla, salta al paso 6, escribe en el panel qué falta (red abierta o token de Meta en el entorno GlowUP) y termina.

## 1 · Buscar tiendas

Nicho del día (dos búsquedas por día):

| Día | Nichos |
|---|---|
| Lunes | moda, joyeria |
| Martes | cosmetica, hogar |
| Miércoles | moda, cafe |
| Jueves | gourmet, deporte |
| Viernes | moda, mascotas |

```bash
node pipeline/prospect.js meta --nicho <nicho1>,<nicho2> --top 30 --max 300
```

De `pipeline/out/leads-top.txt` (ya ordenada y sin las contactadas) quédate con las **20 mejores**. Antes de generar, descarta a mano las que claramente no encajan: marcas enormes con agencia (Zara, Mango, El Corte Inglés…), marketplaces, webs que no venden a España. Escríbelas en `/tmp/hoy.txt` (una URL por línea).

## 2 · Generar

```bash
node pipeline/glowup.js batch /tmp/hoy.txt
```

Unos 5 minutos por tienda. Si una falla, sigue con las demás y anótalo.

## 3 · Revisar como director de arte (lo importante)

Para cada tienda generada hoy, mira con la herramienta de lectura de imágenes:
`assets/shots/<slug>/home-before.jpg`, `m-home-before.jpg` (su web hoy) y `home-after.jpg`, `m-home-after.jpg`, `pdp-after.jpg` (la demo). Lee también `clients/<slug>.json` (`quality`, `style`, `copy`).

Entiende la marca: qué vende, a quién, qué tono usa (premium, desenfadado, técnico, artesanal…), qué foto o colección es la que más la representa. La demo debe sentirse **su** tienda, más bonita y más clara, no una plantilla.

Decide una de tres:
- **Descartar** si la demo se ve rota o pobre (sin fotos buenas, logo ilegible, colores que chocan), si la tienda no encaja (gran marca, no vende a España, catálogo casi vacío) o si su web ya es mejor que la demo. Pon en `clients/<slug>.json` → `"review": {"status": "descartada", "notes": "<por qué, en una frase>"}`.
- **Mejorar y aprobar**: edita `clients/<slug>.json`:
  - `copy.demo`: `heroTitle` (máx. 6 palabras, en su voz, en español), `heroText`, `newTitle`, `bestTitle`, `collectionsTitle`, `storyTitle`, `storyText` si aplica. Sin promesas inventadas.
  - `styleOverride`: `"editorial"` o `"producto"` solo si el elegido no le pega.
  - `copy.dm`: el DM de Instagram, 2–4 frases, de tú a tú, que demuestre que has mirado su tienda (nombra una colección, un producto o algo concreto de su web) y con el enlace a la propuesta (`https://glowup-studio-qryf.netlify.app/para/<slug>/`). Nada de «Estimado», nada de emojis en exceso.
  - `copy.followup1` y `copy.followup2`: seguimientos cortos que aporten algo nuevo (un dato de su velocidad, un detalle de la demo); el segundo cierra con la garantía.
  - `review`: `{"status": "aprobada", "notes": "<qué has cambiado y por qué, una frase>"}`.
  - Luego: `node pipeline/glowup.js refresh <slug>` si cambiaste `copy.demo` o el estilo (rehace demo y capturas, ~1–2 min), o `node pipeline/glowup.js render <slug>` si solo cambiaste mensajes.
- **Dejar para la persona** (`"status": "revisar"`) si dudas: mejor que lo vea ella que enviar algo flojo.

Una sola pasada de mejora por tienda; no entres en bucles.

## 4 · Publicar

```bash
node pipeline/deploy.js
```

## 5 · Llevar al panel

```bash
node pipeline/panel-rows.js <slug1> <slug2> …   # las generadas hoy (también las descartadas, para que no se repitan)
```

Lee el panel (`ArtifactData` → `list`, colección `leads`, `query.limit` 1000) y sube con `ArtifactData` → `batch` (máx. 50 por lote) **solo las tiendas que no existan aún**, con `op: "set"` y `file_path: pipeline/out/panel/<slug>.json`. Las que ya existan no se tocan.

## 6 · Resumen del día

Escribe el documento `meta/run` del panel (`ArtifactData` → `set`, pásale el `if_version` que leíste): `{"at": "<ISO ahora>", "summary": "<una o dos frases>"}`. Ejemplo: «Hoy: 64 anunciantes de moda y joyería revisados, 18 propuestas nuevas (14 listas, 3 para revisar, 1 descartada). Tienes 5 seguimientos pendientes.» Cuenta los seguimientos pendientes con los datos del panel (enviadas hace ≥3 días sin seguimiento, o 1.er seguimiento hace ≥4 días).

## 7 · Guardar

```bash
git add -A && git commit -m "Rutina <fecha>: <n> propuestas nuevas" && git push -u origin claude/affectionate-turing-wyt60d
```

Termina con un resumen de 3–5 líneas: cuántas tiendas, cuántas listas, problemas encontrados.
