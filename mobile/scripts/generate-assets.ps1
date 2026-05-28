# ============================================================================
# دروب (Droob) — Asset Generation Script (PowerShell / Windows)
# Uses Inkscape to convert SVG → PNG at required sizes
# ============================================================================

param(
  [switch]$SkipInkscapeCheck
)

$ErrorActionPreference = "Stop"
$ASSETS_DIR = "$PSScriptRoot\..\assets\images"

$SOURCE_ICON = "$ASSETS_DIR\icon-source.svg"
$SOURCE_SPLASH = "$ASSETS_DIR\splash-source.svg"
$SOURCE_ADAPTIVE = "$ASSETS_DIR\adaptive-icon-foreground.svg"

# Try to find Inkscape
$inkscape = $null
if (-not $SkipInkscapeCheck) {
  $inkscape = Get-Command "inkscape" -ErrorAction SilentlyContinue
  if (-not $inkscape) {
    $testPaths = @(
      "C:\Program Files\Inkscape\bin\inkscape.exe",
      "C:\Program Files (x86)\Inkscape\bin\inkscape.exe"
    )
    foreach ($p in $testPaths) {
      if (Test-Path $p) { $inkscape = $p; break }
    }
  }
  if (-not $inkscape) {
    Write-Host "WARNING: Inkscape not found. Install from https://inkscape.org"
    Write-Host "SVG source files are ready in: $ASSETS_DIR"
    Write-Host "Use an online converter or install Inkscape to generate PNGs."
    exit 0
  }
}

Write-Host "Generating app icon sizes..."

# App Store icon (1024x1024)
& $inkscape --export-width=1024 --export-height=1024 --export-filename="$ASSETS_DIR\icon.png" "$SOURCE_ICON" 2>$null
Write-Host "  √ icon.png (1024x1024)"

# Play Store icon (512x512)
& $inkscape --export-width=512 --export-height=512 --export-filename="$ASSETS_DIR\icon-playstore.png" "$SOURCE_ICON" 2>$null
Write-Host "  √ icon-playstore.png (512x512)"

# Android adaptive icon foreground (432x432)
& $inkscape --export-width=432 --export-height=432 --export-filename="$ASSETS_DIR\adaptive-icon.png" "$SOURCE_ADAPTIVE" 2>$null
Write-Host "  √ adaptive-icon.png (432x432)"

# Splash screen (1284x2778)
& $inkscape --export-width=1284 --export-height=2778 --export-filename="$ASSETS_DIR\splash.png" "$SOURCE_SPLASH" 2>$null
Write-Host "  √ splash.png (1284x2778)"

# Notification icon (96x96)
& $inkscape --export-width=96 --export-height=96 --export-filename="$ASSETS_DIR\notification-icon.png" "$SOURCE_ICON" 2>$null
Write-Host "  √ notification-icon.png (96x96)"

# Favicon (48x48)
& $inkscape --export-width=48 --export-height=48 --export-filename="$ASSETS_DIR\favicon.png" "$SOURCE_ICON" 2>$null
Write-Host "  √ favicon.png (48x48)"

Write-Host ""
Write-Host "All assets generated in: $ASSETS_DIR"
Write-Host "Now run: npx expo prebuild --clean"
