# Generate .resources/system-bridge.rc with current version and year

# Get current year
$YEAR = (Get-Date).Year

# Get version
$VERSION = $env:VERSION
if (-not $VERSION) {
    try {
        $gitsha = git rev-parse --short HEAD
    } catch {
        $gitsha = "dev"
    }
    $VERSION = "5.0.0-dev+$gitsha"
}

# Parse numeric version for Windows resource
if ($VERSION -match "^(\d+)\.(\d+)\.(\d+)") {
    $major = $matches[1]
    $minor = $matches[2]
    $patch = $matches[3]
    $build = 0
    $NUMERIC_VERSION = "$major,$minor,$patch,$build"
} else {
    $NUMERIC_VERSION = "0,0,0,0"
}

# Write the .rc file
$rcContent = @"
1 ICON ".resources/system-bridge-dimmed.ico"

VS_VERSION_INFO VERSIONINFO
 FILEVERSION $NUMERIC_VERSION
 PRODUCTVERSION $NUMERIC_VERSION
 FILEFLAGSMASK 0x3fL
 FILEFLAGS 0x0L
 FILEOS 0x40004L
 FILETYPE 0x1L
 FILESUBTYPE 0x0L
BEGIN
    BLOCK "StringFileInfo"
    BEGIN
        BLOCK "040904b0"
        BEGIN
            VALUE "CompanyName", "System Bridge"
            VALUE "FileDescription", "System Bridge - The bridge to your system"
            VALUE "FileVersion", "$VERSION"
            VALUE "InternalName", "system-bridge.exe"
            VALUE "LegalCopyright", "Copyright (C) $YEAR Aidan Timson"
            VALUE "OriginalFilename", "system-bridge.exe"
            VALUE "ProductName", "System Bridge"
            VALUE "ProductVersion", "$VERSION"
        END
    END
    BLOCK "VarFileInfo"
    BEGIN
        VALUE "Translation", 0x0409, 1200
    END
END
"@
Set-Content .resources/system-bridge.rc $rcContent 