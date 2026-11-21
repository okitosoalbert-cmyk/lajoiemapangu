@echo off
setlocal
cd /d "%~dp0"
title INNOVA - Tester Gemini
if not exist ".venv\Scripts\python.exe" (
  echo Lance d'abord Lancer-INNOVA.bat pour installer les dependances.
  pause
  exit /b 1
)
echo Test de Gemini avec la cle deja enregistree sur ce PC...
".venv\Scripts\python.exe" -X utf8 app.py --check-gemini
pause
