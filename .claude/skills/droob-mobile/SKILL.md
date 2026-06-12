---
name: droob-mobile
description: Droob Mobile App — React Native + Expo 54 with OpenStreetMap. Build APK locally, run on device, and connect to the Droob backend API.
---

# Droob Mobile Skill

## Architecture

- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router (file-based routing)
- **Map**: OpenStreetMap via custom LeafletMap.tsx component (NO Google Maps)
- **State Management**: React Context + hooks
- **HTTP Client**: fetch API with JWT token interceptor
- **Secure Storage**: expo-secure-store for tokens
- **UI**: Custom components + SafeAreaView for navigation
- **Build**: Local Gradle Build (Android), NOT EAS Build

## Directory Structure

```
mobile/
├── app/                    # Expo Router screens (file-based)
│   ├── (tabs)/             # Tab-based screens
│   │   ├── index.tsx       # Home / Map screen
│   │   ├── routes.tsx      # Transit routes list
│   │   ├── trips.tsx       # My trips
│   │   └── profile.tsx     # User profile
│   ├── auth/
│   │   ├── login.tsx       # Login screen
│   │   └── register.tsx    # Register screen
│   ├── trip/
│   │   ├── plan.tsx        # Trip planning screen
│   │   ├── [id].tsx        # Trip details
│   │   └── confirm.tsx     # Trip confirmation
│   └── _layout.tsx         # Root layout
├── components/
│   ├── LeafletMap.tsx       # OpenStreetMap wrapper
│   ├── RouteCard.tsx        # Transit route card
│   ├── StopMarker.tsx       # Bus stop marker
│   └── TripCard.tsx         # Trip summary card
├── lib/
│   ├── api.ts              # API client (https://api.droob-jo.com)
│   ├── auth.ts             # Token storage & refresh logic
│   └── types.ts            # TypeScript types
├── assets/                 # Images, fonts, icons
├── app.json                # Expo config
├── package.json
└── tsconfig.json
```

## Build & Run Commands

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on Android emulator
npx expo start --android

# Run on iOS simulator
npx expo start --ios

# Build APK (local Gradle)
cd android && ./gradlew assembleRelease

# APK output location
# android/app/build/outputs/apk/release/app-release.apk

# Build AAB for Play Store
cd android && ./gradlew bundleRelease
```

## API Configuration

- **Base URL**: `https://api.droob-jo.com`
- **Config file**: `mobile/lib/api.ts`
- All API calls go through the Cloudflare Worker proxy at `api.droob-jo.com`

## Map Setup

The app uses **OpenStreetMap** (free, no API key required):

- Component: `components/LeafletMap.tsx`
- Tile source: OpenStreetMap tiles
- **No Google Maps API key needed**
- `MAPS_API_KEY` is NOT required — it was removed from eas.json and app.json

## Required Environment

| Variable         | Purpose                    | Required |
|------------------|----------------------------|----------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | Yes (`https://api.droob-jo.com`) |

## Constraints & Warnings

1. **No Google Maps** — Do NOT add Google Maps dependencies or API keys
2. **No EAS Build** — Build APK locally with `./gradlew assembleRelease`
3. **SecureStore only** — Store JWT tokens in expo-secure-store, NEVER AsyncStorage
4. **SafeArea required** — Tab navigator must wrap in SafeAreaView for proper rendering
5. **API URL is hardcoded** — Change in `lib/api.ts` only, not scattered across files
6. **17 screens total** — All screens are under `app/` directory

## Verification Checklist

- [ ] `npx expo start` runs without errors
- [ ] `cd android && ./gradlew assembleRelease` builds APK successfully
- [ ] APK installs and runs on Android device
- [ ] Map displays OpenStreetMap tiles (no blank map)
- [ ] Login/Register works with API
- [ ] Trip planning shows route on map
- [ ] Token stored in SecureStore, not AsyncStorage
- [ ] Tab navigator has SafeArea padding
- [ ] All 17 screens navigable
- [ ] 0 TypeScript errors in `npx tsc --noEmit`
