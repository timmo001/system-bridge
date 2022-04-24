;--------------------------------
;Includes

  !include "MUI2.nsh"
  !include "FileFunc.nsh"

;--------------------------------
;General

  ;Name and file
  Name "System Bridge"
  OutFile "systembridge-setup.exe"
  Unicode True

  ;Default installation folder
  InstallDir "$LOCALAPPDATA\System Bridge"

  ;Get installation folder from registry if available
  InstallDirRegKey HKCU "Software\System Bridge" ""

  ;Request application privileges for Windows Vista
  RequestExecutionLevel user

;--------------------------------
;Variables

  Var StartMenuFolder

;--------------------------------
;Interface Settings

  !define MUI_ABORTWARNING

;--------------------------------
;Pages

  !insertmacro MUI_PAGE_LICENSE "LICENSE"
  !insertmacro MUI_PAGE_COMPONENTS
  !insertmacro MUI_PAGE_DIRECTORY

  ;Start Menu Folder Page Configuration
  !define MUI_STARTMENUPAGE_REGISTRY_ROOT "HKCU"
  !define MUI_STARTMENUPAGE_REGISTRY_KEY "Software\System Bridge"
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

  SetOutPath "$INSTDIR"

  ;ADD YOUR OWN FILES HERE...
  File /nonfatal /a /r "dist\" $INSTDIR

  ;Store installation folder
  WriteRegStr HKCU "Software\System Bridge" "" $INSTDIR

  ;Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"

  !insertmacro MUI_STARTMENU_WRITE_BEGIN Application

    ;Create shortcuts
    CreateDirectory "$SMPROGRAMS\$StartMenuFolder"
    CreateShortcut "$INSTDIR\System Bridge.lnk" "$INSTDIR\systembridge.exe" "" "$INSTDIR\systembridge-circle.ico"
    CreateShortcut "$SMPROGRAMS\$StartMenuFolder\System Bridge.lnk" "$INSTDIR\systembridge.exe" "" "$INSTDIR\systembridge-circle.ico"
    CreateShortcut "$SMPROGRAMS\$StartMenuFolder\Uninstall System Bridge.lnk" "$INSTDIR\uninstall.exe"
    CreateShortcut "$DESKTOP\System Bridge.lnk" "$INSTDIR\systembridge.exe" "" "$INSTDIR\systembridge-circle.ico"

  !insertmacro MUI_STARTMENU_WRITE_END

SectionEnd

;--------------------------------
;Uninstaller Section

Section "Uninstall"

  ;ADD YOUR OWN FILES HERE...

  Delete "$INSTDIR\uninstall.exe"

  RMDir /r "$INSTDIR"

  !insertmacro MUI_STARTMENU_GETFOLDER Application $StartMenuFolder

  Delete "$SMPROGRAMS\$StartMenuFolder\System Bridge.lnk"
  Delete "$SMPROGRAMS\$StartMenuFolder\Uninstall System Bridge.lnk"
  Delete "$DESKTOP\System Bridge.lnk"
  RMDir "$SMPROGRAMS\$StartMenuFolder"

  DeleteRegKey /ifempty HKCU "Software\System Bridge"

SectionEnd
