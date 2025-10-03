# OS detection
ifeq ($(OS),Windows_NT)
	EXE=.exe
	RM=del /q /f
	RMDIR=rmdir /s /q
	OUT=system-bridge.exe
	BUN_BUILD=set STATIC_EXPORT=true && bun run build
	EXTRA_LDFLAGS=-H windowsgui
	GEN_RC=powershell -ExecutionPolicy Bypass -File ./.scripts/windows/generate-rc.ps1
else
	EXE=
	RM=rm -f
	RMDIR=rm -rf
	OUT=system-bridge-linux
	BUN_BUILD=STATIC_EXPORT=true bun run build
	EXTRA_LDFLAGS=
	CREATE_ARCH=VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-arch.sh
	CREATE_DEB=VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-deb.sh
	CREATE_FLATPAK=VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-flatpak.sh
	CREATE_RPM=VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-rpm.sh
endif

build: clean build_web_client
ifeq ($(OS),Windows_NT)
	$(GEN_RC)
	windres system-bridge.rc -O coff -o system-bridge.syso
	go build -v -ldflags="$(EXTRA_LDFLAGS) -X 'github.com/timmo001/system-bridge/version.Version=5.0.0-dev+$(shell git rev-parse --short HEAD)'" -o "$(OUT)" .
else
	go build -v -ldflags="$(EXTRA_LDFLAGS) -X 'github.com/timmo001/system-bridge/version.Version=5.0.0-dev+$(shell git rev-parse --short HEAD)'" -o "$(OUT)" .
endif

# Build console version for debugging (Windows only)
build_console: clean build_web_client
ifeq ($(OS),Windows_NT)
	go build -v -ldflags="-X 'github.com/timmo001/system-bridge/version.Version=5.0.0-dev+$(shell git rev-parse --short HEAD)'" -o "system-bridge-console.exe" .
else
	@echo "Console build is only supported on Windows"
endif

build_web_client: clean_web_client
	cd web-client && bun install && $(BUN_BUILD) && bun run verify-build
ifeq ($(OS),Windows_NT)
	@echo "Waiting for file system to sync..."
	@powershell -Command "Start-Sleep -Seconds 2"
	@echo "Verifying CSS files are accessible..."
	@powershell -Command "if (!(Test-Path 'web-client\out\_next\static\css\*.css')) { Write-Host '✗ CSS files not found after build'; exit 1 }"
	@echo ✓ CSS files verified before Go build
else
	@echo "Waiting for file system to sync..."
	@sync
	@echo "Verifying CSS files are accessible..."
	@if ! ls web-client/out/_next/static/css/*.css 1> /dev/null 2>&1; then \
		echo "✗ CSS files not found after build"; \
		exit 1; \
	fi
	@echo "✓ CSS files verified before Go build"
endif

create_all_packages: clean_dist build
ifeq ($(OS),Windows_NT)
	@echo "create_all_packages is only supported on Linux hosts"
else
	@echo "Packaging all Linux formats in parallel..."
	chmod +x ./.scripts/linux/create-*.sh
	$(CREATE_DEB) & \
	$(CREATE_RPM) & \
	$(CREATE_ARCH) & \
	$(CREATE_FLATPAK) & \
	wait
endif

create_arch: clean_dist
	$(CREATE_ARCH)

create_flatpak: clean_dist
	$(CREATE_FLATPAK)

create_deb: clean_dist
	$(CREATE_DEB)

create_rpm: clean_dist
	$(CREATE_RPM)

create_windows_installer: clean_dist download_windows_now_playing
	powershell -ExecutionPolicy Bypass -File ./.scripts/windows/create-installer.ps1 /Clean

download_windows_now_playing:
	powershell -ExecutionPolicy Bypass -File ./.scripts/windows/download-now-playing.ps1

install: build
	go install .

run: build
	./$(OUT) backend

# Run console version for debugging (Windows only)
run_console: build_console
ifeq ($(OS),Windows_NT)
	./system-bridge-console.exe backend
else
	@echo "Console run is only supported on Windows"
endif

# List running System Bridge processes (Windows only)
list_processes:
ifeq ($(OS),Windows_NT)
	powershell -ExecutionPolicy Bypass -File ./.scripts/windows/list-processes.ps1
else
	@echo "Process management is only supported on Windows"
endif

# Stop all running System Bridge processes (Windows only)
stop_processes:
ifeq ($(OS),Windows_NT)
	powershell -ExecutionPolicy Bypass -File ./.scripts/windows/stop-processes.ps1
else
	@echo "Process management is only supported on Windows"
endif

test:
	go test -v ./...

clean:
ifeq ($(OS),Windows_NT)
	-$(RM) system-bridge.syso 2>nul
	-$(RM) system-bridge.exe 2>nul
	-$(RM) system-bridge-console.exe 2>nul
	-$(RM) system-bridge-windows.exe 2>nul
	-$(RM) installer.nsi 2>nul
	-$(RM) system-bridge.rc 2>nul
	-$(RM) system-bridge.syso 2>nul
	-$(RMDIR) now-playing 2>/dev/null
	-$(RMDIR) ./.scripts/windows/now-playing 2>/dev/null
else
	-$(RM) system-bridge 2>/dev/null
	-$(RM) system-bridge-linux 2>/dev/null
endif

clean_dist:
ifeq ($(OS),Windows_NT)
	-$(RMDIR) dist 2>nul
else
	-$(RMDIR) .flatpak-builder 2>/dev/null
	-$(RMDIR) AppDir 2>/dev/null
	-$(RMDIR) appimagetool 2>/dev/null
	-$(RMDIR) build 2>/dev/null
	-$(RMDIR) dist 2>/dev/null
	-$(RMDIR) dist-agg 2>/dev/null
	-$(RMDIR) rpm-structure 2>/dev/null
	-$(RMDIR) rpmbuild 2>/dev/null
	-$(RMDIR) flatpak-build 2>/dev/null
	-$(RMDIR) repo 2>/dev/null
	-$(RMDIR) deb-structure 2>/dev/null
endif

clean_web_client:
ifeq ($(OS),Windows_NT)
	-$(RMDIR) web-client\out 2>nul || exit 0
else
	-$(RMDIR) web-client/out 2>/dev/null
endif

deps:
	go mod tidy

version: build
	./$(OUT) version

# Show help
help:
	@echo "Available targets:"
	@echo "  build                    Build the application"
	@echo "  build_console            Build console version for debugging (Windows only)"
	@echo "  build_web_client         Build the web client"
	@echo "  create_all_packages      Build all Linux packages (AppImage, DEB, RPM, Arch, Flatpak)"
	@echo "  create_arch              Create Arch Linux package"
	@echo "  create_flatpak           Create Flatpak package"
	@echo "  create_deb               Create Debian package"
	@echo "  create_rpm               Create RPM package"
	@echo "  create_windows_installer Create Windows installer"
	@echo "  run                      Build and run the application (development only)"
	@echo "  run_console              Build and run console version for debugging (Windows only)"
	@echo "  list_processes           List running System Bridge processes (Windows only)"
	@echo "  stop_processes           Stop all running System Bridge processes (Windows only)"
	@echo "  test                     Run tests"
	@echo "  clean                    Remove build artifacts"
	@echo "  clean_dist               Remove dist directory"
	@echo "  clean_web_client         Remove web client build artifacts"
	@echo "  deps                     Install dependencies"
	@echo "  version                  Show the version of the application"