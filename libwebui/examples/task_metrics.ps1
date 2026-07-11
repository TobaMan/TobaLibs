$ErrorActionPreference = "SilentlyContinue"

$cpu = 0
$cpuCounter = Get-Counter '\Processor(_Total)\% Processor Time'
if ($cpuCounter -and $cpuCounter.CounterSamples) {
    $cpu = [math]::Round([double]$cpuCounter.CounterSamples[0].CookedValue, 1)
}

$ramPercent = 0
$ramUsedMb = 0
$ramTotalMb = 0
Add-Type -AssemblyName Microsoft.VisualBasic
$info = [Microsoft.VisualBasic.Devices.ComputerInfo]::new()
if ($info) {
    $ramTotalMb = [math]::Round(([double]$info.TotalPhysicalMemory) / 1MB, 0)
    $ramAvailMb = [math]::Round(([double]$info.AvailablePhysicalMemory) / 1MB, 0)
    if ($ramTotalMb -gt 0) {
        $ramUsedMb = [math]::Round($ramTotalMb - $ramAvailMb, 0)
        $ramPercent = [math]::Round(($ramUsedMb / $ramTotalMb) * 100, 1)
    }
}

$gpuList = @()
$adapters = Get-WmiObject Win32_VideoController
$idx = 0
foreach ($adapter in $adapters) {
    $totalMb = 0
    if ($adapter.AdapterRAM) {
        $totalMb = [math]::Round(([double]$adapter.AdapterRAM) / 1MB, 0)
    }
    $gpuList += [pscustomobject]@{
        id = $idx
        name = [string]$adapter.Name
        vramUsedMb = 0
        vramTotalMb = $totalMb
        vramPercent = 0
    }
    $idx++
}

$dedicated = 0
$counter = Get-Counter '\GPU Adapter Memory(*)\Dedicated Usage'
if ($counter -and $counter.CounterSamples) {
    foreach ($sample in $counter.CounterSamples) {
        $dedicated += [double]$sample.CookedValue
    }
}
$dedicatedMb = [math]::Round($dedicated / 1MB, 0)

if ($gpuList.Count -gt 0) {
    $gpuList[0].vramUsedMb = $dedicatedMb
    if ($gpuList[0].vramTotalMb -gt 0) {
        $gpuList[0].vramPercent = [math]::Round(($dedicatedMb / $gpuList[0].vramTotalMb) * 100, 1)
    }
}

$vramTotal = 0
foreach ($gpu in $gpuList) {
    $vramTotal += [double]$gpu.vramTotalMb
}
$vramPercent = 0
if ($vramTotal -gt 0) {
    $vramPercent = [math]::Round(($dedicatedMb / $vramTotal) * 100, 1)
}

[pscustomobject]@{
    ts = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    cpu = $cpu
    ramPercent = $ramPercent
    ramUsedMb = $ramUsedMb
    ramTotalMb = $ramTotalMb
    vramPercent = $vramPercent
    vramUsedMb = $dedicatedMb
    vramTotalMb = $vramTotal
    gpus = $gpuList
} | ConvertTo-Json -Compress -Depth 5
