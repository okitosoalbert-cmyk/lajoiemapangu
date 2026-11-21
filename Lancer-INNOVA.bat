@echo off
setlocal
cd /d "%~dp0"
title INNOVA - U-Guide
if not exist "app.py" (
  echo Extrais tout le fichier ZIP avant de lancer INNOVA.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  py -3 -m venv .venv
  if errorlevel 1 (
    python -m venv .venv
    if errorlevel 1 goto python_missing
  )
)
echo Installation des dependances si necessaire...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto install_failed
if not defined GEMINI_API_KEY if not exist "%LOCALAPPDATA%\INNOVA\gemini-key.txt" if not exist "%LOCALAPPDATA%\INNOVA\gemini-setup-seen" (
  if exist "Configurer-Gemini.bat" call "Configurer-Gemini.bat" lancement
)
echo.
echo Ouvre http://127.0.0.1:5100/?borne dans Chrome.
echo Garde cette fenetre ouverte pendant la demonstration.
".venv\Scripts\python.exe" app.py
if errorlevel 1 goto launch_failed
exit /b 0

:python_missing
echo Installe Python 3.11 ou plus recent depuis python.org, puis relance ce fichier.
pause
exit /b 1

:install_failed
echo L'installation a echoue. Verifie ta connexion Internet et relance ce fichier.
pause
exit /b 1

:launch_failed
echo INNOVA a rencontre une erreur. Le detail est affiche ci-dessus.
pause
exit /b 1
