# Documento de pruebas — gym-nutricion
_Qué probar a mano para saber si todo funciona. Hacelo desde el celular, contra la app real: **https://gym-nutricion-production.up.railway.app**_

**Cómo usarlo:** seguí cada prueba en orden, marcá la casilla si el "✅ Tenés que ver" se cumple. Si algo no coincide, anotalo y pasámelo (qué prueba, qué esperabas, qué pasó, captura si podés).

> Lo que ya verifiqué yo y no hace falta que repruebes: persistencia de datos (la DB sobrevive a un redeploy ✓), integridad de las 242 recetas (macros correctos ✓), seguridad de las APIs (un socio no puede ver datos de otro ✓).

---

## 1. Carga inicial y marca
- [ ] Abrí la URL en el celular. **✅ Tenés que ver:** el logo de Overall, "Overall Center Gym", "El gym que nunca duerme", botón amarillo "Empezar".
- [ ] Los colores son amarillo/negro (la marca), no genéricos.

## 2. Registro + calculadora de calorías (onboarding)
- [ ] Tocá "Empezar" y completá nombre, email **nuevo** y contraseña (mín. 6). **✅:** te deja avanzar.
- [ ] Cargá tus datos físicos (peso, altura, edad, sexo, actividad, objetivo). **✅:** la app te **sugiere unas calorías** y macros, y son razonables (ej. un hombre de 80kg activo da ~2500-2900 kcal; una mujer de 60kg sedentaria, ~1400-1700).
- [ ] Probá cambiar "objetivo" a bajar/subir/mantener. **✅:** las calorías sugeridas cambian (bajar = menos, subir = más).
- [ ] Terminá el alta. **✅:** entrás a la app ya logueado, sin pedir login de nuevo.

**Casos a propósito (deberían fallar bien, con mensaje, no romper):**
- [ ] Contraseña de 3 caracteres → **✅:** no te deja, avisa "mínimo 6".
- [ ] Registrarte con un email ya usado → **✅:** avisa que ya existe, no crea duplicado.
- [ ] Peso/altura/edad en 0 o vacío → **✅:** no te deja avanzar.

## 3. Plan del día
- [ ] Generá el plan. **✅:** aparecen comidas (desayuno, almuerzo, merienda, cena) con recetas reales.
- [ ] Sumá las calorías de las comidas. **✅:** el total se acerca a tu objetivo (no el doble ni la mitad).
- [ ] Abrí una receta. **✅:** muestra ingredientes y **pasos de preparación numerados** (no un texto genérico).
- [ ] Tocá "cambiar" una comida. **✅:** la reemplaza por otra distinta del mismo tipo, sin repetir las que ya están.
- [ ] Generá el plan otro día (o de nuevo). **✅:** no te repite siempre las mismas recetas.

## 4. Registrar lo que comió
- [ ] Registrá una receta del plan como consumida. **✅:** aparece en el registro del día y suma a los totales.
- [ ] Registrá un alimento suelto con gramos. **✅:** calcula las calorías según los gramos.
- [ ] Borrá un registro. **✅:** desaparece y los totales bajan.

## 5. Buscar alimentos
- [ ] Buscá "pollo", "arroz", "huevo". **✅:** aparecen con sus macros.
- [ ] Buscá algo más argentino: "dulce de leche", "milanesa", "yerba". **✅:** aparece algo razonable (si no aparece, anotámelo: es la mejora del buscador que está en el plan).
- [ ] Cambiá los gramos de un alimento. **✅:** los macros se recalculan.

## 6. Favoritos
- [ ] Guardá una receta como favorita y andá a Favoritos. **✅:** está ahí.
- [ ] Quitala de favoritos. **✅:** desaparece.
- [ ] Guardá un alimento personalizado como favorito. **✅:** queda guardado.

## 7. Sesión y persistencia (importante)
- [ ] Cerrá sesión y volvé a entrar con tu email y contraseña. **✅:** entrás y ves tu perfil y tus datos.
- [ ] Entrá desde **otro celular o una ventana de incógnito** con la misma cuenta. **✅:** ves los mismos datos (no empezás de cero). Esto prueba que los datos viven en el servidor, no solo en tu teléfono.

## 8. Seguridad (control rápido)
- [ ] Sin haber iniciado sesión, intentá abrir directo `…/plan` o `…/registrar`. **✅:** te manda a la pantalla de login (no te deja entrar).

## 9. PWA (instalación en el celular)
- [ ] En el navegador del celular, opción "Agregar a pantalla de inicio". **✅:** se instala como app, abre a pantalla completa con el ícono de Overall.

---

## Si algo falla
Anotá: número de prueba, qué esperabas, qué pasó, y una captura. Pasámelo y lo arreglo. Las cosas que ya sé que faltan (reset de contraseña, panel del dueño, algunos alimentos argentinos en el buscador) están en `PLAN_DE_MEJORAS.md` — no hace falta que las reportes.
