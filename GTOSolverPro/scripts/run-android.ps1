param(
  [string]$AvdName,
  [switch]$ListAvds,
  [switch]$ListDevices,
  [switch]$SkipExpo,
  [int]$Port = 0
)

$ErrorActionPreference = 'Stop'

function Get-AndroidSdkPath {
  $candidates = @(
    $env:ANDROID_SDK_ROOT,
    $env:ANDROID_HOME,
    (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
  ) | Where-Object { $_ }

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw 'Android SDK not found. Install Android Studio SDK or set ANDROID_SDK_ROOT.'
}

function Set-AndroidEnvironment {
  param([string]$SdkPath)

  $env:ANDROID_HOME = $SdkPath
  $env:ANDROID_SDK_ROOT = $SdkPath

  $paths = @(
    (Join-Path $SdkPath 'platform-tools'),
    (Join-Path $SdkPath 'emulator')
  )

  foreach ($pathEntry in $paths) {
    if ((Test-Path $pathEntry) -and -not ($env:Path -split ';' | Where-Object { $_ -eq $pathEntry })) {
      $env:Path = "$pathEntry;$env:Path"
    }
  }
}

function Get-AvdNames {
  $avds = & emulator -list-avds
  return @($avds | Where-Object { $_ -and $_.Trim() })
}

function Get-FreePort {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  $freePort = $listener.LocalEndpoint.Port
  $listener.Stop()
  return $freePort
}

function Wait-ForAndroidBoot {
  param([int]$TimeoutSeconds = 180)

  & adb wait-for-device | Out-Null

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    Start-Sleep -Seconds 2
    try {
      $bootCompleted = (& adb shell getprop sys.boot_completed 2>$null).Trim()
      if ($bootCompleted -eq '1') {
        & adb shell input keyevent 82 | Out-Null
        return
      }
    } catch {
    }
  } while ((Get-Date) -lt $deadline)

  throw 'Android emulator did not finish booting within the timeout.'
}

function Get-ConnectedDevices {
  $lines = & adb devices
  return @(
    $lines |
      Select-Object -Skip 1 |
      Where-Object { $_ -match '\tdevice$' } |
      ForEach-Object { ($_ -split "`t")[0] }
  )
}

$sdkPath = Get-AndroidSdkPath
Set-AndroidEnvironment -SdkPath $sdkPath

if ($ListAvds) {
  Get-AvdNames
  exit 0
}

if ($ListDevices) {
  Get-ConnectedDevices
  exit 0
}

$devices = Get-ConnectedDevices
if (-not $devices.Count) {
  $availableAvds = Get-AvdNames
  if (-not $availableAvds.Count) {
    throw 'No Android Virtual Devices were found. Create one in Android Studio Device Manager first.'
  }

  if (-not $AvdName) {
    $AvdName = $availableAvds[0]
  }

  if ($availableAvds -notcontains $AvdName) {
    throw "AVD '$AvdName' was not found. Available AVDs: $($availableAvds -join ', ')"
  }

  Write-Host "Starting Android emulator '$AvdName'..."
  Start-Process -FilePath (Join-Path $sdkPath 'emulator\emulator.exe') -ArgumentList @('-avd', $AvdName) | Out-Null
  Wait-ForAndroidBoot
} else {
  Write-Host "Using connected Android device: $($devices -join ', ')"
}

if ($SkipExpo) {
  Write-Host 'Emulator is ready.'
  exit 0
}

if ($Port -le 0) {
  $Port = Get-FreePort
}

Write-Host "Launching Expo on port $Port..."
npx expo start --android --clear --port $Port