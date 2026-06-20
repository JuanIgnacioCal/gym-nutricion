# Traspaso para continuar — gym-nutricion (próxima tarea: PANEL DEL DUEÑO)

> Pegá esto al inicio de un chat nuevo. La próxima tarea es **el panel del dueño**, y querés que **primero me lo expliques con un artefacto interactivo** (un mockup navegable) antes de programarlo.

---

## Qué es el proyecto

PWA white-label de nutrición para gimnasios: se vende a cada gym con su marca (logo/colores/nombre vía `gym.config.json`). El socio configura su objetivo y la app le arma un plan diario de comidas con recetas reales ajustadas a sus macros.

- **Stack:** Next.js 14 (App Router) · TypeScript estricto · Tailwind · better-sqlite3 · lucide-react · recharts · bcryptjs · jsonwebtoken.
- **Deploy:** Railway (servicio `gym-nutricion`, URL `gym-nutricion-production.up.railway.app`). Filesystem persistente vía un Volume en `/data` (`DATABASE_PATH=/data/gym-nutrition.db`). Railway redeploya solo al hacer push.
- **Repo:** GitHub `JuanIgnacioCal/gym-nutricion`, branch `main`.

## Cómo se sube el código (lo hace el USUARIO, en su Windows con PowerShell)

El asistente NO puede pushear. El usuario, parado en la carpeta del proyecto:

```powershell
npm run build        # chequeo autoritativo
git add -A
git commit -m "..."
git push
```

(Si alguna vez aparece un lock de git: `Remove-Item -Force .git\index.lock -ErrorAction SilentlyContinue`. NO usar `del /f /q`, eso es de CMD y falla en PowerShell.)

---

## Estado actual (todo lo hecho en los chats anteriores)

**Escalado de porciones de recetas:** helper `escalarIngrediente(texto, factor)` en `src/lib/util.ts` que escala la cantidad de cada ingrediente al factor de porción del plan (g/ml a entero, cucharadas/tazas a ¼, conteos a ½; no toca condimentos sin cantidad). `RecipeDetailModal.tsx` ya lo usa y muestra "cantidades ya ajustadas a tu porción".

**Editar objetivo / recalcular calorías (Fase 1):**
- `src/lib/calorias.ts` (nuevo): `calcularTDEE` (Mifflin-St Jeor) + factores + opciones (sexo/actividad/objetivo). El onboarding lo importa de ahí.
- `src/app/api/auth/me/route.ts`: además del `GET`, ahora tiene `PUT` que **persiste** objetivo + datos_fisicos + nombre + tema en la DB (deriva el usuario de la sesión).
- `src/components/HamburgerMenu.tsx`: editar objetivos ahora **guarda en la DB** (antes solo localStorage = bug, se perdía al recargar). Sumé el panel plegable **"Recalcular desde mis datos"** (peso/altura/edad/actividad/objetivo → recalcula). El email quedó como **solo lectura** (es el usuario de login).

**Búsqueda de alimentos en español (Fase 2):**
- `src/app/api/buscar/route.ts`: se **sacó USDA** del camino en vivo (era inglés y para queries en español casi no servía). Quedó: base curada (español) → Open Food Facts (español, `lc=es`, prioriza `product_name_es`).
- `data/ingredientes.json`: base curada de macros REALES por ingrediente, en español, con `usda_fdcId` + `usda_descripcion` para auditar. Tiene **70 ingredientes** (se sumaron verduras y staples: cebolla, tomate, ajo, morrón, zapallito, lechuga, espinaca, zapallo, pepino, arvejas, cebolla de verdeo, quinoa, leche entera, maní, mozzarella, durazno, pera, etc.).
- ⚠️ Canal de sourcing de USDA: se usaba el endpoint desplegado (con la `USDA_API_KEY`) para sacar macros reales con su `fdcId`. Al sacar USDA del buscador, ese canal quedó cerrado. Para sumar más ingredientes con `fdcId` exacto hay que ver de dónde sacarlos (quedó pendiente la "tanda 2": poroto, dulce de leche, más frutas/verduras). Regla: NUNCA inventar macros.

**Recetas nuevas — desayunos/meriendas (Fase 3):** se sumaron **28 recetas** (ids 244-271), `origen: "local"`, `tipo_comida: "desayuno/merienda"`, con macros REALES calculados desde `ingredientes.json` y **pasos de preparación**. Espectro de calorías: 18 de 466-555 kcal (déficit/mantenimiento) + 10 de 633-752 kcal (volumen). Con esto desayuno/merienda pasó de 59 a **87 recetas**.
- ⚠️ **Mecanismo clave que se corrigió:** la tabla `recetas` NO tiene columna `pasos`. Los pasos se sirven desde `data/pasos.json` (mapa por id de receta), que `src/lib/recetas.ts` (`rowToReceta`) mergea al leer. Las nuevas recetas tienen sus pasos en `pasos.json` (ids 244-271).
- ⚠️ **`src/lib/seed.ts` ahora es idempotente:** antes sembraba solo si la DB estaba vacía (`if count>0 return`) → en Railway las recetas nuevas nunca se habrían insertado. Ahora siempre hace `INSERT OR IGNORE` de todo `recetas.json` (suma las nuevas, ignora las existentes) y solo traduce/reemplaza en seed fresco.
- 🧹 Deuda menor inofensiva: las recetas 244-261 tienen los `pasos` también DENTRO de `recetas.json` (el código los ignora; la fuente real es `pasos.json`). Se puede limpiar.

**Estado de push:** verificá con el usuario si ya pusheó el último lote (recetas 262-271 + pasos). Commit sugerido si falta: `recetas: +10 desayunos altos (600-800 kcal) con pasos`.

---

## ⚠️ Notas críticas del entorno (para no perder tiempo)

- **OneDrive + sandbox:** el bash del sandbox ve versiones TRUNCADAS de archivos recién escritos → `JSON.parse`/`tsc`/`build` tiran errores FALSOS (ej. "Unexpected end of JSON input", "Unterminated string"). NO asumir que el archivo está roto: **verificar con la herramienta `Read` (autoritativa)** o esperar a que sincronice. El chequeo final real es el `npm run build` LOCAL del usuario.
- El asistente **no puede correr la app** (better-sqlite3 compilado para Windows + OneDrive). Validar algoritmos con simulaciones standalone en Node, leyendo datos íntegros con `git show HEAD:data/archivo.json`.
- El asistente **no pushea ni crea cuentas / carga contraseñas**. Los flujos con login los prueba el usuario.
- Para editar archivos JSON grandes (`recetas.json` ~7200 líneas): usar `Edit` anclando en un texto único del final (ej. el último objeto + `]`), NO reescribir el archivo entero por bash (riesgo de sync de OneDrive).

---

## PRÓXIMA TAREA — Panel del dueño del gym

**Objetivo:** que el dueño del gimnasio vea, desde su propia cuenta, cómo usan la app sus socios. Es el **#1 argumento de venta**: hoy el dueño no ve NADA, y "socios activos" es la métrica con la que se cobra el abono mensual.

### 🎯 Empezá por acá (lo que pidió el usuario)
**ANTES de programar nada, explicame cómo funcionaría el panel con un ARTEFACTO INTERACTIVO** — un mockup navegable (HTML) del panel, con datos de ejemplo, para que vea el layout, las métricas y los gráficos y lo apruebe o ajuste. Recién con el OK, implementarlo conectado a la DB real.

### Qué mostraría (propuesta, ajustable en el mockup)
- **KPIs arriba:** total de socios · activos últimos 7 días · activos últimos 30 días · altas del mes.
- **Gráfico de uso en el tiempo** (con `recharts`, ya instalado y sin usar): planes generados y/o comidas registradas por día o semana.
- **Tabla de socios:** nombre, email, fecha de alta, último día activo, objetivo (kcal). Ordenable.
- *(Opcional)* distribución de objetivos (bajar/mantener/subir) y calorías promedio.

### Cómo se define "socio activo"
Tiene actividad reciente en la DB: una fila en `plan_diario` (generó plan) o en `registro_diario` (registró comida) con `fecha` dentro de los últimos N días. **Esos datos ya existen.**

### Identificación del dueño (white-label)
Agregar `ownerEmail` en `gym.config.json`. El panel (página + endpoint) solo es accesible si la sesión (`getSesion()`) tiene `email === ownerEmail`; si no, redirigir o devolver 403. El `middleware.ts` actual solo chequea que exista la cookie, así que la verificación de "dueño" va en la página/endpoint (runtime Node).

### Backend
Endpoint nuevo (ej. `GET /api/panel`) que, verificando que el solicitante es el dueño, agrega las métricas con SQL sobre `usuarios` / `plan_diario` / `registro_diario` y las devuelve. **Derivar identidad SIEMPRE de `getSesion()`, nunca de un parámetro del cliente.**

### Ruta y acceso
Ej. `/panel`, protegida. Mostrar el acceso al panel en el menú (HamburgerMenu) solo si el usuario logueado es el dueño.

### Tablas disponibles (esquema en `src/lib/db.ts`)
- `usuarios` (id, nombre, email, objetivo_calorias/proteinas/carbohidratos/grasas/comidas, tema, datos_fisicos, created_at)
- `plan_diario` (usuario_id, fecha, desayuno_id, almuerzo_id, merienda_id, cena_id, created_at)
- `registro_diario` (usuario_id, fecha, tipo_comida, calorias…, created_at)
- `favoritos`, `recetas`

---

## Reglas del proyecto (no negociables)

- TS estricto, sin `any` salvo inevitable y comentado.
- Colores SIEMPRE vía CSS vars (`var(--color-primario)`…), nunca hardcodeados (es lo que permite el white-label). Gráficos de recharts también con CSS vars.
- `gym.config.json` = fuente de verdad de la personalización.
- Endpoints: validar params, status HTTP correcto, y derivar `usuario_id`/identidad de `getSesion()`, NUNCA del cliente.
- Macros de ingredientes/recetas SIEMPRE reales y verificables (USDA/Argenfoods), nunca inventados; guardar la fuente (`usda_fdcId`).
- Al cambiar el esquema de DB, actualizar `src/types/index.ts`. No agregar deps sin justificación (recharts ya está).

## Preferencias del usuario (Juan Ignacio)

- Principiante usando IA para generar ingresos con apps/webs. Explicar claro, sin asumir nivel avanzado.
- Directo y compacto, sin relleno.
- NO darle la razón por defecto: si algo está mal/ineficiente o hay mejor camino, decírselo ANTES de avanzar.
- Antes de una tarea grande, si falta info que cambia el resultado, hacer hasta 3 preguntas juntas y después ejecutar.
- Verificar datos del mundo actual (buscar) en vez de asumir, sobre todo lo que cambia con el tiempo.

## Pendientes después del panel (orden sugerido del plan original)

1. **Plan semanal** (hoy es diario) — base para la lista de compras.
2. **Integración con la app de lista de compras del usuario** (es de él). Faltan 3 datos: ¿su app tiene endpoint HTTP y qué auth?, ¿cómo se identifica el mismo usuario en ambas apps?, ¿guarda cantidades estructuradas o texto libre? El plan: juntar los ingredientes de la semana, sumarlos y redondearlos (g/kg), pushearlos a su lista, con toggle en el menú + notificación.
3. **Disclaimer legal + aviso de privacidad** (Ley 25.326 AR) en onboarding y como nota persistente (sell-blocker barato).
4. **Tanda 2 de ingredientes** (depende de reabrir un canal de sourcing de macros reales con fdcId).
5. Estructurar los ingredientes de las recetas como `{nombre, cantidad, unidad}` (hoy texto libre): destraba la lista de compras y los filtros dietarios.
6. Pasar Railway de plan TRIAL a pago antes de meter clientes reales (se pausa solo).

Docs útiles en el repo: `PLAN_v2_FUNCIONES.html` (este plan completo), `CLAUDE.md`, `GUIA_RECETAS.md`, `DOCUMENTO_DE_PRUEBAS.md`.
