# Career Campus APK Build Fixes - Documentation

## Overview
This document outlines all the issues encountered during the APK build process and the solutions implemented to get the build working successfully.

## Issues Encountered & Solutions

### 1. **pnpm Version Incompatibility**

**Problem:**
- `package.json` required `pnpm >= 10.0.0`
- `pnpm-lock.yaml` was locked to version 9.0
- CI/CD builds failed with: `ERR_PNPM_UNSUPPORTED_ENGINE`

**Solution:**
- Updated `package.json` engines field from `pnpm >= 10.0.0` to `pnpm >= 9.0.0`
- This matched the actual lockfile version without requiring regeneration

**File Changed:** `package.json`
```json
"engines": {
  "pnpm": ">=9.0.0"
}
```

---

### 2. **Node.js Version Conflict**

**Problem:**
- Initial workflow required Node.js v22.18.0
- Expo build environment only provides Node v20.19.4
- Build failed: `ERR_PNPM_UNSUPPORTED_ENGINE: Your Node version is incompatible with "orval@8.10.0"`
- orval v8.10.0 requires Node >=22.18.0, but we can't control Expo's environment

**Solution:**
- Removed the explicit Node.js version requirement from `package.json`
- Downgraded orval to v6.31.0 which is compatible with Node 20
- Updated `pnpm-lock.yaml` with the new dependency versions

**Files Changed:**
- `package.json`: Removed `"node": ">=22.18.0"`
- `lib/api-spec/package.json`: Changed `orval` from `^8.5.2` to `^6.31.0`
- Regenerated `pnpm-lock.yaml` using `pnpm install --no-frozen-lockfile`

---

### 3. **Build Approach: EAS vs Local Gradle**

**Problem:**
- Original workflow used EAS (Expo Application Services) cloud builds
- EAS has several issues:
  - Complex Node version requirements
  - APK download logic was fragile and unreliable
  - Multiple failure points in the download/artifact discovery process
  - External dependency on EAS service availability

**Solution:**
- Switched to local Gradle build approach
- Uses `expo prebuild` to generate native Android code locally
- Builds directly with `./gradlew assembleRelease`
- This approach:
  - Has full control over the build process
  - Generates APK directly in predictable location
  - No external service dependencies
  - Proven to work (tested on other Expo projects)

**Workflow Changes:**
```yaml
# OLD (EAS approach - problematic)
- pnpm exec eas build --platform android
- pnpm exec eas build:download --build-id "$BUILD_ID"
- Complex APK discovery logic

# NEW (Local Gradle - working)
- npx expo prebuild --clean --platform android --no-install
- cd android && ./gradlew assembleRelease
- APK output in standard gradle location
```

---

### 4. **Expo Prebuild Interactive Prompt**

**Problem:**
- `expo prebuild` prompts for user confirmation to install dependencies
- In CI/CD non-interactive mode, this causes:
```
CommandError: Input is required, but 'npx expo' is in non-interactive mode.
Required input: > Install the updated dependencies?
```

**Solution:**
- Used `--no-install` flag to skip prebuild's install step
- Dependencies are already installed by `pnpm install` at root level
- No additional installation needed during prebuild

**Workflow Step:**
```yaml
- name: Build APK with Expo
  working-directory: artifacts/mobile
  run: |
    npx expo prebuild --clean --platform android --no-install
    cd android
    chmod +x ./gradlew
    ./gradlew assembleRelease
```

---

### 5. **Dependency Installation in Workflow**

**Changes Made:**
- Kept `pnpm/action-setup@v2` (more stable than v4)
- Set pnpm version to 10
- Run `pnpm install` at root level before building
- This installs all workspace dependencies including the mobile app

---

## Final Working Workflow

### Environment Setup
- **Node.js:** v20 (GitHub Actions setup-node)
- **Java:** v17 (Temurin distribution)
- **pnpm:** v10 (via action-setup)

### Build Steps
1. Checkout repository
2. Setup Node.js v20
3. Setup Java v17 (required for Gradle)
4. Setup pnpm v10
5. Install all dependencies: `pnpm install`
6. Prebuild Android native files: `npx expo prebuild --clean --platform android --no-install`
7. Build APK: `./gradlew assembleRelease`
8. Upload artifact to GitHub Actions

### Artifacts Generated
- **Location:** `artifacts/mobile/android/app/build/outputs/apk/release/app-release.apk`
- **Artifact Name:** `career-compass-apk`
- **Retention:** 30 days

---

## Key Learnings

1. **Version Compatibility Matters:** Always ensure lockfile versions match package.json requirements
2. **Local Builds > Cloud Builds:** For CI/CD, local builds give more control and reliability
3. **Non-Interactive Mode:** CI environments require special flags to avoid prompts (e.g., `--no-install`)
4. **Gradle Builds are Standard:** Using Android's native build tools (Gradle) is more reliable than Expo's cloud service
5. **Dependencies Must Be Installed First:** Prebuild needs access to all dependencies before running

---

## Configuration Files Modified

1. **package.json** - Updated pnpm engine requirement
2. **lib/api-spec/package.json** - Downgraded orval version
3. **pnpm-lock.yaml** - Regenerated with new dependency versions
4. **.github/workflows/build-apk.yml** - Complete workflow rewrite

---

## Testing Checklist

- [x] pnpm install completes without version errors
- [x] Expo prebuild generates Android code without interactive prompts
- [x] Gradle build completes successfully
- [x] APK artifact is found in expected location
- [x] APK is uploaded to GitHub Actions artifacts
- [x] Build is installable on Android devices

---

## Rollback Information

If issues arise, the commits are:
1. `0c162d6` - Latest working version with --no-install flag
2. Revert to previous version if needed: `git revert <commit-hash>`

---

## Future Improvements

1. Add code signing for release builds
2. Automate APK upload to Play Store
3. Add build caching to speed up Gradle builds
4. Implement testing in CI pipeline
5. Monitor build performance metrics
