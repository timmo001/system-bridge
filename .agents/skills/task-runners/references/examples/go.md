# Go examples

The `go` command can't run tasks in parallel natively. To run checks in parallel, use an alternative task runner, such as make, just, mage, mise or Task, or write your own script. Within one command, `go build`, `go vet` and `go test` already run packages in parallel and share a build cache, and `go test` caches passing results.

## Quick start

```sh
go run scripts/check.go
```

[scripts/check.go](scripts/check.go) runs `go vet`, `golangci-lint` and `go test` side by side and reports every failure. They share Go's build cache safely, so they can all overlap.

## Notes

- Don't add `-count=1` by default; it throws away cached test results. Use it only where a test reads something the cache can't see.
- `-race` and coverage flags change the cache key. Run them as a separate check rather than on every run.
- Run `go generate ./...` and `gofmt -w .` before the checks, since they write files.
- Use `t.Parallel()` for tests that can share a process; `-p` sets package-level parallelism.

```sh
test -z "$(gofmt -l .)"                # read-only format check
go test ./internal/parse/...           # one subtree
go test -run 'TestParse/empty' ./...   # one test
```
