@echo off
setlocal EnableExtensions
title Grand Sirenis Locker App - Servidor local
cd /d "%~dp0"

echo.
echo  Grand Sirenis Locker App
echo  Carpeta del proyecto: %CD%
echo  ------------------------------------------------------------

rem 1. PHP: se prefiere XAMPP por sus extensiones pdo_mysql y session.
set "PHPCMD="
if exist "C:\xampp\php\php.exe" set "PHPCMD=C:\xampp\php\php.exe"
if not defined PHPCMD (
  where php >nul 2>nul
  if not errorlevel 1 set "PHPCMD=php"
)
if not defined PHPCMD (
  echo  [ERROR] No se encontro PHP. Instala PHP o revisa C:\xampp\php.
  pause
  exit /b 1
)

rem 2. Si el puerto 8000 ya escucha, no se duplica el servidor.
call :port_open 8000
if not errorlevel 1 (
  echo  El servidor ya esta activo en http://127.0.0.1:8000/
  start "" "http://127.0.0.1:8000/"
  ping -n 4 127.0.0.1 >nul
  exit /b 0
)

rem 3. MySQL: se inicia con XAMPP solo si el puerto 3306 esta cerrado.
call :port_open 3306
if not errorlevel 1 (
  echo  MySQL ya esta activo.
) else (
  if exist "C:\xampp\mysql_start.bat" (
    echo  Iniciando MySQL de XAMPP...
    start "MySQL XAMPP" /min "C:\xampp\mysql_start.bat"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0;$i -lt 20;$i++){ try { $c=New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',3306); $c.Close(); $ok=$true; break } catch { Start-Sleep -Milliseconds 700 } }; if($ok){exit 0}else{exit 1}"
    if errorlevel 1 (
      echo  [AVISO] MySQL no respondio. La portada funciona; el acceso puede fallar.
    ) else (
      echo  MySQL listo.
    )
  ) else (
    echo  [AVISO] MySQL no esta activo. Enciende XAMPP/MySQL para iniciar sesion.
  )
)

echo.
echo  Servidor PHP: http://127.0.0.1:8000/
echo  Pantalla inicial: Welcome (redirige al dashboard si ya hay sesion).
echo  Detener el servidor: Ctrl + C en esta ventana.
echo.

rem 4. Abrir el navegador con retraso y servir la carpeta public/ en primer plano.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:8000/'"
"%PHPCMD%" -S 127.0.0.1:8000 -t public

endlocal
exit /b 0

:port_open
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=New-Object Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1','%~1'); exit 0 } catch { exit 1 } finally { $c.Close() }" >nul 2>nul
exit /b %errorlevel%
