# Building Android APK with GitHub Actions

This guide explains how to build the Waffle King POS Android APK automatically using GitHub Actions.

## Prerequisites

1. A GitHub repository with your code
2. Push your code to GitHub (if not already done)

## Quick Start

### Step 1: Push to GitHub

If you haven't already, push your code to GitHub:

```bash
cd C:\Users\user\Downloads\brew-pos-admin\brew-pos
git init
git add .
git commit -m "Add GitHub Actions workflow for APK build"
git branch -M main
```

Then create a repository on GitHub (https://github.com/new) and run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2: Trigger the Build

The APK will be built automatically when you:
- Push to the `main` or `master` branch
- Open a pull request to `main` or `master`
- Manually trigger from the Actions tab in GitHub

### Step 3: Download the APK

1. Go to your repository on GitHub
2. Click on the **Actions** tab
3. Select the latest workflow run
4. Scroll down to the **Artifacts** section
5. Download `Waffle-King-POS-APK.zip`
6. Extract the zip file to get `app-release.apk`

## Manual Trigger

To trigger a build without pushing code:

1. Go to your repository on GitHub
2. Click on the **Actions** tab
3. Select "Build Android APK" from the left sidebar
4. Click "Run workflow" button
5. Select the branch and click "Run workflow"

## What the Workflow Does

The GitHub Actions workflow:
1. Checks out your code
2. Sets up Node.js and installs dependencies
3. Builds the Tailwind CSS
4. Copies web assets to the `www` directory
5. Sets up Java and Android SDK
6. Syncs Capacitor with Android
7. Builds the release APK
8. Uploads the APK as an artifact (available for 30 days)

## APK Details

- **App Name**: Waffle King POS
- **Package ID**: com.waffleking.pos
- **Type**: Release APK (signed with debug key by default)
- **Output**: `app-release.apk`

## Customization

### Change App Name

Edit `capacitor.config.json`:
```json
{
  "appName": "Your App Name"
}
```

### Change Package ID

Edit `capacitor.config.json`:
```json
{
  "appId": "com.yourcompany.app"
}
```

Then update `android/app/src/main/res/values/strings.xml`:
```xml
<string name="package_name">com.yourcompany.app</string>
```

### Add Signing Configuration

For production releases, you'll need to sign the APK with your own keystore. Add to `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file("your-keystore.jks")
            storePassword "your-password"
            keyAlias "your-key-alias"
            keyPassword "your-key-password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

Add your keystore file to GitHub Secrets and reference it in the workflow.

## Troubleshooting

### Build Fails

1. Check the Actions tab for error logs
2. Ensure all files are committed and pushed
3. Verify the workflow file is in `.github/workflows/`

### APK Not Installing

- Enable "Install from unknown sources" in Android settings
- Try uninstalling any previous version first
- Check Android version compatibility (requires Android 5.0+)

### Want to Build Locally?

To build locally, you need:
1. Android Studio installed
2. Set `ANDROID_HOME` environment variable
3. Run: `cd android && ./gradlew assembleRelease`

## Support

For issues with the build process:
- Check GitHub Actions logs
- Review Capacitor documentation: https://capacitorjs.com/docs/android
- Review Android build documentation
