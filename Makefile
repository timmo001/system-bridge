# OS detection
ifeq ($(OS),Windows_NT)
	EXE=.exe
	RM=del /q /f
	RMDIR=rmdir /s /q
	OUT=system-bridge.exe
	BUN_BUILD=set STATIC_EXPORT=true && pnpm run build
	EXTRA_LDFLAGS=-H windowsgui
	GEN_RC=powershell -ExecutionPolicy Bypass -File ./.scripts/windows/generate-rc.ps1
else
	EXE=
	RM=rm -f
	RMDIR=rm -rf
	OUT=system-bridge-linux
	BUN_BUILD=STATIC_EXPORT=true pnpm run build
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
	go build -v -ldflags="$(EXTRA_LDFLAGS) -X 'github.com/timmo001/system-bridge/version.Version=$(shell git describe --tags --abbrev=0)'" -o "$(OUT)" . 
else
	go build -v -ldflags="$(EXTRA_LDFLAGS) -X 'github.com/timmo001/system-bridge/version.Version=$(shell git describe --tags --abbrev=0)'" -o "$(OUT)" .
endif

# Build console version for debugging (Windows only)
build_console: clean build_web_client
ifeq ($(OS),Windows_NT)
	go build -v -ldflags="-X 'github.com/timmo001/system-bridge/version.Version=$(shell git describe --tags --abbrev=0)'" -o "system-bridge-console.exe" .
else
	@echo "Console build is only supported on Windows"
endif

generate_schemas:
	@echo "Generating Zod schemas from Go types..."
	@go run tools/generate-schemas/main.go
	@echo "Formatting generated schemas..."
	@cd web-client && pnpm install && pnpm format:write src/lib/system-bridge/types-modules-schemas.ts

generate_types:
	@echo "Generating TypeScript type files from Go types..."
	@go run tools/generate-types/main.go
	@echo "Formatting generated type files..."
	@cd web-client && pnpm install && pnpm format:write src/lib/system-bridge/types-modules.ts src/lib/system-bridge/types-settings.ts src/lib/system-bridge/types-websocket.ts

build_web_client: clean_web_client generate_schemas generate_types
	cd web-client && pnpm build
ifeq ($(OS),Windows_NT)
	@echo "Waiting for file system to sync..."
	@powershell -Command "Start-Sleep -Seconds 2"
	@echo "Verifying build files are accessible..."
	@powershell -Command "if (!(Test-Path 'web-client\dist\index.html')) { Write-Host 'ERROR: web-client\dist\index.html not found'; exit 1 }"
	@powershell -Command "if (!(Get-ChildItem 'web-client\dist\assets\*.css' -ErrorAction SilentlyContinue)) { Write-Host 'ERROR: CSS files not found in web-client\dist\assets\'; Get-ChildItem 'web-client\dist\assets\' -ErrorAction SilentlyContinue; exit 1 }"
	@powershell -Command "if (!(Get-ChildItem 'web-client\dist\assets\*.js' -ErrorAction SilentlyContinue)) { Write-Host 'ERROR: JS files not found in web-client\dist\assets\'; Get-ChildItem 'web-client\dist\assets\' -ErrorAction SilentlyContinue; exit 1 }"
	@echo "Verifying Tailwind CSS compilation..."
	@powershell -Command "if ((Get-ChildItem 'web-client\dist\assets\*.css' -ErrorAction SilentlyContinue | Select-Object -First 1 | Get-Content -Raw) -match '@layer utilities|--tw-|\.(flex|grid|hidden|block)\{') { Write-Host '  [OK] Found Tailwind CSS patterns' } else { Write-Host 'ERROR: Tailwind CSS compilation failed - no utility classes found'; Write-Host 'This may indicate that @tailwindcss/vite plugin did not run properly'; exit 1 }"
	@echo "[OK] Build files verified and ready for embedding"
else
	@echo "Waiting for file system to sync..."
	@sync
	@echo "Verifying build files are accessible..."
	@if ! ls web-client/dist/index.html >/dev/null 2>&1; then \
		echo "ERROR: web-client/dist/index.html not found"; \
		exit 1; \
	fi
	@if ! ls web-client/dist/assets/*.css >/dev/null 2>&1; then \
		echo "ERROR: CSS files not found in web-client/dist/assets/"; \
		ls -la web-client/dist/assets/ || true; \
		exit 1; \
	fi
	@if ! ls web-client/dist/assets/*.js >/dev/null 2>&1; then \
		echo "ERROR: JS files not found in web-client/dist/assets/"; \
		ls -la web-client/dist/assets/ || true; \
		exit 1; \
	fi
	@echo "Verifying Tailwind CSS compilation..."
	@CSS_FILE=$$(find web-client/dist/assets -name "*.css" -type f 2>/dev/null | head -1); \
	if [ -z "$$CSS_FILE" ]; then \
		echo "ERROR: No CSS file found for Tailwind verification"; \
		exit 1; \
	fi; \
	TAILWIND_FOUND=0; \
	if grep -qE "@layer utilities" "$$CSS_FILE" 2>/dev/null; then \
		echo "  ✓ Found @layer utilities"; \
		TAILWIND_FOUND=1; \
	fi; \
	if grep -qE "\.(flex|grid|hidden|block)\{" "$$CSS_FILE" 2>/dev/null; then \
		echo "  ✓ Found Tailwind utility classes"; \
		TAILWIND_FOUND=1; \
	fi; \
	if grep -qE "--tw-" "$$CSS_FILE" 2>/dev/null; then \
		echo "  ✓ Found Tailwind CSS custom properties"; \
		TAILWIND_FOUND=1; \
	fi; \
	if [ "$$TAILWIND_FOUND" -eq 0 ]; then \
		echo "ERROR: Tailwind CSS compilation failed - no utility classes found"; \
		echo "Expected @layer utilities, utility classes (.flex, .grid, etc.), or --tw-* properties"; \
		echo "This may indicate that @tailwindcss/vite plugin did not run properly"; \
		exit 1; \
	fi
	@echo "✓ Build files verified and ready for embedding"
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
	@echo "Starting web client and backend in parallel..."
	cd web-client && pnpm exec concurrently -n "web,backend" -c "blue,green" "pnpm dev" "../$(OUT) backend"

run-web-client:
	cd web-client && pnpm dev

run-backend: build
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

test: test_go

test_go:
	go test -v ./...

lint: lint_go lint_web_client

lint_go:
	go fmt ./...
	go vet ./...

lint_web_client:
	cd web-client && pnpm lint
	cd web-client && pnpm typecheck

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
	-$(RMDIR) web-client\dist 2>nul || exit 0
else
	-$(RMDIR) web-client/dist 2>/dev/null
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
	@echo "  generate_schemas         Generate Zod schemas from Go types"
	@echo "  create_all_packages      Build all Linux packages (AppImage, DEB, RPM, Arch, Flatpak)"
	@echo "  create_arch              Create Arch Linux package"
	@echo "  create_flatpak           Create Flatpak package"
	@echo "  create_deb               Create Debian package"
	@echo "  create_rpm               Create RPM package"
	@echo "  create_windows_installer Create Windows installer"
	@echo "  run                      Build and run the application (development only)"
	@echo "  run-web-client           Run the web client dev server (Vite)"
	@echo "  run-backend              Build and run the backend server"
	@echo "  run_console              Build and run console version for debugging (Windows only)"
	@echo "  list_processes           List running System Bridge processes (Windows only)"
	@echo "  stop_processes           Stop all running System Bridge processes (Windows only)"
	@echo "  test                     Run tests"
	@echo "  lint                     Run Go linters (fmt, vet)"
	@echo "  clean                    Remove build artifacts"
	@echo "  clean_dist               Remove dist directory"
	@echo "  clean_web_client         Remove web client build artifacts"
	@echo "  deps                     Install dependencies"
	@echo "  version                  Show the version of the application"
