# OS detection
ifeq ($(OS),Windows_NT)
	EXE=.exe
	RM=del /q /f
	RMDIR=rmdir /s /q
	OUT=system-bridge.exe
	BUN_BUILD=set STATIC_EXPORT=true && bun run build
	EXTRA_LDFLAGS=-H windowsgui
	GEN_RC=powershell -ExecutionPolicy Bypass -File ./.scripts/windows/generate-rc.ps1
	DL_NOW_PLAYING=powershell -ExecutionPolicy Bypass -File ./.scripts/windows/download-now-playing.ps1
else
	EXE=
	RM=rm -f
	RMDIR=rm -rf
	OUT=system-bridge-linux
	BUN_BUILD=STATIC_EXPORT=true bun run build
	EXTRA_LDFLAGS=
endif

build: clean build_web_client
ifeq ($(OS),Windows_NT)
	$(DL_NOW_PLAYING);
	$(GEN_RC)
	windres system-bridge.rc -O coff -o system-bridge.syso
	go build -v -ldflags="$(EXTRA_LDFLAGS) -X 'github.com/timmo001/system-bridge/version.Version=5.0.0-dev+$(shell git rev-parse --short HEAD)'" -o "$(OUT)" .
else
	go build -v -ldflags="$(EXTRA_LDFLAGS) -X 'github.com/timmo001/system-bridge/version.Version=5.0.0-dev+$(shell git rev-parse --short HEAD)'" -o "$(OUT)" .
endif

build_web_client: clean_web_client
	cd web-client && bun install && $(BUN_BUILD)

create_appimage: clean_dist
	VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-appimage.sh

create_arch: clean_dist
	VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-arch.sh

create_deb: clean_dist
	VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-deb.sh

create_rpm: clean_dist
	VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-rpm.sh

create_windows_installer: clean_dist download_windows_now_playing
	powershell -ExecutionPolicy Bypass -File ./.scripts/windows/create-installer.ps1 /Clean

download_windows_now_playing:
	powershell -ExecutionPolicy Bypass -File ./.scripts/windows/download-now-playing.ps1

install: build
	go install .

run: build
	./$(OUT) backend

clean:
ifeq ($(OS),Windows_NT)
	-$(RM) system-bridge.syso 2>nul
	-$(RM) system-bridge.exe 2>nul
	-$(RM) system-bridge-windows.exe 2>nul
	-$(RM) installer.nsi 2>nul
	-$(RM) system-bridge.rc 2>nul
	-$(RM) system-bridge.syso 2>nul
else
	-$(RM) system-bridge 2>/dev/null
	-$(RM) system-bridge-linux 2>/dev/null
endif

clean_dist:
ifeq ($(OS),Windows_NT)
	-$(RMDIR) dist 2>nul
else
	-$(RMDIR) dist 2>/dev/null
endif

clean_web_client:
ifeq ($(OS),Windows_NT)
	-$(RMDIR) web-client\out 2>nul || exit 0
else
	-$(RMDIR) web-client/out 2>/dev/null
endif

deps:
	go mod tidy

# Show help
help:
	@echo "Available targets:"
	@echo "  build                    Build the application"
	@echo "  build_web_client         Build the web client"
	@echo "  create_appimage          Create AppImage package"
	@echo "  create_arch              Create Arch Linux package"
	@echo "  create_deb               Create Debian package"
	@echo "  create_rpm               Create RPM package"
	@echo "  create_windows_installer Create Windows installer"
	@echo "  run                      Build and run the application (development only)"
	@echo "  clean                    Remove build artifacts"
	@echo "  clean_dist               Remove dist directory"
	@echo "  clean_web_client         Remove web client build artifacts"
	@echo "  deps                     Install dependencies"
