Adds a `Dependency review` workflow that checks dependency changes on PRs, and reports on all direct dependencies once a month.

It reads `package.json` through the GitHub API and never installs anything, so it doesn't depend on the package manager. For now the job summary is the only output, so nobody is notified.

Test run: <https://github.com/example/project/actions/runs/36722024200>

References:

- [dependency-review-action](https://example.com/dependency-review-action)
- [npm provenance](https://example.com/npm-provenance)
