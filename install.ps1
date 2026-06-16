#requires -Version 5.1
<#
  Higgesfield installer (Windows)
  - Enables CEP PlayerDebugMode so the unsigned panel will load
  - Copies the panel into the per-user CEP extensions folder
  - Optionally captures core API keys into ~\.higgesfield\config.json
  Run from the repo folder:
      powershell -ExecutionPolicy Bypass -File .\install.ps1
#>
$ErrorActionPreference = 'Stop'
$ext = 'com.higgesfield'
$src = $PSScriptRoot
$dst = Join-Path $env:APPDATA "Adobe\CEP\extensions\$ext"

Write-Host ""
Write-Host "  Higgesfield - Premiere Pro plugin installer (Windows)" -ForegroundColor Cyan
Write-Host "  -----------------------------------------------------"

# 1) Enable unsigned CEP extensions for Premiere 2022..2025+ (CSXS 9-12)
foreach ($v in 9,10,11,12) {
  $key = "HKCU:\Software\Adobe\CSXS.$v"
  if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
  New-ItemProperty -Path $key -Name 'PlayerDebugMode' -Value '1' -PropertyType String -Force | Out-Null
}
Write-Host "  [1/3] Enabled PlayerDebugMode (CSXS 9-12)" -ForegroundColor Green

# 2) Install files (exclude git/build/runtime dirs)
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
New-Item -ItemType Directory -Force $dst | Out-Null
robocopy $src $dst /E /XD '.git' 'node_modules' 'store' /XF '*.zxp' /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed (code $LASTEXITCODE)" }
Write-Host "  [2/3] Installed to $dst" -ForegroundColor Green

# 3) Optional: capture core API keys
$ans = Read-Host "  Set up API keys now? Core keys power the four pillars. (y/N)"
if ($ans -match '^(y|yes)$') {
  $keys = @{}
  $providers = @(
    @{ id = 'flux';       label = 'Flux (Black Forest Labs) - create character/background images' },
    @{ id = 'kling';      label = 'Kling - animate shots (format: accessKey:secretKey)' },
    @{ id = 'seedance';   label = 'Seedance (BytePlus ModelArk) - video' },
    @{ id = 'elevenlabs'; label = 'ElevenLabs - sound effects' }
  )
  foreach ($p in $providers) {
    $val = Read-Host "    $($p.label) | key (blank = skip)"
    if ($val.Trim()) { $keys[$p.id] = $val.Trim() }
  }
  $ffmpeg = (Read-Host "    ffmpeg path for Auto-Cut (blank = 'ffmpeg' on PATH)").Trim()
  if (-not $ffmpeg) { $ffmpeg = 'ffmpeg' }

  # merge into any existing config so we don't clobber keys set via the panel
  $cfgDir = Join-Path $env:USERPROFILE '.higgesfield'
  New-Item -ItemType Directory -Force $cfgDir | Out-Null
  $cfgPath = Join-Path $cfgDir 'config.json'
  $merged = @{}
  if (Test-Path $cfgPath) {
    try { (Get-Content $cfgPath -Raw | ConvertFrom-Json).keys.PSObject.Properties | ForEach-Object { $merged[$_.Name] = $_.Value } } catch {}
  }
  foreach ($k in $keys.Keys) { $merged[$k] = $keys[$k] }
  $out = [ordered]@{ keys = $merged; defaults = [ordered]@{ ffmpegPath = $ffmpeg; project = 'default' } }
  ($out | ConvertTo-Json -Depth 6) | Set-Content -Encoding utf8 $cfgPath
  Write-Host "  [3/3] Saved keys to $cfgPath" -ForegroundColor Green
} else {
  Write-Host "  [3/3] Skipped - add keys in the panel's Setup wizard or Settings tab." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Done. Restart Premiere Pro  ->  Window  ->  Extensions  ->  Higgesfield" -ForegroundColor Cyan
Write-Host ""
