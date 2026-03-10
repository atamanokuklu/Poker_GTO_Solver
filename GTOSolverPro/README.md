# GTO Solver Pro Native

Expo-managed React Native port of the Texas Hold'em GTO trainer.

## Android emulator workflow

This project includes a Windows PowerShell launcher that:

- finds the Android SDK automatically from the default Android Studio install location
- adds `platform-tools` and `emulator` to `PATH` for the current run
- starts your first available AVD if no emulator is already running
- waits for Android to finish booting
- launches Expo directly into the emulator on a free local port

### Commands

From `GTOSolverPro/`:

- `npm run android:avds` lists available Android Virtual Devices
- `npm run android:devices` lists connected Android devices/emulators
- `npm run android:emulator` boots the emulator if needed and opens the Expo app on Android

### Optional AVD selection

If you want to target a specific AVD:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/run-android.ps1 -AvdName "Medium_Phone_API_36.1"
```

### Notes

- Default SDK discovery path is `C:\Users\Ataman\AppData\Local\Android\Sdk` unless `ANDROID_HOME` or `ANDROID_SDK_ROOT` is set.
- The current machine already has the AVD `Medium_Phone_API_36.1` available.
- Use `npm exec --yes expo-doctor` to validate the Expo setup before building.