# Code Signing and Distribution Setup

This document explains how to set up code signing for Mindlayer desktop releases.

## Prerequisites

Before setting up code signing, you need:

1. **Apple Developer Account** ($99/year) for macOS code signing and notarization
2. **Windows Code Signing Certificate** (optional, for EV signing)
3. **GitHub repository secrets** configured

## GitHub Secrets Required

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

### macOS Signing

| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64-encoded .p12 certificate file |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the .p12 file |
| `APPLE_SIGNING_IDENTITY` | Certificate name (e.g., "Developer ID Application: Your Name (TEAMID)") |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_PASSWORD` | App-specific password (generate at appleid.apple.com) |
| `APPLE_TEAM_ID` | Your 10-character Team ID |
| `KEYCHAIN_PASSWORD` | Temporary password for CI keychain |

### Tauri Updater

| Secret | Description |
|--------|-------------|
| `TAURI_SIGNING_PRIVATE_KEY` | Private key for update signatures |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the private key |

### Windows Signing (Optional)

| Secret | Description |
|--------|-------------|
| `WINDOWS_CERTIFICATE` | Base64-encoded .pfx certificate |
| `WINDOWS_CERTIFICATE_PASSWORD` | Password for the .pfx file |

## Setup Instructions

### 1. Generate Tauri Updater Keys

```bash
# Generate a new key pair for the updater
npx @tauri-apps/cli signer generate -w ~/.tauri/mindlayer.key

# This creates:
# - ~/.tauri/mindlayer.key (private key - keep secure!)
# - ~/.tauri/mindlayer.key.pub (public key - add to tauri.conf.json)
```

Add the public key to `tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### 2. macOS Code Signing

#### Create Certificate

1. Go to Apple Developer > Certificates, Identifiers & Profiles
2. Create a "Developer ID Application" certificate
3. Download and install in Keychain Access
4. Export as .p12 file with a password

#### Encode for GitHub

```bash
# Encode certificate to base64
base64 -i ~/path/to/certificate.p12 | pbcopy
# Paste into APPLE_CERTIFICATE secret
```

#### Create App-Specific Password

1. Go to appleid.apple.com > Sign-In and Security > App-Specific Passwords
2. Generate a new password for "Mindlayer CI"
3. Add to APPLE_PASSWORD secret

### 3. Windows Code Signing (Optional)

If you have an EV code signing certificate:

```bash
# Encode certificate to base64
base64 -i ~/path/to/certificate.pfx | pbcopy
# Paste into WINDOWS_CERTIFICATE secret
```

Update `tauri.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERTIFICATE_THUMBPRINT"
    }
  }
}
```

## Building a Release

### Manual Release

```bash
# Create and push a tag
git tag v0.1.0
git push origin v0.1.0

# This triggers the release workflow
```

### Workflow Dispatch

1. Go to Actions > Release Desktop App
2. Click "Run workflow"
3. Enter the version (e.g., "0.1.0")
4. Click "Run workflow"

## Local Development Builds

For local development, you can build unsigned versions:

```bash
cd apps/desktop

# Build for current platform
npm run tauri build

# Build for specific target (macOS)
npm run tauri build -- --target aarch64-apple-darwin
npm run tauri build -- --target x86_64-apple-darwin
```

## Notarization Troubleshooting

If notarization fails:

1. Check that your Apple ID has accepted the latest agreements
2. Verify the app-specific password is correct
3. Ensure the Team ID matches your certificate
4. Check the notarization log:

```bash
xcrun notarytool log <submission-id> --apple-id YOUR_APPLE_ID --password YOUR_APP_SPECIFIC_PASSWORD --team-id YOUR_TEAM_ID
```

## Auto-Update Setup

The app checks for updates at the endpoints configured in `tauri.conf.json`. For self-hosted updates:

1. Create a JSON endpoint that returns update information
2. Sign the update bundles with your private key
3. Host the update files (DMG, AppImage, NSIS installer)

Example update response:

```json
{
  "version": "v0.2.0",
  "notes": "Bug fixes and improvements",
  "pub_date": "2024-01-15T12:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "...",
      "url": "https://releases.example.com/Mindlayer_0.2.0_aarch64.dmg"
    }
  }
}
```
