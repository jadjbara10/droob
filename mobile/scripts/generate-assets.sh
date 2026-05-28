#!/bin/bash
# ============================================================================
# دروب (Droob) — Asset Generation Script
# Converts SVG source files → required PNG sizes using Inkscape or rsvg
# ============================================================================

set -e

ASSETS_DIR="$(dirname "$0")/../assets/images"
SOURCE_ICON="$ASSETS_DIR/icon-source.svg"
SOURCE_SPLASH="$ASSETS_DIR/splash-source.svg"
SOURCE_ADAPTIVE="$ASSETS_DIR/adaptive-icon-foreground.svg"

OUTPUT_DIR="$ASSETS_DIR"

# Check for required tools
if command -v rsvg-convert &> /dev/null; then
  CONVERTER="rsvg-convert"
elif command -v inkscape &> /dev/null; then
  CONVERTER="inkscape"
else
  echo "ERROR: Install librsvg (rsvg-convert) or Inkscape"
  echo "  macOS: brew install librsvg"
  echo "  Ubuntu: sudo apt install librsvg2-bin"
  exit 1
fi

echo "Generating app icon sizes..."

# iOS icon sizes (pt)
declare -A IOS_SIZES=(
  ["icon-20"]=20
  ["icon-29"]=29
  ["icon-40"]=40
  ["icon-60"]=60
  ["icon-76"]=76
  ["icon-83.5"]=83.5
)

# Generate iOS icons with @2x and @3x
for name in "${!IOS_SIZES[@]}"; do
  pt="${IOS_SIZES[$name]}"
  for scale in 2 3; do
    px=$(echo "$pt * $scale" | bc)
    if [ "$CONVERTER" = "rsvg-convert" ]; then
      rsvg-convert -w "$px" -h "$px" "$SOURCE_ICON" -o "$OUTPUT_DIR/${name}@${scale}x.png"
      echo "  ✓ ${name}@${scale}x.png (${px}x${px})"
    fi
  done
done

# Android adaptive icon: foreground (108dp × 108dp at 4x = 432×432)
if [ "$CONVERTER" = "rsvg-convert" ]; then
  rsvg-convert -w 432 -h 432 "$SOURCE_ADAPTIVE" -o "$OUTPUT_DIR/adaptive-icon.png"
  echo "  ✓ adaptive-icon.png (432x432)"
fi

# Google Play Store icon (512×512)
if [ "$CONVERTER" = "rsvg-convert" ]; then
  rsvg-convert -w 512 -h 512 "$SOURCE_ICON" -o "$OUTPUT_DIR/icon-playstore.png"
  echo "  ✓ icon-playstore.png (512x512)"
fi

# App Store icon (1024×1024)
if [ "$CONVERTER" = "rsvg-convert" ]; then
  rsvg-convert -w 1024 -h 1024 "$SOURCE_ICON" -o "$OUTPUT_DIR/icon.png"
  echo "  ✓ icon.png (1024x1024)"
fi

# Splash screen (1284×2778 — iPhone 14 Pro Max)
if [ "$CONVERTER" = "rsvg-convert" ]; then
  rsvg-convert -w 1284 -h 2778 "$SOURCE_SPLASH" -o "$OUTPUT_DIR/splash.png"
  echo "  ✓ splash.png (1284x2778)"
fi

echo ""
echo "All assets generated in: $OUTPUT_DIR"
echo "Now run: npx expo prebuild --clean"
