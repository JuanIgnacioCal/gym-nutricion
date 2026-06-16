# Contexto para continuar el proyecto "gym-nutricion"

Pegá este mensaje completo al inicio de un chat nuevo (con otro modelo o chat) para que tenga todo el contexto necesario y pueda seguir trabajando sin perder nada.

---

## Qué es el proyecto

App de nutrición (PWA) pensada para venderse a gimnasios en modelo white-label. Cada gimnasio tiene su propia instancia con logo, colores y URL propios (`gym.config.json`). El socio configura sus calorías objetivo y la app le genera un plan diario de comidas con recetas reales ajustadas a sus macros.

**Stack:** Next.js 14 (App Router) · TypeScript estricto · Tailwind CSS · better-sqlite3 · lucide-react · recharts · bcryptjs · jsonwebtoken.

**Modelo de negocio:** setup inicial por gym + abono mensual. Una sola codebase, desplegada N veces con distinto `gym.config.json`.

**Mercado:** gimnasios pequeños/medianos en Argentina. Contenido (recetas, nombres, unidades) en español rioplatense.

**Deploy:** hay una instancia funcionando en Railway (filesystem persistente).

## Estructura del proyecto

```
gym-nutricion/
├── data/
│   ├── recetas.json          # 223 recetas con macros
│   └── ingredientes.json     # ~44 ingredientes curados con macros reales (USDA) + provenance
├── src/
│   ├── middleware.ts         # Protección de rutas por cookie de sesión
│   ├── app/
│   │   ├── api/{auth,buscar,config,favoritos,plan,recetas,registro}/   # auth = login·registro·logout·me
│   │   ├── alimento/         # "Buscar macros de un alimento"
│   │   ├── login/            # Inicio de sesión (nueva)
│   │   ├── buscar/, plan/, recetas/, registrar/, onboarding/
│   ├── components/           # incluye HamburgerMenu, AgregarRecetaModal, etc.
│   ├── lib/{auth,db,plan,recetas,usuario,util}.ts
│   └── types/index.ts
└── gym.config.json
```

## Reglas y convenciones (no negociables)

- TypeScript estricto. No usar `any` salvo inevitable y comentado.
- Colores siempre vía CSS variables (`var(--color-primario)`, etc.) — nunca hardcodeados. Esto es lo que permite el white-label.
- `gym.config.json` es la fuente de verdad de personalización.
- Endpoints de API siempre validan parámetros y devuelven status HTTP correcto.
- No agregar dependencias nuevas sin justificación.
- Al modificar el esquema de DB, actualizar también `src/types/index.ts`.
- **Cualquier dato de macros de un ingrediente debe ser REAL (de una fuente verificable como USDA), nunca inventado/alucinado por la IA.** Si se agrega un ingrediente nuevo, guardar también su `usda_fdcId` y `usda_descripcion` como rastro de auditoría (ver `data/ingredientes.json` como ejemplo).
- El usuario prefiere que se le hagan preguntas de aclaración antes de avanzar si algo no está claro, en vez de asumir.

## Última sesión de trabajo (2026-06-16): autenticación

1. **Página de login** (`src/app/login/page.tsx`, nueva) — formulario email+contraseña contra `/api/auth/login`, con branding del gym, manejo de errores, soporte de `?next=` para volver a la página pedida, y link a "Crear cuenta".
2. **Onboarding con contraseña real** (`onboarding/page.tsx`) — se agregó campo Contraseña (obligatoria, mín. 6); email+contraseña ahora son obligatorios; el registro manda la contraseña real (antes mandaba una aleatoria temporal que dejaba al usuario sin poder volver a entrar); si el email ya existe (409) redirige a `/login`; link "Ya tengo cuenta" en el paso 1.
3. **Middleware activado** (`src/middleware.ts`) — sin cookie `auth_token` redirige a `/login` (guardando la ruta en `?next=`). Públicas: `/login` y `/onboarding`. Excluye `/api`, `_next` y archivos con extensión. **Importante:** solo chequea que la cookie EXISTA, no su firma (corre en Edge y `jsonwebtoken` no es compatible). La firma se verifica en los endpoints (runtime Node).
4. **Limpieza** — se eliminó la función muerta `tieneAcento` en `api/buscar/route.ts`.

> Nota: el typecheck no se pudo correr verde en el sandbox por el retraso de sync de OneDrive (ver notas técnicas). Correr `npm run build` en la máquina local para el check definitivo.

## Sesión anterior: búsqueda en español, balance de macros, /alimento

1. **Búsqueda de ingredientes en español** — `/api/buscar` antes solo encontraba resultados buscando en inglés (USDA). Se creó `data/ingredientes.json` (base curada en español con macros reales + provenance USDA) y se hizo que `/api/buscar` la consulte primero (match parcial, sin distinguir acentos), recurriendo a USDA solo si hay menos de 3 resultados y a Open Food Facts si hay menos de 4. Esto también arregló la búsqueda dentro del modal "Agregar mi receta" porque usa el mismo endpoint.
2. **Balance completo de macros en el algoritmo de plan** (`src/lib/plan.ts`) — `ajustarPlan` ahora puntúa cada receta candidata contra las 4 macros (proteína ×1.2) y prueba todas las candidatas reales en cada iteración, quedándose con la que más reduce la desviación total del día. Se mantiene la lógica de no repetir recetas en 14 días y el rango ±40% de kcal por comida.
3. **Nueva función "Buscar macros de un alimento"** — página `/alimento` (solo búsqueda y registro/favorito de un alimento individual) + botón en el menú hamburguesa (`HamburgerMenu.tsx`, sección "Explorar").

## Estado de la deuda técnica (por prioridad)

### 1. Autenticación de usuarios [CRÍTICO] — ✅ implementado, falta endurecer
Hecho: tabla `usuarios` (bcrypt), JWT en cookie httpOnly (`lib/auth.ts`), endpoints `api/auth/{login,registro,logout,me}`, el onboarding crea el usuario en DB con contraseña real, `usuario.ts` lee con `getUserAsync()` → `/api/auth/me` (fallback localStorage), página `/login`, middleware activo.
**Pendiente de endurecer:** (a) auditar que `api/plan`, `api/favoritos` y `api/registro` verifiquen la cookie y no confíen en un `usuario_id` mandado por el cliente; (b) opcional: verificar la firma del JWT también en el middleware migrando a `jose` (hoy solo chequea presencia de cookie); (c) UI para cambiar contraseña.

### 2. Migrar DB a Supabase (PostgreSQL) [CRÍTICO solo para serverless] — ⏳ pendiente
`better-sqlite3` escribe en el filesystem local, que no persiste en plataformas serverless (ej. Vercel). En Railway (filesystem persistente) NO es urgente. Migrar a Supabase, mismo esquema de tablas, usar `@supabase/supabase-js` o `pg`. Cada gym con su propio proyecto Supabase (aislamiento de datos).

### 3. Recetas: agregar procedimiento/pasos de preparación [FUERA DE ALCANCE — lo maneja el usuario a mano, no tocar]

> Las antiguas deudas de **calculadora de calorías**, **no-repetición en 14 días** y **trigger de Open Food Facts** ya están implementadas (ver `CLAUDE.md`).

## Notas técnicas importantes para quien continúe

- El tipo canónico de resultado de búsqueda de alimentos es `AlimentoBusqueda`: `{ fuente: 'usda'|'openfoodfacts'|'receta', id, nombre, calorias, proteinas, carbohidratos, grasas, fibra, porcion }`. Cualquier nueva fuente de búsqueda debe normalizar a esta forma.
- El middleware solo verifica que la cookie de sesión EXISTA (corre en Edge). La autorización real (verificación de firma del JWT) la hacen los endpoints en runtime Node. No asumir que estar detrás del middleware = request autenticado a nivel API.
- Si trabajás en un sandbox/entorno con un mount de una carpeta OneDrive, tené en cuenta que puede haber **retraso de sincronización**: el mount puede mostrar una versión vieja o truncada de un archivo que recién se escribió por otra vía (herramienta de archivos vs. mount de shell). Si un typecheck o build falla con errores de sintaxis que no tienen sentido contra el código que se acaba de escribir, primero verificar el contenido real del archivo (tamaño en bytes/cantidad de líneas) antes de asumir que el código está mal. El check de build autoritativo es el de la máquina local.
- Hay un deploy ya funcionando en Railway de una versión anterior de esta app.
