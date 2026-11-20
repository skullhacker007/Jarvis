@echo off
title J.A.R.V.I.S. // UNIVERSAL MOBILE UPLINK
chcp 65001 >nul
color 0B
cls
echo ================================================================
echo   J.A.R.V.I.S. // UNIVERSAL WIRELESS PHONE PAIRING
echo   1. On Phone: Settings ^> Developer Options ^> Wireless Debugging
echo   2. Tap 'Pair device with QR code'
echo   3. Point phone camera at the QR code below:
echo ================================================================
echo.
"%~dp0platform-tools\adb.exe" pair --qr
echo.
echo ================================================================
echo   Handshake complete! Querying connected devices:
"%~dp0platform-tools\adb.exe" devices -l
echo ================================================================
echo.
pause
