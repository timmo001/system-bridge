import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";

const COMMENT_MARKER = "<!-- dependency-pr-comment -->";
const JAVASCRIPT_DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
  "resolutions",
  "overrides",
];
const JAVASCRIPT_SECTION_LABELS = {
  dependencies: "dependency",
  devDependencies: "devDependency",
  peerDependencies: "peerDependency",
  optionalDependencies: "optionalDependency",
  resolutions: "resolution",
  overrides: "override",
};
const SUPPORTED_ECOSYSTEMS = [
  {
    id: "go",
    title: "Go modules",
    files: ["go.mod", "go.sum"],
  },
  {
    id: "web-client",
    title: "Web client",
    files: ["web-client/package.json", "web-client/bun.lock"],
  },
];

const decodeContent = (data) => {
  if (!data || Array.isArray(data) || data.type !== "file") {
    throw new Error("Expected a file response from the GitHub API");
  }

  return Buffer.from(data.content, data.encoding).toString("utf8");
};

const getFileContent = async ({ github, owner, repo, path, ref }) => {
  const response = await github.rest.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });

  return decodeContent(response.data);
};

const getJsonFile = async (params) =>
  JSON.parse(await getFileContent(params));

const getBaseRefParams = ({ owner, repo, pullRequest }) => ({
  owner,
  repo,
  ref: pullRequest.base.sha,
});

const getHeadRefParams = ({ pullRequest }) => ({
  owner: pullRequest.head.repo.owner.login,
  repo: pullRequest.head.repo.name,
  ref: pullRequest.head.sha,
});

const getTouchedEcosystems = (files) => {
  if (files.length === 0 || files.some((file) => file.status !== "modified")) {
    return [];
  }

  const changedFiles = new Set(files.map((file) => file.filename));
  const supportedFiles = new Set(
    SUPPORTED_ECOSYSTEMS.flatMap((ecosystem) => ecosystem.files)
  );

  if ([...changedFiles].some((filename) => !supportedFiles.has(filename))) {
    return [];
  }

  const touchedEcosystems = [];

  for (const ecosystem of SUPPORTED_ECOSYSTEMS) {
    const touchedFiles = ecosystem.files.filter((filename) =>
      changedFiles.has(filename)
    );

    if (touchedFiles.length === 0) {
      continue;
    }

    if (touchedFiles.length !== ecosystem.files.length) {
      return [];
    }

    touchedEcosystems.push(ecosystem);
  }

  return touchedEcosystems;
};

const comparePackageJson = (basePkg, headPkg) => {
  const baseRest = { ...basePkg };
  const headRest = { ...headPkg };

  for (const section of JAVASCRIPT_DEPENDENCY_SECTIONS) {
    delete baseRest[section];
    delete headRest[section];
  }

  if (!isDeepStrictEqual(baseRest, headRest)) {
    return [];
  }

  const changes = [];

  for (const section of JAVASCRIPT_DEPENDENCY_SECTIONS) {
    const baseDependencies = basePkg[section] ?? {};
    const headDependencies = headPkg[section] ?? {};
    const packageNames = new Set([
      ...Object.keys(baseDependencies),
      ...Object.keys(headDependencies),
    ]);

    for (const packageName of packageNames) {
      const before = baseDependencies[packageName];
      const after = headDependencies[packageName];

      if (isDeepStrictEqual(before, after)) {
        continue;
      }

      if (before === undefined || after === undefined) {
        return [];
      }

      changes.push({
        name: packageName,
        before,
        after,
        label: JAVASCRIPT_SECTION_LABELS[section] ?? section,
      });
    }
  }

  return changes.sort((left, right) => left.name.localeCompare(right.name));
};

const parseGoMod = (content) => {
  const lines = content.split(/\r?\n/);
  const rest = [];
  const dependencies = new Map();
  let inRequireBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "require (") {
      inRequireBlock = true;
      continue;
    }

    if (inRequireBlock && trimmed === ")") {
      inRequireBlock = false;
      continue;
    }

    const requireMatch = (inRequireBlock ? trimmed : trimmed.replace(/^require\s+/, ""))
      .match(/^(\S+)\s+(\S+)(?:\s+\/\/\s+indirect)?$/);

    if ((inRequireBlock || trimmed.startsWith("require ")) && requireMatch) {
      const [, name, version] = requireMatch;

      dependencies.set(name, {
        version,
        indirect: trimmed.endsWith("// indirect"),
      });
      continue;
    }

    rest.push(line);
  }

  return {
    rest: rest.join("\n").trim(),
    dependencies,
  };
};

const compareGoMod = (baseMod, headMod) => {
  const baseParsed = parseGoMod(baseMod);
  const headParsed = parseGoMod(headMod);

  if (baseParsed.rest !== headParsed.rest) {
    return [];
  }

  const names = new Set([
    ...baseParsed.dependencies.keys(),
    ...headParsed.dependencies.keys(),
  ]);
  const changes = [];

  for (const name of names) {
    const before = baseParsed.dependencies.get(name);
    const after = headParsed.dependencies.get(name);

    if (!before || !after) {
      return [];
    }

    if (before.indirect !== after.indirect) {
      return [];
    }

    if (before.version === after.version) {
      continue;
    }

    changes.push({
      name,
      before: before.version,
      after: after.version,
      label: before.indirect ? "indirect dependency" : "dependency",
    });
  }

  return changes.sort((left, right) => left.name.localeCompare(right.name));
};

const hasRelevantLockfileChanges = (baseLockfile, headLockfile, changes) => {
  if (baseLockfile === headLockfile) {
    return false;
  }

  return changes.every((change) => headLockfile.includes(change.name));
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const runGitGrep = (args, repositoryRoot = process.cwd()) => {
  try {
    const output = execFileSync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
    });

    return output.trim() ? output.trim().split("\n") : [];
  } catch (error) {
    if (error.status === 1) {
      return [];
    }

    throw error;
  }
};

const toUniqueFiles = (lines) =>
  [...new Set(lines.map((line) => line.split(":")[0]).filter(Boolean))].slice(0, 5);

const findJavaScriptUsage = (packageName, repositoryRoot) => {
  const pattern = [
    `from ["']${escapeRegExp(packageName)}["']`,
    `import\\(["']${escapeRegExp(packageName)}["']\\)`,
    `require\\(["']${escapeRegExp(packageName)}["']\\)`,
  ].join("|");

  return toUniqueFiles(
    runGitGrep([
      "grep",
      "-nE",
      pattern,
      "--",
      "web-client/src",
      "web-client/vite.config.ts",
      "web-client/eslint.config.mjs",
    ], repositoryRoot)
  );
};

const findGoUsage = (moduleName, repositoryRoot) =>
  toUniqueFiles(
    runGitGrep(["grep", "-nF", moduleName, "--", "."], repositoryRoot)
      .filter((line) => line.endsWith(".go") || line.includes(".go:"))
  );

const normalizeNpmVersion = (version) => {
  const match = String(version).match(/\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/);

  return match?.[0] ?? null;
};

const getNpmMetadata = async ({ packageName, version }) => {
  const normalizedVersion = normalizeNpmVersion(version);

  if (!normalizedVersion) {
    return null;
  }

  try {
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(normalizedVersion)}`,
      {
        headers: {
          accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      description: data.description,
    };
  } catch {
    return null;
  }
};

const getAreaFromFile = (file) => {
  if (file.startsWith("web-client/src/")) {
    const parts = file.split("/");

    return parts.length >= 4 ? `${parts[0]}/${parts[1]}/${parts[2]}` : "web-client/src";
  }

  if (file.includes("/")) {
    return file.split("/")[0];
  }

  return file;
};

const getAffectedAreas = (sections) =>
  [...new Set(sections.flatMap((section) => section.details.flatMap((detail) => detail.usage.map(getAreaFromFile))))].sort();

const buildComment = (files, sections) => {
  const affectedAreas = getAffectedAreas(sections);
  const lines = [
    COMMENT_MARKER,
    "Standard dependency update review:",
    "",
    "### Files changed",
    ...files.map((file) => `- \`${file.filename}\``),
    "",
    "### Affected areas",
  ];

  if (affectedAreas.length > 0) {
    lines.push(...affectedAreas.map((area) => `- \`${area}\``));
  } else {
    lines.push("- No direct runtime or test usage found");
  }

  lines.push("", "### Updated dependencies");

  for (const section of sections) {
    lines.push(`#### ${section.title}`);

    for (const detail of section.details) {
      lines.push(
        `- \`${detail.name}\` (${detail.label}): \`${detail.before}\` -> \`${detail.after}\``
      );

      if (detail.description) {
        lines.push(`  - ${detail.description}`);
      }

      if (detail.usage.length > 0) {
        lines.push(
          `  - Affected files: ${detail.usage.map((file) => `\`${file}\``).join(", ")}`
        );
      } else {
        lines.push("  - Affected files: no direct imports found in the repository");
      }
    }

    lines.push("");
  }

  lines.push(
    "This comment updates automatically while the PR remains a dependency-only version change."
  );

  return lines.join("\n");
};

const upsertComment = async ({ github, owner, repo, issueNumber, body }) => {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  const existingComment = comments.find(
    (comment) =>
      comment.user?.type === "Bot" && comment.body?.includes(COMMENT_MARKER)
  );

  if (!body) {
    if (existingComment) {
      await github.rest.issues.deleteComment({
        owner,
        repo,
        comment_id: existingComment.id,
      });
    }

    return;
  }

  if (existingComment) {
    if (existingComment.body !== body) {
      await github.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body,
      });
    }

    return;
  }

  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
};

const buildGoSection = async ({ github, owner, repo, pullRequest, repositoryRoot }) => {
  const baseRef = getBaseRefParams({ owner, repo, pullRequest });
  const headRef = getHeadRefParams({ pullRequest });
  const [baseMod, headMod, baseSum, headSum] = await Promise.all([
    getFileContent({ github, ...baseRef, path: "go.mod" }),
    getFileContent({ github, ...headRef, path: "go.mod" }),
    getFileContent({ github, ...baseRef, path: "go.sum" }),
    getFileContent({ github, ...headRef, path: "go.sum" }),
  ]);

  const changes = compareGoMod(baseMod, headMod);

  if (!changes.length || !hasRelevantLockfileChanges(baseSum, headSum, changes)) {
    return null;
  }

  return {
    title: "Go modules",
    details: changes.map((change) => ({
      ...change,
      usage: findGoUsage(change.name, repositoryRoot),
    })),
  };
};

const buildWebClientSection = async ({
  github,
  owner,
  repo,
  pullRequest,
  repositoryRoot,
}) => {
  const baseRef = getBaseRefParams({ owner, repo, pullRequest });
  const headRef = getHeadRefParams({ pullRequest });
  const [basePackageJson, headPackageJson, baseLockfile, headLockfile] =
    await Promise.all([
      getJsonFile({
        github,
        path: "web-client/package.json",
        ...baseRef,
      }),
      getJsonFile({
        github,
        path: "web-client/package.json",
        ...headRef,
      }),
      getFileContent({
        github,
        path: "web-client/bun.lock",
        ...baseRef,
      }),
      getFileContent({
        github,
        path: "web-client/bun.lock",
        ...headRef,
      }),
    ]);

  const changes = comparePackageJson(basePackageJson, headPackageJson);

  if (!changes.length || !hasRelevantLockfileChanges(baseLockfile, headLockfile, changes)) {
    return null;
  }

  const details = await Promise.all(
    changes.map(async (change) => {
      const metadata = await getNpmMetadata({
        packageName: change.name,
        version: change.after,
      });

      return {
        ...change,
        description: metadata?.description,
        usage: findJavaScriptUsage(change.name, repositoryRoot),
      };
    })
  );

  return {
    title: "Web client",
    details,
  };
};

export default async ({
  github,
  context,
  core,
  pullRequest: explicitPullRequest,
  repositoryRoot,
}) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const pullRequest = explicitPullRequest ?? context.payload.pull_request;

  if (!pullRequest) {
    core.info("No pull request context available");
    return;
  }

  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullRequest.number,
    per_page: 100,
  });

  const touchedEcosystems = getTouchedEcosystems(files);

  if (!touchedEcosystems.length) {
    core.info("PR is not a supported dependency-only update");
    await upsertComment({
      github,
      owner,
      repo,
      issueNumber: pullRequest.number,
      body: null,
    });
    return;
  }

  const sections = [];

  for (const ecosystem of touchedEcosystems) {
    if (ecosystem.id === "go") {
      const section = await buildGoSection({
        github,
        owner,
        repo,
        pullRequest,
        repositoryRoot,
      });
      if (!section) {
        core.info("go.mod/go.sum contain non-version dependency changes");
        await upsertComment({
          github,
          owner,
          repo,
          issueNumber: pullRequest.number,
          body: null,
        });
        return;
      }

      sections.push(section);
      continue;
    }

    if (ecosystem.id === "web-client") {
      const section = await buildWebClientSection({
        github,
        owner,
        repo,
        pullRequest,
        repositoryRoot,
      });

      if (!section) {
        core.info(
          "web-client/package.json or bun.lock contain non-version dependency changes"
        );
        await upsertComment({
          github,
          owner,
          repo,
          issueNumber: pullRequest.number,
          body: null,
        });
        return;
      }

      sections.push(section);
    }
  }

  await upsertComment({
    github,
    owner,
    repo,
    issueNumber: pullRequest.number,
    body: buildComment(files, sections),
  });
};
