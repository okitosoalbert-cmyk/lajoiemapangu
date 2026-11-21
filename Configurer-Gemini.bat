@echo off
setlocal
title INNOVA - Configurer Gemini
echo Quand Gemini est active, les questions de la borne peuvent etre envoyees a Google.
echo Garde ta cle privee. Elle sera stockee sur ce PC, hors du dossier du projet.
echo.
if not exist "%LOCALAPPDATA%\INNOVA" mkdir "%LOCALAPPDATA%\INNOVA"
choice /C ON /N /M "Activer Gemini sur ce PC ? O = Oui, N = Non : "
if errorlevel 2 (
  if /i "%~1"=="lancement" type nul > "%LOCALAPPDATA%\INNOVA\gemini-setup-seen"
  exit /b 0
)
if not exist "%LOCALAPPDATA%\INNOVA\gemini-key.txt" type nul > "%LOCALAPPDATA%\INNOVA\gemini-key.txt"
echo Colle uniquement ta cle dans le Bloc-notes. Enregistre et ferme.
start "" /wait notepad.exe "%LOCALAPPDATA%\INNOVA\gemini-key.txt"
if /i "%~1"=="lancement" (
  echo Une fois la cle enregistree et le Bloc-notes ferme, appuie sur une touche pour lancer INNOVA.
) else (
  echo Ferme INNOVA si elle est ouverte, puis double-clique sur Lancer-INNOVA.bat.
)
pause
exit /b 0
