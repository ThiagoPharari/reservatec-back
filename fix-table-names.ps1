# Script de Corrección de Nombres de Tablas SQL
# Este script corrige todas las referencias a nombres de tablas en mayúsculas

# IMPORTANTE: Ejecutar este script desde PowerShell en la raíz del proyecto backend

Write-Host "🔧 Corrigiendo nombres de tablas SQL en reservation.service.js..." -ForegroundColor Yellow

$archivo = "src\reservations\services\reservation.service.js"
$contenido = Get-Content $archivo -Raw

# Reemplazar nombres de tablas en mayúsculas por minúsculas
$contenido = $contenido -replace 'FROM Reservas\b', 'FROM reservas'
$contenido = $contenido -replace 'FROM Usuarios\b', 'FROM usuarios'
$contenido = $contenido -replace 'FROM Areas\b', 'FROM areas'
$contenido = $contenido -replace 'FROM Horarios\b', 'FROM horarios'
$contenido = $contenido -replace 'INTO Reservas\b', 'INTO reservas'
$contenido = $contenido -replace 'UPDATE Reservas\b', 'UPDATE reservas'
$contenido = $contenido -replace 'JOIN Reservas\b', 'JOIN reservas'
$contenido = $contenido -replace 'JOIN Usuarios\b', 'JOIN usuarios'
$contenido = $contenido -replace 'JOIN Areas\b', 'JOIN areas'
$contenido = $contenido -replace 'JOIN Horarios\b', 'JOIN horarios'
$contenido = $contenido -replace 'INNER JOIN Comentarios\b', 'INNER JOIN comentarios'
$contenido = $contenido -replace 'LEFT JOIN Comentarios\b', 'LEFT JOIN comentarios'

Set-Content $archivo $contenido

Write-Host "✅ Corrección completada en reservation.service.js" -ForegroundColor Green

Write-Host "🔧 Corrigiendo nombres de tablas SQL en report.service.js..." -ForegroundColor Yellow

$archivo2 = "src\reports\services\report.service.js"
if (Test-Path $archivo2) {
    $contenido2 = Get-Content $archivo2 -Raw
    $contenido2 = $contenido2 -replace 'FROM Reservas\b', 'FROM reservas'
    $contenido2 = $contenido2 -replace 'FROM Usuarios\b', 'FROM usuarios'
    $contenido2 = $contenido2 -replace 'JOIN Reservas\b', 'JOIN reservas'
    $contenido2 = $contenido2 -replace 'JOIN Usuarios\b', 'JOIN usuarios'
    Set-Content $archivo2 $contenido2
    Write-Host "✅ Corrección completada en report.service.js" -ForegroundColor Green
} else {
    Write-Host "⚠️  No se encontró report.service.js" -ForegroundColor Yellow
}

Write-Host "`n✅ TODAS LAS CORRECCIONES COMPLETADAS" -ForegroundColor Green
Write-Host "Puedes ejecutar el servidor ahora con: npm run dev" -ForegroundColor Cyan
