# ROADMAP — gym-nutricion

**Estado:** app funcional para el socio (plan diario, recetas, búsqueda de alimentos, registro, favoritos) con autenticación ya desplegada en Railway. Lo que sigue, ordenado para convertirla en un producto vendible a gimnasios.

---

## Tier 1 — Bases antes de cobrarle a un gym (cimientos, no features)

- **Persistencia de datos:** confirmar Volume en Railway (o migrar a Supabase). Si un deploy borra los usuarios, el producto es invendible.
- **Seguridad de las API:** que `/api/plan`, `/api/favoritos` y `/api/registro` verifiquen la cookie de sesión y NO confíen en un `usuario_id` mandado por el cliente (hoy un socio podría leer datos de otro).
- **Recuperar contraseña:** hoy si un socio la olvida queda afuera para siempre.
- **Disclaimer + privacidad:** "es orientación nutricional, no consejo médico" + política de datos básica (en Argentina rige la Ley 25.326). Bajo esfuerzo, alto riesgo legal si falta.

## Tier 2 — Lado del comprador (lo que te deja vender y facturar)

- **Panel del dueño del gym:** lista de socios, cuántos están activos (métrica con la que cobrás el abono) y su uso. Sin esto no podés mostrar valor ni facturar bien ni evitar bajas.
- **Alta de gyms más simple:** hoy cada gym es un deploy manual con su `gym.config.json`. Para los primeros 2-3 alcanza; después hay que pensar multi-tenant o un proceso de alta.

## Tier 3 — Retención del socio

- **Seguimiento de progreso:** registrar peso en el tiempo + gráficos (`recharts` ya está instalado y sin usar) + racha de adherencia. Es lo que hace que el socio vea resultados y no abandone.
- **Lista de compras del plan:** los datos ya existen; práctico y muy pedido. Bajo esfuerzo, alto valor.
- **Restricciones dietarias en el PLAN:** hoy el filtro "vegetariano" existe solo en el catálogo, pero el plan generado no respeta restricciones ni alergias. Sumar al perfil + al algoritmo.
- **Notificaciones push:** recordatorios de registrar comidas / ver el plan. Sube mucho el uso diario (ojo: en iPhone es más complejo).

## Tier 4 — Cobranza

- **Mercado Pago** para el abono (estándar en Argentina), cuando ya tengas gyms confirmados.

---

## Recetas — pasos de preparación

- **Problema:** las 223 recetas no tienen pasos ni `url_original` (está vacío). Hay que escribirlos; no hay de dónde copiarlos.
- **Esquema:** agregar campo `pasos: string[]` a la receta (y actualizar `src/types/index.ts`).
- **Manual y eficiente:** no hacer las 223 de una. Priorizar las que más aparecen en los planes / las más comunes, de a 10-20. Cargar editando `recetas.json` o con una mini pantalla de admin.
- **Nota honesta:** los pasos NO son un dato sensible como los macros (que deben ser reales y verificables). Para recetas simples se pueden generar en lote con un LLM (incluso gratis) y revisar. No es lo mismo que inventar macros.

## Base de datos de macros (la búsqueda de alimentos)

- **Bug actual:** la base curada tiene solo 46 ingredientes y el fallback es USDA, que está en inglés → "cebolla"/"zapallito" no devuelven nada y no aparecen productos argentinos.
- **MyFitnessPal:** base propia crowdsourced; API privada, no aceptan solicitudes → no se puede usar. (Scrapers de terceros = violan términos + frágiles, no para un producto que vendés.)
- **FatSecret** (lo más parecido a MFP): 1.9M alimentos, multilingüe, 58 países… pero el tier gratis (Basic y Premier Free) es **solo US/inglés**; español + Argentina es **Premier pago** (cotizan por país).
- **Edamam / Nutritionix:** caros (US$999–1850/mes) y centrados en inglés.
- **USDA:** gratis y preciso, pero inglés y sin alimentos argentinos.
- **Open Food Facts:** gratis y abierto (ODbL), 3M+ productos, multilingüe, bueno para productos ENVASADOS argentinos (código de barras). Flojo para alimentos crudos/genéricos.
- **Argenfoods (UNLU) + SARA 2 (tabla oficial ENNyS 2):** composición REAL de alimentos argentinos, en español, por 100 g, gratis — pero son Excel/PDF, no una API.

**Recomendación (la mejor, no la más fácil): ser dueño de tu propia base.**
1. **Expandir `ingredientes.json`** desde Argenfoods/SARA (Argentina, español, gratis) con un script que parsea el Excel → JSON con `provenance`. Pasar de 46 a ~250-400 alimentos comunes. Arregla cebolla/zapallito de una, sin costo recurrente y con datos reales.
2. **Open Food Facts** para productos de marca/supermercado + código de barras (futuro killer feature).
3. **Arreglar el orden de búsqueda:** hoy es curada → USDA(inglés) → OFF. Sacar USDA del camino en vivo (usarlo solo offline para curar) y dejar curada → OFF.
4. **NO cambiar la DB de la app** (SQLite/Postgres). Eso es otra capa; lo que cambia es la FUENTE de macros.
5. **FatSecret Premier (pago)** recién si escalás y la facturación lo justifica.

---

### Fuentes
- MyFitnessPal API (acceso privado): https://tryterra.co/integrations/myfitnesspal
- FatSecret ediciones y precios (free = US/inglés): https://platform.fatsecret.com/api-editions
- Argenfoods (UNLU): https://www.argenfood.unlu.edu.ar/
- Open Food Facts API: https://openfoodfacts.github.io/openfoodfacts-server/api/
- Comparativa de APIs de nutrición: https://www.spikeapi.com/blog/top-nutrition-apis-for-developers-2026
