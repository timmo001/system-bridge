run: build_client
	go run . backend

build_client: clean
	cd web-client && bun install && STATIC_EXPORT=true bun run build

clean:
	rm -rf web-client/out
