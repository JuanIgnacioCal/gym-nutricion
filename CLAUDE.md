# Proyecto: App de Nutrición para Gimnasios (White-Label PWA)

## Qué es esto

Progressive Web App de nutrición personalizada pensada para venderse a gimnasios en modelo white-label. Cada gimnasio tiene su propia instancia con logo, colores y URL propios. El socio del gym configura sus calorías objetivo y la app le genera un plan diario con recetas reales ajustadas a sus macros.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · better-sqlite3 · lucide-react · recharts

**Modelo de negocio:** setup inicial por gym + abono mensual. Una sola codebase, desplegada N veces con distinto `gym.config.json`.

---

## Estructura del proyecto

```
gym-nutricion/
├── data/
│   └── recetas.json          # 223 recetas con macros (fuente de verdad)
├── public/
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── buscar/       # Búsqueda USDA + Open Food Facts
│   │   │   ├── config/       # Lee gym.config.json
│   │   │   ├── favoritos/    # CRUD favoritos
│   │   │   ├── plan/         # Genera y modifica el plan diario
│   │   │   ├── recetas/      # Lista recetas
│   │   │   └── registro/     # Registra comidas consumidas
│   │   ├── buscar/           # Página búsqueda de alimentos
│   │   ├── favoritos/        # Página favoritos
│   │   ├── onboarding/       # Flujo de alta del socio (4 pasos)
│   │   ├── plan/             # Página principal (plan del día)
│   │   ├── recetas/          # Catálogo de recetas
│   │   └── registrar/        # Registrar lo que comió
│   ├── components/           # UI components
│   ├── lib/
│   │   ├── db.ts             # SQLite (better-sqlite3), esquema y seed
│   │   ├── plan.ts           # Algoritmo de generación de plan
│   │   ├── recetas.ts        # Helpers para recetas
│   │   ├── usuario.ts        # ⚠️ Perfil en localStorage (ver deuda técnica)
│   │   └── util.ts           # Helpers generales
│   └── types/index.ts        # Tipos TypeScript globales
└── gym.config.json           # Configuración del gimnasio (white-label)
```

---

## Cómo funciona el algoritmo de plan

1. Divide las calorías objetivo entre el número de comidas (3 o 4).
2. Para cada slot (desayuno, almuerzo, merienda, cena) busca recetas del tipo correcto dentro de ±40% de las kcal por comida.
3. Si hay candidatas en rango, elige al azar (variedad). Si no, toma la más cercana.
4. Hace hasta 8 iteraciones de ajuste global: si el total se aleja >15% del objetivo, reemplaza el slot que más desvía.
5. Nunca repite receta dentro del mismo plan del día.

---

## Deuda técnica — mejoras a implementar (en orden de prioridad)

### 1. Autenticación de usuarios [CRÍTICO]
**Problema:** el perfil del usuario vive únicamente en `localStorage`. Si el socio cambia de dispositivo, borra caché o usa incógnito, pierde todo. El dueño del gym no puede ver ni gestionar a sus socios.

**Solución a implementar:**
- Agregar tabla `usuarios` en la DB con email + contraseña hasheada (bcrypt).
- Login/registro con JWT almacenado en cookie httpOnly.
- Migrar `src/lib/usuario.ts` para leer el perfil desde la DB en vez de localStorage.
- El onboarding debe crear el usuario en la DB al finalizar.
- Agregar middleware de Next.js para proteger rutas.

### 2. Migrar DB a Supabase (PostgreSQL) [CRÍTICO para deploy]
**Problema:** `better-sqlite3` escribe en el filesystem local (`gym-nutrition.db`). En Vercel (serverless) el filesystem no persiste entre requests — la DB se resetea.

**Solución a implementar:**
- Migrar a Supabase (PostgreSQL). El esquema de tablas es el mismo, solo cambia el cliente.
- Usar `@supabase/supabase-js` o `postgres` (pg).
- Las variables de entorno van en `.env.local`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Cada instancia de gym tiene su propio proyecto Supabase (aislamiento de datos entre gyms).

### 3. Calculador de calorías en onboarding [IMPORTANTE]
**Problema:** el socio ingresa sus calorías manualmente. La mayoría no sabe cuántas necesita.

**Solución a implementar:**
- Agregar campos: peso (kg), altura (cm), edad, sexo, nivel de actividad (sedentario / moderado / activo / muy activo).
- Calcular TDEE con fórmula Mifflin-St Jeor.
- Aplicar multiplicador según objetivo: déficit −20% para bajar, +10% para subir, mantenimiento sin cambio.
- Mostrar el resultado como sugerencia, editable.
- Los macros sugeridos: proteína 30%, carbos 40%, grasas 30% (ajustable según objetivo).

### 4. Evitar repetición de recetas en días consecutivos [IMPORTANTE]
**Problema:** con solo 54 recetas de desayuno, el socio verá repetición en menos de 2 meses de uso diario.

**Solución a implementar:**
- Al generar el plan, excluir recetas usadas en los últimos 14 días para ese usuario y slot.
- Consulta: SELECT receta_id FROM plan_diario WHERE usuario_id = ? AND fecha >= ? AND slot = ?
- Si no quedan candidatas (usuario muy activo), resetear el historial de exclusión para ese slot.

### 5. Corregir trigger de Open Food Facts en búsqueda [MENOR]
**Problema:** la búsqueda de alimentos solo consulta Open Food Facts si la query tiene acento o dice "argentin". Buscar "pollo" o "arroz" no toca OFF.

**Solución:** cambiar la condición para que OFF siempre se consulte (o al menos cuando USDA devuelve pocos resultados).

---

## Reglas y convenciones del proyecto

- Todo el código en TypeScript estricto. No usar `any` salvo que sea inevitable y comentado.
- Los colores siempre via CSS variables (`var(--color-primario)`, etc.), nunca hardcodeados. Esto es lo que hace posible el white-label.
- El `gym.config.json` es la fuente de verdad de la personalización. No tocar colores en Tailwind directamente.
- Los endpoints de API siempre validan parámetros y devuelven errores con status HTTP correcto.
- No introducir nuevas dependencias sin justificación. El bundle ya tiene lo necesario.
- Al modificar el esquema de DB, actualizar también `src/types/index.ts`.

---

## Contexto de negocio

- Mercado objetivo: gimnasios pequeños y medianos en Argentina.
- El dueño del gym lo ofrece a sus socios como servicio diferenciador incluido en la cuota.
- Precio modelo: setup por gym + abono mensual por cantidad de socios activos.
- El socio accede desde el celular (PWA, sin descarga).
- Las recetas usan ingredientes conseguibles en cualquier supermercado argentino.
- El contenido (recetas, nombres, unidades) debe estar en español rioplatense.
