@echo off
chcp 65001 >nul
echo ============================================
echo   Subiendo gym-nutricion a GitHub
echo ============================================
echo.

cd /d "C:\Users\lulap\OneDrive\Escritorio\archivos juan ignacio\gym-nutricion"

git config user.email "calventejuanignacio5@gmail.com"
git config user.name "Juan Ignacio Calvente"

if not exist ".git" (
    git init
    git branch -M main
)

git add -A
git commit -m "feat: initial commit - gym nutrition PWA"

git remote remove origin 2>nul
git remote add origin https://github.com/JuanIgnacioCal/gym-nutricion.git
git branch -M main
git push -u origin main

if errorlevel 1 (
    echo.
    echo Si pide usuario y contrasenia, usa tu usuario de GitHub
    echo y como contrasenia un Personal Access Token (NO tu password).
    echo Crear token en: https://github.com/settings/tokens/new
    echo Tilda solo "repo" y generalo.
    echo.
) else (
    echo.
    echo LISTO! Codigo en GitHub.
    echo Ahora ve a https://railway.app para deplegar.
)

pause
