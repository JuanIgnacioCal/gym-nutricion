# Traspaso para continuar — gym-nutricion (junio 2026)
_Pegá esto al inicio de un chat nuevo para seguir sin perder contexto._

## Qué es
PWA white-label de nutrición para gimnasios: se vende a cada gym con su marca (logo/colores/nombre vía `gym.config.json`). El socio configura su objetivo y la app le arma un **plan diario** de comidas con recetas reales ajustadas a sus macros.
**Stack:** Next.js 14 (App Router) · TypeScript estricto · Tailwind · better-sqlite3 · lucide-react · recharts · bcryptjs · jsonwebtoken.
**Deploy:** Railway (proyecto "comfortable-liberation", servicio "gym-nutricion", URL `gym-nutricion-production.up.railway.app`). Repo GitHub: `JuanIgnacioCal/gym-nutricion` (branch `main`). Railway redeploya solo al hacer push.

## Cómo se sube el código (lo hace el USUARIO en su Windows)
El asistente NO puede pushear (sin credenciales de GitHub + riesgo de truncamiento de OneDrive). El usuario, en la CMD parado en la carpeta del proyecto:
```
del /f /q .git\index.lock      :: por si OneDrive dejó el lock
npm run build                   :: chequeo autoritativo
git add -A
git commit -m "..."
git push
```
Railway redeploya solo. El push debe mostrar un commit nuevo (ej. `abc1234..def5678`).

## Estado de PRODUCCIÓN (lo que YA está deployado)
Commit en prod: **23a81c3** "seguridad: auth en endpoints API". Incluye:
- **IDOR cerrado:** `api/plan`, `plan/cambiar`, `favoritos`, `registro` derivan `usuario_id` de `getSesion()` (sesión), y los DELETE chequean dueño.
- **Persistencia:** `db.ts` usa `DATABASE_PATH`; Railway tiene un **Volume en `/data`** + `DATABASE_PATH=/data/gym-nutrition.db`. **VERIFICADO:** la DB sobrevive redeploys (probado con marcador en `/data` que sobrevive a un redeploy real).
- 223+20 recetas (commit 3c38cff).
Railway: `JWT_SECRET` fuerte seteado, `USDA_API_KEY` OK. **Plan TRIAL** (se pausa solo → pasar a plan pago antes de meter clientes reales).

## ⚠️ CAMBIOS HECHOS PERO SIN PUSHEAR (el usuario los sube en un batch)
Todo esto está en la carpeta **sin commitear**. Falta `npm run build` + commit + push:
1. **Receta duplicada id 200 borrada** (`data/recetas.json`, 243→242 entradas, id único).
2. **C1:** `lib/auth.ts` — `JWT_SECRET` sin fallback inseguro (revienta si falta, no firma con secreto público).
3. **C2:** `api/recetas` POST exige sesión (antes cualquiera inyectaba recetas al pool de todos).
4. **Plan: variedad + escalado automático de porciones** — archivos: `lib/plan.ts`, `api/plan/route.ts`, `types/index.ts` (campo `escala?`), `app/plan/page.tsx`, `components/MealSlot.tsx`, `components/RecipeDetailModal.tsx`. La selección elige **al azar entre todas las candidatas en ±40% kcal** (variedad) y cada receta se **escala (×factor, clamp 0.5–1.75)** para pegar los 4 macros del día penalizando pasarse (proteína prioritaria). `generarPlan` prueba 8 combinaciones y se queda con la mejor; el escalado se aplica al leer (`escalarPlan`). Validado por simulación: 95–103% por macro, con variedad. La UI muestra "Porción ×1.3" y los totales caen ~100%.
5. **T3:** botón "✓ Comí esto" en cada tarjeta del plan (`MealSlot.tsx` + `plan/page.tsx`) que registra la receta con macros escalados y refresca los totales del día.
6. **Fixes auditoría:** M1 (validar `receta_id` en PATCH plan), M2 (acotar `limite` 1–500 en GET recetas), M4 (login resistente a timing con hash dummy), B2 (id estable en Open Food Facts, sin `Math.random`), B3 (`clearAuthCookie` con `secure`/`sameSite`).
7. **Docs nuevos:** `PLAN_DE_MEJORAS.md`, `DOCUMENTO_DE_PRUEBAS.md`, `PITCH_VENTA_OVERALL.md` y `.pptx`, este `TRASPASO_CONTINUACION.md`.

## Lo que SIGUE (en orden)
**El asistente lo puede hacer solo:**
- **Disclaimer legal** ("orientación nutricional, no reemplaza consejo médico") + aviso de privacidad (Ley 25.326 AR). Mostrarlo en el onboarding + nota persistente. (Sell-blocker, barato.)
- **Panel del dueño:** lista de socios, socios activos (últimos 7/30 días) y uso. Identificar al dueño con `ownerEmail` en `gym.config.json` + guard de ruta. Usar `recharts` (instalado, sin uso). **Es el #1 argumento de venta** (el dueño no ve nada hoy, y "socios activos" es la métrica de cobro).

**BLOQUEADO (necesita decisión/cuenta del usuario):**
- **Reset de contraseña:** requiere servicio de email (recomendado **Resend**, free tier) → el usuario debe crear cuenta + API key. Interino sin email: que el dueño resetee desde el panel.
- **Buscador T4:** faltan alimentos comunes (ej. "cebolla" no aparece). Base curada `ingredientes.json` (~46 items) + USDA en inglés. Plan: expandir con **Argenfoods/SARA** (argentino, español, **macros reales — REGLA: nunca inventar**) y sacar USDA del camino en vivo (curada → Open Food Facts). Necesita elegir/conseguir la fuente.
- **Mercado Pago:** necesita cuenta del usuario.

**Deseable (retención, después del primer "sí"):** seguimiento de progreso (peso + recharts), lista de compras del plan, restricciones dietarias en el PLAN (hoy solo filtran el catálogo), notificaciones push.
**Otros:** A2 (middleware verificar firma JWT con `jose` — agrega dep), B1 (limpiar `usuario_id` vestigial del cliente — cosmético), Railway plan pago.

## Reglas del proyecto (no negociables)
- TS estricto, sin `any` salvo inevitable y comentado.
- Colores SIEMPRE vía CSS vars (`var(--color-primario)`…), nunca hardcodeados (es lo que permite el white-label).
- `gym.config.json` = fuente de verdad de la personalización.
- Endpoints: validar params, status HTTP correcto, y **derivar `usuario_id` de `getSesion()`, NUNCA del cliente**.
- Macros de ingredientes/recetas SIEMPRE reales y verificables (USDA/Argenfoods), **nunca inventados**. Guardar la fuente (`usda_fdcId`).
- Al cambiar el esquema de DB, actualizar `types/index.ts`. No agregar deps sin justificación.

## ⚠️ Notas técnicas CRÍTICAS del entorno (clave para no perder tiempo)
- **OneDrive + sandbox:** el bash del sandbox ve versiones **TRUNCADAS** de archivos recién escritos → `tsc`/`build` tiran errores de sintaxis **FALSOS** (ej. "JSX element has no corresponding closing tag", "unterminated string") en archivos recién editados. NO asumir que el código está roto: verificar el contenido real con la herramienta **Read** (autoritativa) o esperar a que sincronice. El chequeo autoritativo es **`npm run build` LOCAL del usuario**.
- El asistente **NO puede correr la app** (better-sqlite3 compilado para Windows + OneDrive). Validar algoritmos con simulaciones standalone en Node usando `git show HEAD:data/recetas.json` (íntegro, no el working tree truncado).
- El asistente **NO crea cuentas ni carga contraseñas** en formularios (regla de seguridad), ni para testear. Los flujos con login los prueba el usuario (ver `DOCUMENTO_DE_PRUEBAS.md`). La persistencia se verifica por la **Console de Railway** (el contenedor corre como root; DB en `/data/gym-nutrition.db`).
- Git desde sandbox: **NO pushear** desde el sandbox (sin creds + truncamiento). Solo lectura con `git show`/`git log`.

## Docs del repo a leer según necesidad
`PLAN_DE_MEJORAS.md` (pendientes priorizados) · `DOCUMENTO_DE_PRUEBAS.md` (QA manual) · `CLAUDE.md` (instrucciones del repo) · `PITCH_VENTA_OVERALL.md`/`.pptx` (venta al gym "Overall" de Tucumán) · `GUIA_RECETAS.md` (sumar recetas con macros reales).

## Preferencias del usuario (Juan Ignacio)
- Principiante usando IA para generar ingresos con apps/webs/automatizaciones. Explicar **claro, sin asumir nivel avanzado**.
- **Directo y compacto**, sin relleno.
- **NO darle la razón por defecto:** si algo está mal/ineficiente o hay mejor camino, decírselo **antes** de avanzar. Frenarlo si se adelanta o "se va por las nubes" sin resolver lo primario primero.
- Antes de una tarea grande, si falta info que cambia el resultado, hacer **hasta 3 preguntas juntas** y después ejecutar.
- **Verificar datos del mundo actual** (buscar) en vez de asumir, sobre todo cosas que cambian con el tiempo.
