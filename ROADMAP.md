# ROADMAP — gym-nutricion

_Documento único de planeamiento. Consolida lo que antes estaba en ROADMAP.md + PLAN_DE_MEJORAS.md + PLAN_v2_FUNCIONES.html. Actualizado: 2026-06-20._

**Estado:** PWA white-label funcional y desplegada en Railway (auth, plan diario, recetas, búsqueda de alimentos en español, registro, favoritos, calculadora de calorías, panel del dueño). Lo que sigue, ordenado para convertirla en un producto vendible a gimnasios.

Leyenda: **[yo]** lo programo y vos pusheás · **[vos]** acción tuya (Railway/pago/decisión). Esfuerzo: **S** <1h · **M** unas horas · **L** 1+ día.

---

## ✅ Ya hecho

- **Auth completa:** tabla `usuarios` (email + bcrypt), JWT en cookie httpOnly, login/registro, middleware de protección. Desplegado.
- **Persistencia Railway:** Volume en `/data` + `DATABASE_PATH`. Los socios no se borran entre deploys.
- **Seguridad cerrada y verificada:** IDOR cerrado (`plan`, `favoritos`, `registro`, `cambiar` derivan `usuario_id` de la sesión; los DELETE chequean dueño). `JWT_SECRET` sin fallback inseguro (revienta si falta) y seteado fuerte en Railway. `POST /api/recetas` exige sesión.
- **Calculadora de calorías:** `calcularTDEE` (Mifflin-St Jeor) en `lib/calorias.ts`; el onboarding pide peso/altura/edad/sexo/actividad/objetivo y sugiere kcal + macros (editable).
- **Editar objetivo / recalcular:** arreglado el bug de guardado (antes solo localStorage → se perdía al recargar). Ahora `PUT /api/auth/me` persiste en la DB. Incluye recalcular desde datos físicos y cambiar bajar/mantener/subir.
- **Búsqueda en español:** se sacó USDA del camino en vivo. Orden actual: `ingredientes.json` (curada, español) → Open Food Facts (español/AR). `ingredientes.json` tiene 70 ingredientes con macros reales (`usda_fdcId` para auditar).
- **Recetas:** +28 desayunos/meriendas nuevas (ids 244-271) con macros reales y pasos. Desayuno/merienda pasó de 59 a 87. Escalado de porciones (`escalarIngrediente`). No repetir receta usada por el usuario en los últimos 14 días por slot. Receta duplicada (id 200) borrada.
- **Panel del dueño:** `/panel` protegido por `ownerEmail`, endpoint `GET /api/panel` con KPIs (total, activos 7/30 días, altas del mes), gráfico de actividad (recharts), tabla de socios ordenable y distribución de objetivos. Acceso visible en el menú solo para el dueño.
- **Plan semanal:** página `/semana` (selector de día Lun–Dom, generar/regenerar semana, cambiar comida puntual) + endpoint `GET/POST /api/plan/semana`. Genera 7 días reusando el motor diario (sin cambiar el esquema) y no repite recetas entre días. `/plan` (el día a día) quedó intacto.
- **Disclaimer legal + privacidad:** página `/legal` completa (términos + uso de datos, Ley 25.326), enlazada desde el onboarding y el menú; ruta pública en el middleware. El onboarding y `/plan` ya tenían el aviso resumido.

---

## 🔴 Bloqueantes para VENDER (sin esto, no cobres)

1. **Railway: pasar a plan pago** · S · **[vos]** — el trial se pausa solo. No podés vender algo que Railway apaga. Hacelo antes del primer cliente.
2. ✅ **Disclaimer legal + privacidad** — HECHO (página `/legal` + enlaces). Pendiente tuyo: poner el contacto real del gym en el texto y, si querés, que un profesional lo revise antes de vender.
3. **Reset de contraseña** · M · **[yo + decisión tuya]** — hoy si un socio olvida la clave queda afuera. Necesita un servicio de email (Resend, Brevo, SMTP Gmail). **Decisión pendiente:** cuál. Alternativa interina: que el dueño resetee la clave desde el panel. (No lo hice ahora: necesita tu decisión y credenciales de email.)

## 🟠 Seguridad / calidad (menores, hacer pronto)

- **Middleware: verificar firma del JWT** · M · **[yo]** — hoy solo chequea que la cookie exista. Migrar a `jose` (compatible con Edge) para validar firma también ahí.
- ✅ **Validar `receta_id` en `PATCH /api/plan`** — ya estaba implementado.
- ✅ **Sanear `limite` en `GET /api/recetas`** — ya estaba implementado (clamp 1–500).
- ✅ **`clearAuthCookie` con `secure`/`sameSite`** — ya estaba implementado.
- **Login resistente a timing** · S — comparar siempre contra un hash dummy aunque el email no exista (evita enumerar emails). Pendiente, toca `/api/auth/login`. (Lo dejé para una tanda que puedas buildear y probar.)
- **Id estable en Open Food Facts** · S — hoy usa `Math.random()` si falta el code → rompe dedupe/favoritos. Usar hash del nombre. Pendiente, toca `/api/buscar`.
- **Limpiar `usuario_id` vestigial del cliente** · S — el cliente sigue mandándolo (el server lo ignora). Código muerto. Pendiente.

---

## 🟡 Funciones de producto (orden sugerido)

1. ✅ **Plan semanal** — HECHO (página `/semana` + endpoint `/api/plan/semana`, sin cambiar el esquema, no repite recetas entre días). Es la base de la lista de compras.
2. **Ingredientes estructurados** `{nombre, cantidad, unidad}` · M/L · **[yo + datos]** — ← PRÓXIMO GRANDE. Hoy son texto suelto. Estructurarlos destraba de una sola vez: lista de compras, match con la base de macros, y filtros dietarios reales en el plan. Vale más que cualquier API.
3. **Integración con la app de lista de compras** (es tuya) · M · **[yo + vos]** — junta los ingredientes de la semana, los suma por ingrediente y unidad, redondea (g/kg) y los empuja a tu lista. Toggle en el menú + notificación in-app. Depende de #1 y #2. (Ver "Datos que necesito de vos".)
4. **Más desayunos/meriendas en 450–800 kcal** · M · **[datos]** — era el cuello de botella de variedad (solo había 1 receta >600 kcal). Ya se sumaron 10 en 600–800; conviene seguir hasta ~60–70 bien distribuidas. Almuerzo/cena (183) está sobrado, no tocar.

## 🧪 Hallazgos de testeo (revisar si siguen vigentes tras los últimos cambios)

- **T1 — Variedad del plan** · M — repetía casi siempre las mismas recetas. Mitigado con la exclusión de 14 días + más recetas; validar si persiste. (Tensión con T2: más variedad ⇄ menos precisión de macros.)
- **T2 — No pega justo los objetivos** · M — el total se acerca pero no exacto. El algoritmo ya balancea las 4 macros; validar contra objetivos reales.
- **T3 — Registrar "comido" desde la tarjeta del plan** · S — hoy solo desde la sección Registrar. Quick win de comodidad.

---

## 🟢 Retención (después del primer "sí")

- **Seguimiento de progreso del socio** · M — peso en el tiempo + gráficos (recharts) + racha de adherencia. Engancha y muestra resultados.
- **Restricciones dietarias en el PLAN** · M — hoy "vegetariano" filtra solo el catálogo; el plan generado no respeta restricciones ni alergias. Sumar al perfil + al algoritmo.
- **Notificaciones / recordatorios push** · M/L — sube mucho el uso diario (iOS es más complejo; ya hay `sw.js`).
- **Mercado Pago** · L — solo si el gym quiere cobrarle el beneficio al socio desde la app.

## 🔵 Escalabilidad (antes de muchos gyms)

- **Modelo multi-gym** · L — hoy es un deploy manual por gym con su `gym.config.json`. Con 2-3 lo bancás; con 10 hay que decidir: multi-tenant (una instancia, varios gyms) vs. automatizar el deploy.
- **Supabase (PostgreSQL)** · L — **solo** si se mueve a Vercel u otro serverless. En Railway con volumen, NO urgente.

---

## Fuentes de macros (referencia para la "tanda 2" de ingredientes)

Regla del proyecto: los macros son SIEMPRE reales y verificables, nunca inventados; guardar la fuente (`usda_fdcId` o equivalente).

- **Argenfoods (UNLu) + SARA 2 (ENNyS 2):** composición real de alimentos argentinos, español, por 100 g, gratis. Es Excel/PDF (no API) → curar a mano. **La mejor fuente para crudos.** Expandir `ingredientes.json` de 70 a ~250-400 con un script que parsea el Excel → JSON con `provenance`.
- **Open Food Facts:** gratis y abierto, productos envasados argentinos + código de barras (futuro killer feature). Flojo para crudos/genéricos. Ya integrado.
- **FatSecret Premier:** 1.9M items multilingües, pero datos de Argentina = plan pago (cotizan por país). Solo si escalás y la facturación lo justifica.
- **USDA:** gratis y preciso pero inglés. Fuera del camino en vivo; usar solo offline para curar.
- **Descartado:** lector de tickets con IA de visión (caro, frágil, no cierra ventas) y MyFitnessPal (API privada, no aceptan solicitudes).

Links: Argenfoods https://www.argenfood.unlu.edu.ar/ · Open Food Facts https://openfoodfacts.github.io/openfoodfacts-server/api/ · FatSecret https://platform.fatsecret.com/api-editions

---

## Datos que necesito de vos (para la integración de lista de compras)

1. ¿Tu app de lista tiene un endpoint HTTP donde mandar items? ¿Con qué stack está y qué auth usa (¿alcanza un token?)?
2. ¿Cómo se identifica el mismo usuario en las dos apps? ¿Mismo email? ¿Un código que el usuario pega para vincular?
3. ¿Tu lista guarda cantidades estructuradas (cantidad + unidad) o texto libre? ¿Te los mando ya sumados y redondeados, o crudos?
