# Contexto para continuar el proyecto "gym-nutricion"

Pegá este mensaje completo al inicio de un chat nuevo para que tenga todo el contexto y pueda seguir sin perder nada. (Actualizado: 2026-06-17.)

---

## Qué es el proyecto

App de nutrición (PWA) white-label para venderse a gimnasios. Cada gym tiene su instancia con logo, colores y URL propios (`gym.config.json`). El socio configura sus calorías objetivo y la app le genera un plan diario de comidas con recetas reales ajustadas a sus macros.

**Stack:** Next.js 14 (App Router) · TypeScript estricto · Tailwind CSS · better-sqlite3 · lucide-react · recharts · bcryptjs · jsonwebtoken.

**Modelo de negocio:** setup inicial por gym + abono mensual por cantidad de socios activos. Una sola codebase, desplegada N veces con distinto `gym.config.json`.

**Mercado:** gimnasios chicos/medianos de Argentina. Contenido (recetas, nombres, unidades) en español rioplatense.

**Deploy:** funcionando en Railway → `gym-nutricion-production.up.railway.app`. Repo GitHub: `JuanIgnacioCal/gym-nutricion` (branch `main`). Railway reconstruye solo al hacer push (nixpacks: `npm ci` → `npm run build` → `npm start`).

---

## Estructura del proyecto

```
gym-nutricion/
├── data/
│   ├── recetas.json          # 223 recetas con macros (fuente de verdad)
│   ├── pasos.json            # Pasos de preparación por id de receta
│   └── ingredientes.json     # 46 ingredientes curados, macros reales USDA + provenance
├── src/
│   ├── middleware.ts         # Protección de rutas por cookie de sesión
│   ├── app/
│   │   ├── api/{auth,buscar,config,favoritos,plan,recetas,registro}/   # auth = login·registro·logout·me
│   │   ├── alimento/         # "Buscar macros de un alimento"
│   │   ├── login/            # Inicio de sesión
│   │   ├── buscar/, plan/, recetas/, registrar/, onboarding/
│   ├── components/           # RecipeDetailModal, HamburgerMenu, AgregarRecetaModal, etc.
│   ├── lib/{auth,db,plan,recetas,usuario,util}.ts
│   └── types/index.ts
└── gym.config.json
```

---

## Reglas y convenciones (no negociables)

- TypeScript estricto. No usar `any` salvo inevitable y comentado.
- Colores siempre vía CSS variables (`var(--color-primario)`, etc.) — nunca hardcodeados. Es lo que permite el white-label.
- `gym.config.json` es la fuente de verdad de personalización.
- Endpoints de API: validar parámetros y devolver status HTTP correcto.
- No agregar dependencias sin justificación.
- Al cambiar el esquema de DB, actualizar también `src/types/index.ts`.
- **Macros de un ingrediente/receta: SIEMPRE reales y verificables (USDA/Argenfoods/calculadora), nunca inventados por la IA.** Guardar la fuente (`usda_fdcId`) cuando se agregue un ingrediente.
- Preferir preguntar antes de avanzar si algo no está claro, en vez de asumir.

---

## Estado actual (qué está HECHO)

- **Autenticación completa:** tabla `usuarios` (email + `password_hash` bcrypt), JWT en cookie httpOnly (`lib/auth.ts`), endpoints `api/auth/{login,registro,logout,me}`, página `/login`, onboarding que crea el usuario en DB con contraseña real (email+contraseña obligatorios), y middleware de protección activo. El cliente lee el perfil con `getUserAsync()` → `/api/auth/me` (fallback localStorage para sesiones viejas).
- **Calculadora de calorías** en el onboarding (Mifflin-St Jeor; pide peso, altura, edad, sexo, actividad, objetivo; macros 30/40/30, editable).
- **Plan diario** que balancea las 4 macros (no solo calorías), no repite receta en el día ni en los últimos 14 días por slot, rango ±40% kcal por comida.
- **Búsqueda de alimentos en español:** consulta primero `ingredientes.json`, luego USDA (si <3), luego Open Food Facts (si <4).
- **Página `/alimento`** para buscar macros de un alimento individual.
- **Pasos de preparación en las 223 recetas:** viven en `data/pasos.json` por id; se mergean al cargar la receta (`rowToReceta` en `lib/recetas.ts`) y se muestran como pasos numerados en `RecipeDetailModal.tsx`. Antes mostraban un texto genérico; eso ya quedó resuelto.

---

## Sesiones de trabajo recientes

**Sesión auth (2026-06-16):** se creó la página `/login`, se agregó contraseña real obligatoria al onboarding (antes mandaba una aleatoria temporal), se activó el middleware (chequea presencia de cookie) y se limpió código muerto (`tieneAcento` en `api/buscar`).

**Sesión recetas (2026-06-17):** se agregó el campo `pasos` al esquema, se creó `data/pasos.json` con los pasos de las 223 recetas (rioplatense), y se conectó a la app para que se vean en el modal de cada receta. Se generó también un sistema (prompt reutilizable) para sumar recetas nuevas con macros reales sin repetir.

---

## Documentación del proyecto (leer según necesidad)

- `CLAUDE.md` — instrucciones y estado para agentes que trabajen en el repo.
- `ROADMAP.md` — todo lo que falta, priorizado (tiers 1-4 + recetas + base de macros).
- `GUIA_RECETAS.md` — cómo sumar recetas con macros reales: workflow, prompts para IA, fuentes y plantilla JSON.
- `COMO_ACTUALIZAR.md` — paso a paso para desplegar (build → commit → push → Railway).
- `PROMPT_TRASPASO.md` — este archivo.

---

## Cómo se actualiza la app (resumen)

En la terminal, parado en la carpeta del proyecto: `npm run build` → `git add -A` → `git commit -m "..."` → `git push`. Railway redeploya solo. (Detalle completo en `COMO_ACTUALIZAR.md`.) Nota: la carpeta está en OneDrive; si git se queja de `.git/index.lock`, borrar los `*.lock` de `.git` y reintentar.

---

## Cosas a mejorar / deuda técnica (por prioridad)

### Antes de cobrarle a un gym real (CRÍTICO)
1. **Persistencia de datos en Railway.** `gym-nutrition.db` (SQLite) está gitignored y se regenera del seed. El filesystem de Railway NO persiste entre deploys salvo que haya un **Volume** montado donde vive la DB. Sin Volume, cada deploy borra a todos los usuarios. CONFIRMAR que haya Volume; si no, montarlo o migrar a Supabase.
2. **Seguridad de las API.** Auditar que `api/plan`, `api/favoritos` y `api/registro` verifiquen la cookie de sesión y NO confíen en un `usuario_id` mandado por el cliente (hoy un socio podría leer datos de otro).
3. **Variables de entorno en Railway:** `JWT_SECRET` (largo y secreto) y `USDA_API_KEY`. Si falta `JWT_SECRET`, el código cae a un default inseguro.
4. **Reset/cambio de contraseña:** falta UI y flujo; hoy si un socio olvida la contraseña queda afuera.
5. **Disclaimer + privacidad:** "es orientación nutricional, no consejo médico" + política de datos (Ley 25.326 AR).

### Funcionalidad / calidad
6. **Buscador de alimentos.** `ingredientes.json` tiene solo 46 items y el fallback USDA es en inglés → "cebolla", "zapallito" y productos argentinos no aparecen. Recomendación: expandir `ingredientes.json` desde Argenfoods/SARA (argentino, español, gratis) con un script que parsea el Excel → JSON con provenance, y arreglar el orden a curada → Open Food Facts (sacar USDA del camino en vivo). Detalle/justificación en `ROADMAP.md`.
7. **id 200 duplicado** en `recetas.json` (dos recetas comparten el id 200). Renumerar una a un id libre (224+). Las recetas nuevas deben usar ids desde 224 y agregar sus pasos a `data/pasos.json`.
8. **Migrar a Supabase (PostgreSQL):** solo necesario si se mueve a Vercel u otro serverless. En Railway con Volume, no urgente.

### Lado del comprador (lo que habilita vender y facturar)
9. **Panel del dueño del gym:** lista de socios, socios activos (métrica de cobro) y uso.
10. **Alta de gyms más simple** (hoy cada gym = deploy manual con su `gym.config.json`).

### Retención del socio
11. **Seguimiento de progreso:** peso en el tiempo + gráficos (`recharts` ya está instalado y sin usar) + racha de adherencia.
12. **Lista de compras del plan** (datos ya existen).
13. **Restricciones dietarias en el PLAN** (hoy el filtro "vegetariano" existe solo en el catálogo, el plan no las respeta).
14. **Notificaciones push** (recordatorios; iOS más complejo).

### Cobranza
15. **Mercado Pago** para el abono (cuando haya gyms confirmados).

---

## Notas técnicas importantes

- **Pasos de recetas:** viven en `data/pasos.json` con forma `{ "pasos": { "<id>": [..] } }`. NO van dentro de `recetas.json` (la tabla de DB no tiene columna de pasos; se mergean al leer). Cualquier receta nueva debe agregar sus pasos ahí por id.
- **Macros reales:** regla de oro del proyecto. Para recetas nuevas, calcular los macros sumando valores reales por ingrediente (USDA/Argenfoods/calculadora tipo Cronometer/Verywell), nunca inventarlos.
- **Tipo canónico de búsqueda de alimentos:** `AlimentoBusqueda` = `{ fuente:'usda'|'openfoodfacts'|'receta', id, nombre, calorias, proteinas, carbohidratos, grasas, fibra, porcion }`. Toda fuente nueva debe normalizar a esa forma.
- **Middleware:** corre en Edge y solo verifica que la cookie `auth_token` EXISTA, no su firma (`jsonwebtoken` no es compatible con Edge). La firma se verifica en los endpoints (runtime Node). Si se quiere verificar firma en el middleware, migrar a `jose`.
- **Bases de datos de alimentos (investigado):** MyFitnessPal no tiene API pública; FatSecret gratis es solo US/inglés (español/Argentina es pago); USDA es inglés; Open Food Facts es gratis y bueno para productos de marca; Argenfoods/SARA son tablas argentinas reales pero en Excel/PDF. Por eso conviene tener base curada propia.
- **OneDrive + sandbox:** la carpeta está sincronizada por OneDrive; un mount de shell puede mostrar versiones truncadas de archivos recién escritos. Si un build/typecheck falla con errores de sintaxis raros, verificar el contenido real del archivo antes de asumir que el código está mal. El build autoritativo es el de la máquina local.
```
