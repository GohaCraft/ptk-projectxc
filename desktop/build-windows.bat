@echo off
REM ============================================================
REM  Сборка модели ЗГУ в Windows-установщик (.exe)
REM  Запускать из корня проекта или двойным кликом.
REM  Результат: desktop\output\ZGU-3D-Model-Setup-<версия>.exe
REM ============================================================
setlocal
chcp 65001 >nul

REM Перейти в корень проекта (на уровень выше этой папки)
cd /d "%~dp0\.."

echo.
echo [1/3] Установка зависимостей...
call npm install
if errorlevel 1 goto :err

echo.
echo [2/3] Статический экспорт веб-модели (out\)...
call npm run desktop:export
if errorlevel 1 goto :err

echo.
echo [3/3] Сборка Windows-установщика (electron-builder)...
call npm run desktop:dist
if errorlevel 1 goto :err

echo.
echo ============================================================
echo  ГОТОВО! Установщик лежит в:  desktop\output\
echo  Файл вида: ZGU-3D-Model-Setup-<версия>.exe
echo ============================================================
echo.
pause
exit /b 0

:err
echo.
echo !!! Сборка прервана из-за ошибки. Смотри сообщения выше.
echo.
pause
exit /b 1
