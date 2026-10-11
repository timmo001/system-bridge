//go:build ignore

// Run independent checks in parallel, label their output, and report every failure.
//
//	go run scripts/check.go
//
// The build tag keeps this file out of the module's packages. wg.Go needs Go
// 1.25+. Go's build cache is safe to share, so vet, lint, test and build can overlap.
package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"
)

var checks = []struct{ name, command string }{
	{"vet", "go vet ./..."},
	{"lint", "golangci-lint run"},
	{"test", "go test ./..."},
	// ...
}

func main() {
	failed := make([]bool, len(checks))
	var wg sync.WaitGroup
	for i, check := range checks {
		wg.Go(func() {
			cmd := exec.Command("sh", "-c", check.command)
			out, _ := cmd.StdoutPipe()
			cmd.Stderr = cmd.Stdout
			if err := cmd.Start(); err != nil {
				fmt.Printf("[%s] %v\n", check.name, err)
				failed[i] = true
				return
			}
			lines := bufio.NewScanner(out)
			for lines.Scan() {
				fmt.Printf("[%s] %s\n", check.name, lines.Text())
			}
			failed[i] = cmd.Wait() != nil
		})
	}
	wg.Wait()

	var names []string
	for i, f := range failed {
		if f {
			names = append(names, checks[i].name)
		}
	}
	if len(names) > 0 {
		fmt.Fprintf(os.Stderr, "Failed: %s\n", strings.Join(names, ", "))
		os.Exit(1)
	}
}
