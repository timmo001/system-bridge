// Run independent checks in parallel, label their output, and report every failure.
//
// node scripts/check.mts    (Node 22.18+ / 23.6+; stable from 24.12 / 25.2)
// bun scripts/check.mts
// deno run --allow-run --allow-env scripts/check.mts
//
// Node only strips types: no enums, parameter properties or runtime namespaces,
// and no type checking. `.mts` is always an ES module, so top-level await works.
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

type Check = { name: string; command: string };

const checks: Check[] = [
  { name: "lint", command: "npm run --silent lint" },
  { name: "typecheck", command: "npm run --silent typecheck" },
  { name: "test", command: "npm run --silent test" },
  // ...
];

const run = ({ name, command }: Check): Promise<boolean> =>
  new Promise((resolve) => {
    const child = spawn(command, { shell: true, stdio: ["ignore", "pipe", "pipe"] });

    for (const stream of [child.stdout, child.stderr]) {
      createInterface({ input: stream }).on("line", (line) => console.log(`[${name}] ${line}`));
    }

    child.on("close", (code) => resolve(code === 0));
  });

const results = await Promise.all(checks.map(run));

const failed = checks.flatMap((check, i) => (results[i] ? [] : [check.name]));

if (failed.length > 0) {
  console.error(`Failed: ${failed.join(", ")}`);
  process.exit(1);
}
