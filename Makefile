build: build_client
	go build -v -ldflags="-X 'github.com/timmo001/system-bridge/version.Version=5.0.0-dev+$(shell git rev-parse --short HEAD)'" -o "system-bridge-linux" .

build_client: clean-web-client
	cd web-client && bun install && STATIC_EXPORT=true bun run build

create_appimage:
	VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-appimage.sh

create_arch:
	VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-arch.sh

create_deb:
	VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-deb.sh

create_rpm:
	VERSION=5.0.0-dev+$(shell git rev-parse --short HEAD) ./.scripts/linux/create-rpm.sh

install: build
	go install .

run: build
	./system-bridge backend

clean: clean-web-client
	rm -f system-bridge

clean-web-client:
	rm -rf web-client/out

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
