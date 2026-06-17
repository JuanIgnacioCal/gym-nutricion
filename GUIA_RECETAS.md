# Guía: cómo sumar recetas (pasos + macros reales)

Objetivo: agregar recetas al catálogo con sus **pasos de preparación** y **macros reales**, rápido y sin romper la regla del proyecto (los macros nunca se inventan).

**Dos carriles separados — esto es la clave:**

- **Pasos de preparación** = texto. Bajo riesgo. Podés generarlos con una IA gratis y revisarlos.
- **Macros** = dato sensible. SIEMPRE de fuente real, calculados sumando los macros reales de cada ingrediente según los gramos. **Nunca estimados por la IA.**

---

## Carril 1 — Pasos de preparación (rápido, con IA)

Pegá esto en ChatGPT / Claude / etc. junto con un lote de recetas (sacás `id | nombre | ingredientes` de `data/recetas.json`):

```
Sos asistente de cocina. Te paso recetas (id | nombre | ingredientes). Para cada una
devolvé los pasos de preparación en español rioplatense, claros y en imperativo (3 a 6
pasos). Usá SOLO los ingredientes que te doy (no inventes ni agregues). NO incluyas datos
nutricionales. Devolvé SOLO un JSON con este formato exacto:
{ "1": ["paso 1", "paso 2"], "2": ["..."] }

Recetas:
1 | Yogur griego con avena y banana | 200g yogur griego / 50g avena / 1 banana / 1 cdita miel
2 | Omelette de claras con espinaca y queso | 6 claras / 1 taza espinaca / 30g queso port salut / 1 cdita aceite de oliva
(... pegá acá tu lote ...)
```

El JSON que devuelve se pega dentro de `data/pasos.json`, en el objeto `"pasos"`, por id.
(Ya te dejé las recetas 1 a 14 hechas como ejemplo de formato.)

---

## Carril 2 — Sumar recetas NUEVAS con macros reales

**Regla de oro:** el macro de un ingrediente NO se inventa. Se busca en una fuente real y se suma según los gramos.

Paso a paso:

1. Elegí la receta y escribí los ingredientes con la cantidad **en gramos**.
2. Buscá los macros **por 100 g** de cada ingrediente en una fuente real (lista abajo).
3. Sumá según los gramos → total de la receta → dividí por la cantidad de porciones.
4. Escribí los pasos (Carril 1).
5. Pegá todo en la plantilla JSON (más abajo).

### Fuentes de macros REALES

- **USDA FoodData Central** — gratis, en inglés, muy preciso: https://fdc.nal.usda.gov/
- **Argenfoods (UNLU)** — argentino, en español, gratis (tablas Excel/PDF): http://www.argenfood.unlu.edu.ar/
- **BEDCA** — base española en español: https://www.bedca.net/
- **Open Food Facts** — productos de marca/súper y código de barras: https://world.openfoodfacts.org/
- **Tu propia base** — `data/ingredientes.json` ya tiene 46 ingredientes con macros reales y su fuente (`usda_fdcId`). Usala primero.

### Calculadoras que SUMAN los macros por vos (les pegás los ingredientes y te dan el total)

- **Cronometer** — muy preciso: https://cronometer.com/
- **Verywell Fit Recipe Nutrition Analyzer**: https://www.verywellfit.com/recipe-nutrition-analyzer-4157076
- **FatSecret Argentina** — sitio gratis para consultar alimentos locales: https://www.fatsecret.com.ar/

> Tip honesto: lo más confiable es una calculadora (Cronometer/Verywell) que suma datos verificados. Evitá copiar el "valor nutricional" de un blog cualquiera: suelen ser estimaciones poco confiables.

### Prompt para que la IA haga SOLO la cuenta (sin inventar)

```
Calculá los macros de una receta a partir de datos REALES que te doy. NO uses valores de
tu memoria ni estimes: usá SOLO los números de la tabla.
- Ingredientes con gramos: 200 g yogur griego, 50 g avena, 120 g banana
- Macros por 100 g (de USDA/Argenfoods): yogur griego 73 kcal / 9.9 prot / 3.9 carb / 1.9 gras ;
  avena 379 / 13.2 / 67.7 / 6.5 ; banana 89 / 1.1 / 22.8 / 0.3
- Porciones: 1
Devolvé el TOTAL y POR PORCIÓN: calorías, proteínas, carbohidratos, grasas, fibra
(redondeado a 1 decimal). Mostrá brevemente la cuenta.
```

---

## Plantilla JSON (formato exacto de tu `recetas.json`)

```json
{
  "id": 224,
  "nombre": "",
  "nombre_original": "",
  "origen": "argentina",
  "tipo_comida": "almuerzo/cena",
  "categoria": "alta_proteina",
  "calorias": 0,
  "proteinas": 0,
  "carbohidratos": 0,
  "grasas": 0,
  "fibra": 0,
  "porciones": 1,
  "tiempo_preparacion": 0,
  "tiempo_coccion": 0,
  "tiempo_total": 0,
  "ingredientes": ["200g ...", "1 ..."],
  "pasos": ["...", "..."],
  "url_original": "",
  "calificacion": 5.0
}
```

Valores válidos:
- `tipo_comida`: `"desayuno/merienda"` o `"almuerzo/cena"`.
- `categoria`: combiná con coma — `alta_proteina`, `bajo_carb`, `vegetariano` (ej: `"alta_proteina,vegetariano"`).
- Los macros (`calorias`, `proteinas`, `carbohidratos`, `grasas`, `fibra`) son por porción y **reales**.

---

## Cómo sumarlas al proyecto

- Pegá la receta nueva al final del array en `data/recetas.json` (antes del `]` final), separada por coma.
- Usá un **id nuevo y único**.
- ⚠️ Ojo: hoy el **id 200 está duplicado** (dos recetas lo comparten). Conviene corregirlo: renumerá una a un id libre. El próximo id seguro para recetas nuevas es **224** en adelante.
- Después de editar, en tu compu corré `npm run build` para confirmar que el JSON quedó bien. Si rompe (una coma de más), avisame.

> Falta un paso técnico para que los pasos se vean en la app: conectar `data/pasos.json` al cargar las recetas y mostrarlos en la pantalla de receta. Eso lo hago yo cuando quieras (es la parte de código).
