/**
 * Centralized app configuration constants.
 *
 * IMPORTANT: When releasing a new desktop/extension/Android version, update
 * APP_VERSION here. All download links and install UIs read from this value,
 * so a single update keeps every surface in sync with the GitHub release.
 *
 * This value MUST match:
 *   - mindlair/apps/desktop/src-tauri/tauri.conf.json -> "version"
 *   - mindlair/apps/desktop/package.json              -> "version"
 *   - The git tag used to trigger .github/workflows/release-desktop.yml (vX.Y.Z)
 */
export const APP_VERSION = "0.2.0";

export const GITHUB_REPO = "RemyTasked/Mindlair";

export const ANDROID_APK_FILE = `mindlair-${APP_VERSION}-debug.apk`;

export const DESKTOP_DOWNLOADS = [
  { os: "mac", label: "macOS (Apple Silicon)", file: `Mindlair_${APP_VERSION}_aarch64.dmg` },
  { os: "windows", label: "Windows", file: `Mindlair_${APP_VERSION}_x64-setup.exe` },
  { os: "linux", label: "Linux (AppImage)", file: `Mindlair_${APP_VERSION}_amd64.AppImage` },
] as const;

export const EXTENSION_DOWNLOADS = {
  chrome: `mindlair-chrome-${APP_VERSION}.zip`,
  firefox: `mindlair-firefox-${APP_VERSION}.zip`,
  edge: `mindlair-edge-${APP_VERSION}.zip`,
} as const;
