build: build_client
	go build .

build_client: clean-web-client
	cd web-client && bun install && STATIC_EXPORT=true bun run build

run: build
	./system-bridge

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
	@echo "  run                 Build and run the application (development only)"
	@echo "  clean               Remove build artifacts"
	@echo "  clean-web-client    Remove web client build artifacts"
	@echo "  deps                Install dependencies"
