run: build_client
	go run . backend

build_client: clean
	npm run build --prefix web-client

clean:
	rm -rf web-client/out
