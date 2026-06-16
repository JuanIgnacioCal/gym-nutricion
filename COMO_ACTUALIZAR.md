# Cómo actualizar la app (guía para principiante)

Cada vez que cambiás el código, para que se actualice en tu celular tenés que:
**subir el código a GitHub → Railway la reconstruye sola → el celular toma la versión nueva.**

No hace falta tocar nada en el celular: la app es una PWA y carga siempre desde la URL de Railway.

---

## ✅ Antes del primer deploy con login (UNA SOLA VEZ, en Railway)

Entrá a https://railway.app → tu proyecto. Revisá estas dos cosas, porque el sistema de login depende de ellas:

1. **Variables de entorno** (pestaña *Variables*). Tienen que estar cargadas:
   - `JWT_SECRET` → un texto largo y secreto (mínimo 32 caracteres). Inventá algo random. Si falta, las sesiones son inseguras.
   - `USDA_API_KEY` → tu clave de USDA (la misma que tenés en tu `.env.local`).

   *(El archivo `.env.local` de tu PC NO se sube a GitHub a propósito, por eso hay que cargar estas variables a mano en Railway.)*

2. **Volume para la base de datos** (pestaña *Volumes* / *Data*). La base `gym-nutrition.db` guarda los usuarios registrados. El disco de Railway se borra en cada deploy salvo que haya un **Volume** montado. Si no tenés un Volume, **cada actualización borra todos los usuarios**. Si no sabés si lo tenés, avisame y lo revisamos juntos.

---

## 🔁 Actualizar la app (CADA VEZ)

### Paso 1 — Abrir la terminal en la carpeta del proyecto
1. Abrí el Explorador de archivos y entrá a la carpeta:
   `Escritorio › archivos juan ignacio › gym-nutricion`
2. Hacé clic en la **barra de dirección** (arriba, donde dice la ruta), borrá lo que haya, escribí `cmd` y apretá **Enter**.
3. Se abre una ventana negra (la terminal) ya parada en la carpeta correcta.

### Paso 2 — Verificar que el código compila
Escribí esto y apretá Enter:
```
npm run build
```
- Tarda 1–3 minutos. Es normal.
- Si al final dice **"Compiled successfully"** (o ✓) y vuelve la línea de comando → todo bien, seguí.
- Si aparece texto en **rojo con "error"** → **frená acá** y mandame el error. No subas código que no compila.

### Paso 3 — Preparar los cambios
```
git add -A
```
(No muestra nada. Es normal.)

### Paso 4 — Guardar los cambios con un mensaje
```
git commit -m "actualizacion login y mejoras"
```
Te va a decir algo como "X files changed". El mensaje entre comillas podés cambiarlo por lo que quieras describir.

### Paso 5 — Subir a GitHub
```
git push
```
- Si te pide usuario y contraseña: usuario = tu usuario de GitHub (`JuanIgnacioCal`); la "contraseña" es un **token** (Personal Access Token), no tu clave real. Se crea en https://github.com/settings/tokens/new (tildá `repo` y generalo).
- Si no te pide nada y termina, ¡listo, ya subió!

### Paso 6 — Esperar a Railway
- Railway detecta el push y reconstruye sola.
- Mirá el progreso en https://railway.app → tu proyecto → **Deployments**. Tarda ~1–3 min.
- Cuando diga **"Success" / "Active"**, la web ya está actualizada.
- *(Si tu Railway NO está conectado a GitHub para deploy automático, entrá al proyecto y dale **Deploy** a mano.)*

### Paso 7 — Verlo en el celular
- Abrí la app en el celular. Si ves la versión vieja, **cerrá la app del todo** (deslizala fuera de las apps recientes) y volvé a abrirla. La PWA busca la versión nueva al reabrir.
- Si sigue vieja: abrila un par de veces más, o entrá desde el navegador y refrescá.

---

## ⚠️ Importante en ESTA actualización (login)

Ahora la app pide iniciar sesión. La primera vez después de este deploy:
- Si antes entrabas sin cuenta, te va a mandar a **/login**.
- Creá tu cuenta desde **"Crear cuenta"** (onboarding) con email + contraseña, o iniciá sesión si ya la creaste.
- A partir de ahí, tu perfil queda guardado en la base (no solo en el celular), así que lo recuperás aunque cambies de dispositivo.

---

## 🆘 Si algo falla

- **"fatal: Unable to create '.git/index.lock': File exists"** → borrá ese archivo y reintentá el commit:
  ```
  del .git\index.lock
  ```
- **`npm run build` da error** → copiame el texto del error y lo arreglo.
- **`git push` rechazado o pide login** → ver Paso 5 (token de GitHub).
- **La app no cambia en el celular** → cerrala del todo y reabrila (Paso 7).
