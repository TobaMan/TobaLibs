# Build webview_host.exe (WebView2 backend for libwebui) with MSVC.
#
# Why MSVC and not llvm-mingw: the mingw build pulled in libc++.dll /
# libunwind.dll and could die before main(), and WebView2 behaviour was
# unreliable with that toolchain. MSVC + static WebView2 loader is stable.
#
# Run:
#   powershell -ExecutionPolicy Bypass -File build_webview_host_windows.ps1

$ErrorActionPreference = 'Stop'

$here   = Split-Path -Parent $MyInvocation.MyCommand.Path
$src    = Join-Path $here 'webview_host.cpp'
$incDir = Join-Path $here 'webview'                       # webview/ + WebView2.h
$lib    = Join-Path $here 'WebView2LoaderStatic.lib'
$outExe = Join-Path (Split-Path -Parent $here) 'webview_host.exe'  # ...\libwebui\webview_host.exe

$vcvars = 'C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat'
if (-not (Test-Path $vcvars)) {
    # fall back to vswhere-discovered install
    $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vswhere) {
        $inst = & $vswhere -latest -property installationPath
        if ($inst) { $vcvars = Join-Path $inst 'VC\Auxiliary\Build\vcvars64.bat' }
    }
}
if (-not (Test-Path $vcvars)) { throw "vcvars64.bat introuvable: $vcvars" }

Write-Host "Source : $src"
Write-Host "Include: $incDir"
Write-Host "Loader : $lib"
Write-Host "Output : $outExe"
Write-Host "vcvars : $vcvars"

# cl options:
#   /std:c++17 /EHsc /O2 /MT   (static CRT so no libc++/runtime DLLs needed)
#   /I include dir for webview + WebView2.h
#   /SUBSYSTEM:WINDOWS /ENTRY:mainCRTStartup  (GUI app but keep int main)
$libs = 'ole32.lib comctl32.lib oleaut32.lib uuid.lib version.lib shlwapi.lib user32.lib shell32.lib advapi32.lib dwmapi.lib'

$cl = "cl /nologo /std:c++17 /EHsc /O2 /MT /DUNICODE /D_UNICODE " +
      "/I `"$incDir`" `"$src`" /Fe:`"$outExe`" " +
      "/link /SUBSYSTEM:WINDOWS /ENTRY:mainCRTStartup `"$lib`" $libs"

$cmd = "call `"$vcvars`" >nul && $cl"
Write-Host "`n--- compiling ---"
& cmd.exe /c $cmd
if ($LASTEXITCODE -ne 0) { throw "compilation echouee (exit $LASTEXITCODE)" }

if (Test-Path $outExe) {
    Write-Host "`nOK -> $outExe"
    Get-Item $outExe | Select-Object Name, Length, LastWriteTime
} else {
    throw "webview_host.exe non genere"
}
