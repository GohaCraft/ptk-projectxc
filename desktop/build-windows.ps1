# ============================================================
#  Сборка модели ЗГУ в Windows-установщик (.exe) — PowerShell
#  Результат: desktop\output\ZGU-3D-Model-Setup-<версия>.exe
# ============================================================
$ErrorActionPreference = "Stop"

# Корень проекта = на уровень выше этого скрипта
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "[1/3] Установка зависимостей..." -ForegroundColor Cyan
npm install

Write-Host "[2/3] Статический экспорт веб-модели (out\)..." -ForegroundColor Cyan
npm run desktop:export

Write-Host "[3/3] Сборка Windows-установщика (electron-builder)..." -ForegroundColor Cyan
npm run desktop:dist

Write-Host ""
Write-Host "ГОТОВО! Установщик: desktop\output\ZGU-3D-Model-Setup-<версия>.exe" -ForegroundColor Green
