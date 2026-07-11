$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Compiler = 'C:\Toba\modules\libcompiler\Compilers\llvm-mingw_x86_64\bin\x86_64-w64-mingw32-gcc.exe'
$Source = Join-Path $PSScriptRoot 'toba_window_bridge.c'
$Out = Join-Path $Root 'toba_window_bridge.dll'

& $Compiler -shared -O2 -Wall -Wextra -o $Out $Source -luser32
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
Write-Host "built $Out"
