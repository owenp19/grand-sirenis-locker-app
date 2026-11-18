@echo off
setlocal
cd /d "%~dp0"
where php >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  set "PHPCMD=php"
) else (
  if exist "C:\xampp\php\php.exe" (
    set "PHPCMD=C:\xampp\php\php.exe"
  ) else (
    echo No se encontro PHP. Instala PHP o revisa la carpeta C:\xampp\php.
    pause
    exit /b 1
  )
)
echo.
echo  LockerFlow - Servidor PHP local
 echo  URL: http://127.0.0.1:8000/login.php
 echo  IMPORTANTE: MySQL debe estar encendido por separado.
echo.
"%PHPCMD%" -S 127.0.0.1:8000 -t public
endlocal
