param()

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $projectRoot 'assets'

$palette = @{
  Background = [System.Drawing.Color]::FromArgb(255, 10, 15, 13)
  BackgroundSoft = [System.Drawing.Color]::FromArgb(255, 16, 33, 24)
  Accent = [System.Drawing.Color]::FromArgb(255, 201, 168, 76)
  AccentSoft = [System.Drawing.Color]::FromArgb(255, 240, 219, 154)
  Text = [System.Drawing.Color]::FromArgb(255, 240, 240, 232)
  Emerald = [System.Drawing.Color]::FromArgb(255, 46, 204, 113)
  CardFace = [System.Drawing.Color]::FromArgb(255, 244, 240, 232)
  CardBorder = [System.Drawing.Color]::FromArgb(255, 118, 93, 45)
  Transparent = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
}

function New-Bitmap {
  param(
    [int]$Width,
    [int]$Height
  )

  return New-Object System.Drawing.Bitmap -ArgumentList @($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

function Save-Png {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Path
  )

  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $Bitmap.Dispose()
}

function Draw-Logo {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$CanvasSize,
    [bool]$TransparentBackground = $false,
    [bool]$Monochrome = $false
  )

  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  if (-not $TransparentBackground) {
    $backgroundRect = New-Object System.Drawing.RectangleF -ArgumentList @(0, 0, $CanvasSize, $CanvasSize)
    $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList @($backgroundRect, $palette.Background, $palette.BackgroundSoft, 45)
    $Graphics.FillRectangle($gradient, $backgroundRect)
    $gradient.Dispose()

    $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, $palette.Accent))
    $Graphics.FillEllipse($glowBrush, $CanvasSize * 0.08, $CanvasSize * 0.08, $CanvasSize * 0.84, $CanvasSize * 0.84)
    $glowBrush.Dispose()
  }

  $center = $CanvasSize / 2
  $ringOuter = $CanvasSize * 0.78
  $ringInner = $CanvasSize * 0.58
  $ringColor = if ($Monochrome) { $palette.Text } else { $palette.Accent }
  $ringShadowColor = if ($Monochrome) { $palette.Text } else { $palette.AccentSoft }

  $ringShadowPen = New-Object System.Drawing.Pen -ArgumentList @([System.Drawing.Color]::FromArgb(110, $ringShadowColor), [Math]::Max(8, $CanvasSize * 0.02))
  $Graphics.DrawEllipse($ringShadowPen, $center - ($ringOuter / 2), $center - ($ringOuter / 2), $ringOuter, $ringOuter)
  $ringShadowPen.Dispose()

  $ringPen = New-Object System.Drawing.Pen -ArgumentList @($ringColor, [Math]::Max(14, $CanvasSize * 0.05))
  $Graphics.DrawEllipse($ringPen, $center - ($ringOuter / 2), $center - ($ringOuter / 2), $ringOuter, $ringOuter)
  $ringPen.Dispose()

  if ($Monochrome) {
    $feltColor = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
  } else {
    $feltColor = [System.Drawing.Color]::FromArgb(255, 18, 43, 30)
  }
  $feltBrush = New-Object System.Drawing.SolidBrush -ArgumentList @($feltColor)
  $Graphics.FillEllipse($feltBrush, $center - ($ringInner / 2), $center - ($ringInner / 2), $ringInner, $ringInner)
  $feltBrush.Dispose()

  $cardWidth = $CanvasSize * 0.17
  $cardHeight = $CanvasSize * 0.24
  $cardLeft = $center - ($cardWidth * 1.06)
  $cardTop = $center - ($cardHeight * 0.48)
  if ($Monochrome) {
    $cardFillColor = $palette.Text
    $cardStrokeColor = $palette.Text
  } else {
    $cardFillColor = $palette.CardFace
    $cardStrokeColor = $palette.CardBorder
  }
  $cardBrush = New-Object System.Drawing.SolidBrush -ArgumentList @($cardFillColor)
  $cardPen = New-Object System.Drawing.Pen -ArgumentList @($cardStrokeColor, [Math]::Max(2, $CanvasSize * 0.008))

  $rightCardLeft = $center - ($cardWidth * 0.02)
  $rightCardTop = $cardTop + ($CanvasSize * 0.03)
  $leftCard = New-Object System.Drawing.RectangleF -ArgumentList @($cardLeft, $cardTop, $cardWidth, $cardHeight)
  $rightCard = New-Object System.Drawing.RectangleF -ArgumentList @($rightCardLeft, $rightCardTop, $cardWidth, $cardHeight)
  $Graphics.FillRoundedRectangle($cardBrush, $leftCard, $CanvasSize * 0.02)
  $Graphics.DrawRoundedRectangle($cardPen, $leftCard, $CanvasSize * 0.02)
  $Graphics.FillRoundedRectangle($cardBrush, $rightCard, $CanvasSize * 0.02)
  $Graphics.DrawRoundedRectangle($cardPen, $rightCard, $CanvasSize * 0.02)

  $cardBrush.Dispose()
  $cardPen.Dispose()

  if ($Monochrome) {
    $suitColor = $palette.Background
    $accentColor = $palette.Background
    $titleColor = $palette.Text
  } else {
    $suitColor = [System.Drawing.Color]::FromArgb(255, 32, 32, 32)
    $accentColor = [System.Drawing.Color]::FromArgb(255, 166, 41, 41)
    $titleColor = $palette.AccentSoft
  }
  $suitBrush = New-Object System.Drawing.SolidBrush -ArgumentList @($suitColor)
  $suitFont = New-Object System.Drawing.Font -ArgumentList @('Segoe UI Symbol', [float]($CanvasSize * 0.08), [System.Drawing.FontStyle]::Bold)
  $rankFont = New-Object System.Drawing.Font -ArgumentList @('Georgia', [float]($CanvasSize * 0.06), [System.Drawing.FontStyle]::Bold)
  $accentBrush = New-Object System.Drawing.SolidBrush -ArgumentList @($accentColor)

  $Graphics.DrawString('A', $rankFont, $accentBrush, $cardLeft + ($CanvasSize * 0.026), $cardTop + ($CanvasSize * 0.018))
  $Graphics.DrawString([char]0x2665, $suitFont, $accentBrush, $cardLeft + ($CanvasSize * 0.03), $cardTop + ($CanvasSize * 0.084))
  $Graphics.DrawString('K', $rankFont, $accentBrush, $center + ($CanvasSize * 0.01), $cardTop + ($CanvasSize * 0.048))
  $Graphics.DrawString([char]0x2660, $suitFont, $suitBrush, $center + ($CanvasSize * 0.015), $cardTop + ($CanvasSize * 0.114))

  $accentBrush.Dispose()
  $suitBrush.Dispose()
  $suitFont.Dispose()
  $rankFont.Dispose()

  $textBrush = New-Object System.Drawing.SolidBrush -ArgumentList @($titleColor)
  $titleFont = New-Object System.Drawing.Font -ArgumentList @('Georgia', [float]($CanvasSize * 0.12), [System.Drawing.FontStyle]::Bold)
  $subFont = New-Object System.Drawing.Font -ArgumentList @('Segoe UI', [float]($CanvasSize * 0.038), [System.Drawing.FontStyle]::Bold)
  $stringFormat = New-Object System.Drawing.StringFormat
  $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
  $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

  $Graphics.DrawString('GTO', $titleFont, $textBrush, $center, $center + ($CanvasSize * 0.16), $stringFormat)
  $Graphics.DrawString('SOLVER PRO', $subFont, $textBrush, $center, $center + ($CanvasSize * 0.27), $stringFormat)

  $titleFont.Dispose()
  $subFont.Dispose()
  $textBrush.Dispose()
  $stringFormat.Dispose()
}

Update-TypeData -TypeName System.Drawing.Graphics -MemberType ScriptMethod -MemberName FillRoundedRectangle -Value {
  param($Brush, $Rect, $Radius)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2
  $path.AddArc($Rect.X, $Rect.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($Rect.Right - $diameter, $Rect.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($Rect.Right - $diameter, $Rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($Rect.X, $Rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  $this.FillPath($Brush, $path)
  $path.Dispose()
} -Force

Update-TypeData -TypeName System.Drawing.Graphics -MemberType ScriptMethod -MemberName DrawRoundedRectangle -Value {
  param($Pen, $Rect, $Radius)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2
  $path.AddArc($Rect.X, $Rect.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($Rect.Right - $diameter, $Rect.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($Rect.Right - $diameter, $Rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($Rect.X, $Rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  $this.DrawPath($Pen, $path)
  $path.Dispose()
} -Force

function New-LogoAsset {
  param(
    [string]$FileName,
    [int]$Width,
    [int]$Height,
    [bool]$TransparentBackground = $false,
    [bool]$Monochrome = $false,
    [bool]$Splash = $false
  )

  $bitmap = New-Bitmap -Width $Width -Height $Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  if ($TransparentBackground) {
    $clearColor = $palette.Transparent
  } else {
    $clearColor = $palette.Background
  }
  $graphics.Clear($clearColor)

  if ($Splash) {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $rect = New-Object System.Drawing.RectangleF -ArgumentList @(0, 0, $Width, $Height)
    $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList @($rect, $palette.Background, $palette.BackgroundSoft, 90)
    $graphics.FillRectangle($gradient, $rect)
    $gradient.Dispose()

    $logoSize = [Math]::Min($Width, $Height) * 0.42
    $graphics.TranslateTransform(($Width - $logoSize) / 2, ($Height - $logoSize) / 2)
    Draw-Logo -Graphics $graphics -CanvasSize $logoSize -TransparentBackground:$false -Monochrome:$false
    $graphics.ResetTransform()
  } else {
    Draw-Logo -Graphics $graphics -CanvasSize ([Math]::Min($Width, $Height)) -TransparentBackground:$TransparentBackground -Monochrome:$Monochrome
  }

  $graphics.Dispose()
  Save-Png -Bitmap $bitmap -Path (Join-Path $assetsDir $FileName)
}

New-LogoAsset -FileName 'icon.png' -Width 1024 -Height 1024
New-LogoAsset -FileName 'favicon.png' -Width 256 -Height 256
New-LogoAsset -FileName 'splash-icon.png' -Width 1242 -Height 2436 -Splash:$true
New-LogoAsset -FileName 'android-icon-foreground.png' -Width 432 -Height 432 -TransparentBackground:$true
New-LogoAsset -FileName 'android-icon-monochrome.png' -Width 432 -Height 432 -TransparentBackground:$true -Monochrome:$true
New-LogoAsset -FileName 'android-icon-background.png' -Width 432 -Height 432

Write-Host 'Generated branded assets in assets/'