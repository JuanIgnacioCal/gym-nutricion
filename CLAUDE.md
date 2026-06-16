# Proyecto: App de Nutrición para Gimnasios (White-Label PWA)

## Qué es esto

Progressive Web App de nutrición personalizada pensada para venderse a gimnasios en modelo white-label. Cada gimnasio tiene su propia instancia con logo, colores y URL propios. El socio del gym configura sus calorías objetivo y la app le genera un plan diario con recetas reales ajustadas a sus macros.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · better-sqlite3 · lucide-react · recharts · bcryptjs · jsonwebtoken

**Modelo de negocio:** setup inicial por gym + abono mensual. Una sola codebase, desplegada N veces con distinto `gym.config.json`.

---

## Estructura del proyecto

```
gym-nutricion/
├── data/
│   ├── recetas.json          # 223 recetas con macros (fuente de verdad)
│   └── ingredientes.json     # ~44 ingredientes curados, macros reales USDA + provenance
├── public/
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker
├── src/
│   ├── middleware.ts         # Protección de rutas por cookie de sesión (auth)
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/         # login · registro · logout · me (JWT + cookie httpOnly)
│   │   │   ├── buscar/       # Búsqueda: ingredientes.json → USDA → Open Food Facts
│   │   │   ├── config/       # Lee gym.config.json
│   │   │   ├── favoritos/    # CRUD favoritos
│   │   │   ├── plan/         # Genera y modifica el plan diario
│   │   │   ├── recetas/      # Lista recetas
│   │   │   └── registro/     # Registra comidas consumidas
│   │   ├── alimento/         # Buscar macros de un alimento individual
│   │   ├── buscar/           # Página búsqueda de alimentos
│   │   ├── favoritos/        # Página favoritos
│   │   ├── login/            # Inicio de sesión
│   │   ├── onboarding/       # Alta del socio (4 pasos) + calculadora de calorías
│   │   ├── plan/             # Página principal (plan del día)
│   │   ├── recetas/          # Catálogo de recetas
│   │   └── registrar/        # Registrar lo que comió
│   ├── components/           # UI components (HamburgerMenu, AgregarRecetaModal, etc.)
│   ├── lib/
│   │   ├── auth.ts           # JWT (firmar/verificar) + cookie httpOnly
│   │   ├── db.ts             # SQLite (better-sqlite3), esquema y seed
│   │   ├── plan.ts           # Algoritmo de generación de plan (balance de 4 macros)
│   │   ├── recetas.ts        # Helpers para recetas
│   │   ├── usuario.ts        # Perfil: getUserAsync() → /api/auth/me (fallback localStorage)
│   │   └── util.ts           # Helpers generales
│   └── types/index.ts        # Tipos TypeScript globales
└── gym.config.json           # Configuración del gimnasio (white-label)
```

---

## Cómo funciona el algoritmo de plan

1. Divide las calorías objetivo entre el número de comidas (3 o 4).
2. Para cada slot (desayuno, almuerzo, merienda, cena) busca recetas del tipo correcto dentro de ±40% de las kcal por comida.
3. Entre las candidatas en rango elige entre las mejores por balance de las 4 macros (calorías, proteínas, carbos, grasas; la proteína pesa ×1.2), al azar para dar variedad. Si no hay en rango, usa todas.
4. Hace hasta 8 iteraciones de ajuste global: si la desviación total ponderada (4 macros) supera 15%, reemplaza el slot peor balanceado por la candidata real que más reduzca la desviación del día.
5. Nunca repite receta dentro del mismo plan del día, y excluye recetas usadas por ese usuario en los últimos 14 días por slot (si no quedan candidatas, resetea ese historial).

---

## Estado de implementación (actualizado 2026-06-16)

### 1. Autenticación de usuarios [CRÍTICO] — ✅ IMPLEMENTADO (falta endurecer)
Ya está: tabla `usuarios` (email único + `password_hash` bcrypt) en `db.ts`; JWT en cookie httpOnly (`src/lib/auth.ts`); endpoints `api/auth/{login,registro,logout,me}`; el onboarding crea el usuario en la DB con contraseña real; `src/lib/usuario.ts` lee el perfil con `getUserAsync()` → `/api/auth/me` (fallback a localStorage para sesiones viejas); página `/login`; middleware de protección activo (`src/middleware.ts`).

**Pendiente de endurecer:**
- El middleware corre en Edge y solo verifica que la cookie `auth_token` EXISTA, no su firma (`jsonwebtoken` no es compatible con Edge en Next 14). La verificación real de firma está en los endpoints (runtime Node, ej. `/api/auth/me`). Para verificar firma también en el middleware, migrar a `jose`.
- Auditar que `api/plan`, `api/favoritos` y `api/registro` verifiquen la cookie de sesión y NO confíen en un `usuario_id` mandado por el cliente.
- Falta UI para que el usuario cambie su contraseña.

### 2. Migrar DB a Supabase (PostgreSQL) [CRÍTICO solo para serverless] — ⏳ PENDIENTE
`better-sqlite3` escribe en el filesystem local (`gym-nutrition.db`). En Railway (filesystem persistente, donde está el deploy) NO es urgente. Solo es bloqueante si se migra a Vercel u otro serverless. Migrar a Supabase, mismo esquema de tablas, usar `@supabase/supabase-js` o `pg`. Vars en `.env.local`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Cada gym con su propio proyecto Supabase (aislamiento de datos).

### 3. Calculador de calorías en onboarding [IMPORTANTE] — ✅ HECHO
`calcularTDEE` (Mifflin-St Jeor) en `onboarding/page.tsx`: pide peso, altura, edad, sexo, nivel de actividad y objetivo; aplica multiplicador (bajar −20%, mantener, subir +10%); muestra el resultado editable; macros 30/40/30. Tipo `datos_fisicos` en `UserProfile` y columna en la tabla `usuarios`.

### 4. Evitar repetición de recetas en días consecutivos [IMPORTANTE] — ✅ HECHO
`recetasRecientes()` en `plan.ts` excluye recetas usadas por el usuario en los últimos 14 días por slot (tabla `plan_diario`); si no quedan candidatas, resetea ese historial.

### 5. Corregir trigger de Open Food Facts en búsqueda [MENOR] — ✅ HECHO
`/api/buscar` consulta OFF siempre que haya menos de 4 resultados (ya no depende de acentos ni de "argentin"). Se eliminó la función muerta `tieneAcento`.

### (Fuera de alcance) Recetas: procedimiento/pasos de preparación
Lo maneja el usuario a mano. No tocar.

---

## Reglas y convenciones del proyecto

- Todo el código en TypeScript estricto. No usar `any` salvo que sea inevitable y comentado.
- Los colores siempre via CSS variables (`var(--color-primario)`, etc.), nunca hardcodeados. Esto es lo que hace posible el white-label.
- El `gym.config.json` es la fuente de verdad de la personalización. No tocar colores en Tailwind directamente.
- Los endpoints de API siempre validan parámetros y devuelven errores con status HTTP correcto.
- No introducir nuevas dependencias sin justificación. El bundle ya tiene lo necesario.
- Al modificar el esquema de DB, actualizar también `src/types/index.ts`.
- Cualquier dato de macros de un ingrediente debe ser REAL (de una fuente verificable como USDA), nunca inventado por la IA. Si se agrega un ingrediente nuevo, guardar también su `usda_fdcId` y `usda_descripcion` como rastro de auditoría (ver `data/ingredientes.json`).

---

## Contexto de negocio

- Mercado objetivo: gimnasios pequeños y medianos en Argentina.
- El dueño del gym lo ofrece a sus socios como servicio diferenciador incluido en la cuota.
- Precio modelo: setup por gym + abono mensual por cantidad de socios activos.
- El socio accede desde el celular (PWA, sin descarga).
- Las recetas usan ingredientes conseguibles en cualquier supermercado argentino.
- El contenido (recetas, nombres, unidades) debe estar en español rioplatense.
