# Plan de mejoras — gym-nutricion
_Basado en auditoría profunda de código + testeo (2026-06-17). Ordenado por prioridad._

Leyenda esfuerzo: **S** (chico, <1h) · **M** (medio, unas horas) · **L** (grande, 1+ día).
Quién: **[yo]** lo programo y vos pusheás · **[vos]** acción tuya (Railway/pago/decisión).

---

## ✅ Hecho en esta sesión
- IDOR cerrado y **verificado**: `plan`, `favoritos`, `registro`, `cambiar` derivan `usuario_id` de la sesión; los DELETE chequean dueño.
- **C1** — `JWT_SECRET` ya no tiene fallback inseguro en el código (revienta si falta). Además seteado fuerte en Railway (reemplazó al adivinable `gym-nutricion-secret-2024-cambiar`).
- **C2** — `POST /api/recetas` ahora exige sesión (antes cualquiera inyectaba recetas falsas al pool de todos).
- Persistencia: volumen `/data` montado + `DATABASE_PATH` + código que lo usa, deployado.
- Receta duplicada **id 200 borrada** (243 → 242, sin duplicados).

---

## 🔴 Bloqueante para VENDER (sin esto, no cobres)

1. **Railway: pasar a plan pago** · S · **[vos]**
   El trial dice "se pausa para mantener el servicio online". No podés vender algo que Railway apaga. Es barato; hacelo antes de meter un cliente.

2. **Verificar persistencia end-to-end** · S · **[yo+vos]**
   En curso esta sesión (redeploy + marcador en `/data`). Es la prueba de que no se borran los socios.

3. **Reset de contraseña** · M · **[yo]** (necesita decisión tuya)
   Hoy si un socio olvida la clave, queda afuera. Requiere un servicio de envío de email (Resend, Brevo, SMTP de Gmail…). **Decisión pendiente:** cuál usar. Sin email, alternativa interina: que el dueño del gym resetee la clave desde el panel.

4. **Disclaimer legal + privacidad** · S/M · **[yo]**
   "Orientación nutricional, no reemplaza consejo médico" visible + política de datos (Ley 25.326 AR). Manejás peso/edad/sexo de personas reales y se lo vendés a una empresa: no es opcional.

5. **Panel del dueño del gym** · L · **[yo]**
   Hoy el que paga no ve nada. Mínimo viable: lista de socios, socios activos (últimos 7/30 días) y uso. Es la demostración de valor **y** tu métrica de cobro. Usa `recharts` (ya instalado, sin uso).

---

## 🟠 Seguridad / calidad (chicos, hacer pronto)
6. **A2 — Middleware verifica firma del JWT** · M · **[yo]**. Hoy solo chequea que la cookie exista. Migrar a `jose` (compatible con Edge) para validar firma también en el middleware.
7. **M1 — Validar `receta_id` en `PATCH /api/plan`** · S · **[yo]**. Si mandan un id inexistente queda un slot vacío sin explicación.
8. **M2 — Sanear `limite` en `GET /api/recetas`** · S · **[yo]**. `Number()` sin tope permite `NaN`/valores enormes. Acotar 1–500.
9. **M4 — Login resistente a timing** · S · **[yo]**. Comparar siempre contra un hash dummy aunque el email no exista (evita enumerar emails).
10. **B2 — Id estable en Open Food Facts** · S · **[yo]**. Hoy usa `Math.random()` si falta code → rompe dedupe/favoritos. Usar hash del nombre.
11. **B1 — Limpiar `usuario_id` vestigial del cliente** · S · **[yo]**. El cliente sigue mandándolo (el server lo ignora). Código muerto que confunde.
12. **B3 — `clearAuthCookie` con `secure`/`sameSite`** · S · **[yo]**. Cosmético, consistencia con `setAuthCookie`.

---

## 🟢 Retención / valor (deseable, después del primer "sí")
13. **Seguimiento de progreso del socio** · M · peso en el tiempo + gráficos (`recharts`) + racha de adherencia. Engancha y muestra resultados.
14. **Lista de compras del plan** · M · los datos ya existen; alto valor percibido, bajo costo.
15. **Restricciones dietarias en el PLAN** · M · hoy "vegetariano" filtra solo el catálogo, el plan no lo respeta.
16. **Notificaciones / recordatorios** · M/L · push (iOS más complejo).
17. **Mercado Pago** · L · solo si el gym quiere cobrar el beneficio a los socios desde la app.

---

## 🔵 Escalabilidad (antes de muchos gyms)
18. **Modelo multi-gym** · L · hoy es "un deploy manual por gym". Con 2-3 lo bancás; con 10 no. Decidir: multi-tenant (una instancia, varios gyms) vs. automatizar el deploy por gym.
19. **Supabase (PostgreSQL)** · L · **solo** necesario si se mueve a Vercel u otro serverless. En Railway con volumen, NO urgente.

---

## Orden sugerido de ejecución
Primero validar la base (persistencia ✓, smoke test del flujo) → 6-12 (seguridad/calidad, son rápidos y van en una tanda) → 3, 4, 5 (los bloqueantes de venta más pesados) → Railway pago (#1) y a vender el piloto → 13-17 según pida el gym.
