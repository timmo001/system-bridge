# OS detection
ifeq ($(OS),Windows_NT)
	EXE=.exe
	RM=del /q /f
	RMDIR=rmdir /s /q
	OUT=system-bridge.exe
	CLEAN_WEB_CLIENT=$(RMDIR) web-client\out 2>nul || exit 0
	BUN_BUILD=set STATIC_EXPORT=true && bun run build
	EXTRA_LDFLAGS=-H windowsgui
else
	EXE=
	RM=rm -f
	RMDIR=rm -rf
	OUT=system-bridge-linux
	CLEAN_WEB_CLIENT=$(RMDIR) web-client/out 2>/dev/null || true
	BUN_BUILD=STATIC_EXPORT=true bun run build
	EXTRA_LDFLAGS=
endif

build: build_client
	go build -v -ldflags="$(EXTRA_LDFLAGS) -X 'github.com/timmo001/system-bridge/version.Version=5.0.0-dev+$(shell git rev-parse --short HEAD)'" -o "$(OUT)" .

build_client: clean-web-client
	cd web-client && bun install && $(BUN_BUILD)

create_appimage:
	VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-appimage.sh

create_arch:
	VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-arch.sh

create_deb:
	VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-deb.sh

create_rpm:
	VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-rpm.sh

create_windows_installer:
	powershell -ExecutionPolicy Bypass -File ./.scripts/windows/create-installer.ps1

install: build
	go install .

run: build
	./$(OUT) backend

clean: clean-web-client
	-$(RM) system-bridge.exe 2>nul
	-$(RM) system-bridge-linux 2>/dev/null

clean-web-client:
	$(CLEAN_WEB_CLIENT)

deps:
	go mod tidy

# Show help
help:
	@echo "Available targets:"
	@echo "  build               Build the application"
	@echo "  build_client        Build the web client"
	@echo "  create_appimage     Create AppImage package"
	@echo "  create_arch         Create Arch Linux package"
	@echo "  create_deb          Create Debian package"
	@echo "  create_rpm          Create RPM package"
	@echo "  run                 Build and run the application (development only)"
	@echo "  clean               Remove build artifacts"
	@echo "  clean-web-client    Remove web client build artifacts"
	@echo "  deps                Install dependencies"
