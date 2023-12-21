;--------------------------------
;Includes

  !include "MUI2.nsh"
  !include "FileFunc.nsh"

;--------------------------------
;General

  ;Name and file
  Name "System Bridge"
  OutFile "..\systembridgesetup.exe"
  Unicode True

  ;Default installation folder
  InstallDir "$LOCALAPPDATA\timmo001\systembridge"

  ;Get installation folder from registry if available
  InstallDirRegKey HKCU "Software\timmo001\systembridge" ""

  ;Request application privileges for Windows Vista
  RequestExecutionLevel user

;--------------------------------
;Variables

  Var StartMenuFolder

;--------------------------------
;Interface Settings

  !define MUI_ABORTWARNING
  !define MUI_ICON "..\resources\system-bridge.ico"
  !define MUI_HEADERIMAGE
  !define MUI_HEADERIMAGE_BITMAP "..\resources\system-bridge-win32-installer.bmp"
  !define MUI_HEADERIMAGE_RIGHT

;--------------------------------
;Pages

  !insertmacro MUI_PAGE_LICENSE "..\LICENSE"
  !insertmacro MUI_PAGE_COMPONENTS
  !insertmacro MUI_PAGE_DIRECTORY

  ;Start Menu Folder Page Configuration
  !define MUI_STARTMENUPAGE_REGISTRY_ROOT "HKCU"
  !define MUI_STARTMENUPAGE_REGISTRY_KEY "Software\systembridge"
  !define MUI_STARTMENUPAGE_REGISTRY_VALUENAME "Start Menu Folder"

  !insertmacro MUI_PAGE_STARTMENU Application $StartMenuFolder

  !insertmacro MUI_PAGE_INSTFILES

  !insertmacro MUI_UNPAGE_CONFIRM
  !insertmacro MUI_UNPAGE_INSTFILES

;--------------------------------
;Languages

  !insertmacro MUI_LANGUAGE "English"

;--------------------------------
;Installer Sections

Section "System Bridge"

  ;ADD YOUR OWN FILES HERE...
  File /nonfatal /a /r "..\resources\system-bridge.ico" $LOCALAPPDATA\timmo001\systembridge
  File /nonfatal /a /r "..\resources\system-bridge.png" $LOCALAPPDATA\timmo001\systembridge
  File /nonfatal /a /r "..\dist\" $LOCALAPPDATA\timmo001\systembridge

  ;Store installation folder
  WriteRegStr HKCU "Software\systembridge" "" $LOCALAPPDATA\timmo001\systembridge

  ;Create uninstaller
  WriteUninstaller "$LOCALAPPDATA\timmo001\systembridge\systembridgeuninstall.exe"

  SetOutPath $LOCALAPPDATA\timmo001\systembridge\systembridge

  !insertmacro MUI_STARTMENU_WRITE_BEGIN Application

    ;Create shortcuts
    CreateDirectory "$SMPROGRAMS\$StartMenuFolder"
    CreateShortcut "$LOCALAPPDATA\timmo001\systembridge\System Bridge.lnk" "$LOCALAPPDATA\timmo001\systembridge\systembridge\systembridge.exe" "" "$LOCALAPPDATA\timmo001\systembridge\system-bridge.ico"
    CreateShortcut "$SMPROGRAMS\$StartMenuFolder\System Bridge.lnk" "$LOCALAPPDATA\timmo001\systembridge\systembridge\systembridge.exe" "" "$LOCALAPPDATA\timmo001\systembridge\system-bridge.ico"
    CreateShortcut "$SMPROGRAMS\$StartMenuFolder\Uninstall System Bridge.lnk" "$LOCALAPPDATA\timmo001\systembridge\systembridgeuninstall.exe"
    CreateShortcut "$DESKTOP\System Bridge.lnk" "$LOCALAPPDATA\timmo001\systembridge\systembridge\systembridge.exe" "" "$LOCALAPPDATA\timmo001\systembridge\system-bridge.ico"

  !insertmacro MUI_STARTMENU_WRITE_END

SectionEnd

;--------------------------------
;Uninstaller Section

Section "Uninstall"

  ;ADD YOUR OWN FILES HERE...

  Delete "$LOCALAPPDATA\timmo001\systembridge\systembridgeuninstall.exe"

  RMDir /r "$LOCALAPPDATA\timmo001\systembridge"

  !insertmacro MUI_STARTMENU_GETFOLDER Application $StartMenuFolder

  Delete "$SMPROGRAMS\$StartMenuFolder\System Bridge.lnk"
  Delete "$SMPROGRAMS\$StartMenuFolder\Uninstall System Bridge.lnk"
  Delete "$DESKTOP\System Bridge.lnk"
  RMDir "$SMPROGRAMS\$StartMenuFolder"

  DeleteRegKey /ifempty HKCU "Software\systembridge"

SectionEnd
