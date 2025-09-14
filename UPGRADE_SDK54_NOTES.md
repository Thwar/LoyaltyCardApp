# Expo SDK 54 Upgrade Notes

Date: 2025-09-11

## Summary

Project upgraded from SDK 53 -> 54. React Native 0.79.x -> 0.81.4 and React 19.0.0 -> 19.1.0.

## Key Dependency Changes

- expo 53.0.20 -> 54.0.1
- react-native 0.79.5 -> 0.81.4 (New Architecture already enabled via `newArchEnabled=true`)
- react 19.0.0 -> 19.1.0
- Upgraded all first-party expo packages to SDK 54 ranges
- Added `react-native-worklets` (peer dependency for Reanimated v4)
  // NOTE: An experimental Liquid Glass dropdown (using `expo-glass-effect`) was trialed during the upgrade but later removed to retain the original dropdown behavior.
- Migrated from `expo-av` to `expo-audio` for short UI sounds (removed `expo-av`)

## Removed Experimental Component

An experimental `GlassDropdown` component was added then removed after UX validation on iOS. The legacy `Dropdown` remains the canonical component.

## Follow-Up Recommendations

1. (Done) Migrated away from `expo-av` to `expo-audio`; add `expo-video` later if video playback is needed.
2. Remove native `android/` (and generate fresh with `npx expo prebuild`) if you want app.config.js changes to auto-sync (currently flagged by `expo-doctor`). Alternatively keep the directories and manually reflect config changes natively.
3. Deduplicate `expo-dev-menu` versions if it causes build/runtime issues (currently two versions pulled via `expo-dev-launcher`). Usually resolved by clearing lockfile + reinstall.

## Android Notes

- Edge-to-edge enabled (expected with target API 36 in RN 0.81).
- No immediate Gradle plugin changes required; continue monitoring release notes for AGP mismatches.

## iOS Notes

- For Liquid Glass icons you can later add an `.icon` bundle and set `ios.icon` to the generated file.
- Xcode 26 recommended for building (handled automatically on EAS with SDK 54 images).

## Validation Performed

- Dependency alignment via `expo install --fix` (manual conflict resolution for types).
- TypeScript check: `npx tsc --noEmit` passed.
- `expo-doctor` run; remaining warnings documented above.

## Migration Checklist (Completed)

- [x] Bump core Expo + RN dependencies
- [x] Install Reanimated v4 + `react-native-worklets`
- [x] Add Liquid Glass dropdown component
- [x] Type-check passes

---

If issues arise during native build, clear caches and rebuild:

- `rm -rf node_modules package-lock.json && npm install`
- `npx expo prebuild --clean` (if adopting full prebuild regeneration)
