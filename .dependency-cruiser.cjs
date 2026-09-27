/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make modules impossible to reason about in isolation.',
      from: {},
      to: {circular: true},
    },
    {
      name: 'package-public-api-only',
      severity: 'error',
      comment:
        'A package may only use another package through its public entry point (src/index.ts), ' +
        'imported by package name. Internal files are encapsulated.',
      from: {path: '^(packages|plugins)/([^/]+)/'},
      to: {
        path: '^(packages|plugins)/([^/]+)/',
        pathNot: ['^$1/$2/', '^(packages|plugins)/[^/]+/src/index[.]ts$'],
      },
    },
    {
      name: 'no-relative-cross-package',
      severity: 'error',
      comment: 'Other packages must be imported by package name, never by relative path.',
      from: {path: '^(packages|plugins)/([^/]+)/'},
      to: {
        path: '^(packages|plugins)/',
        pathNot: '^$1/$2/',
        dependencyTypesNot: ['aliased-workspace'],
      },
    },
    {
      name: 'core-depends-on-nothing',
      severity: 'error',
      comment: 'The domain core is independent: adapters depend on it, never the other way round.',
      from: {path: '^packages/core/'},
      to: {path: '^(packages|plugins)/', pathNot: '^packages/core/'},
    },
    {
      name: 'plugins-use-only-the-core',
      severity: 'error',
      comment:
        'A plugin reaches Catón AI only through the core public API, never the ledger or other ' +
        'packages, so that it can later run isolated in its own process (ADR 0006).',
      from: {path: '^plugins/([^/]+)/'},
      to: {path: '^(packages|plugins)/', pathNot: ['^packages/core/', '^plugins/$1/']},
    },
    {
      name: 'only-the-cli-loads-plugins',
      severity: 'error',
      comment: 'Plugins are wired in one place, the composition root of the command line.',
      from: {path: '^packages/', pathNot: '^packages/cli/'},
      to: {path: '^plugins/'},
    },
    {
      name: 'no-test-code-in-production',
      severity: 'error',
      from: {path: '^(packages|plugins)/[^/]+/src/'},
      to: {path: '^(packages|plugins)/[^/]+/test/'},
    },
    {
      name: 'no-orphans',
      severity: 'error',
      from: {orphan: true, pathNot: ['[.]d[.]ts$', '^packages/[^/]+/src/main[.]ts$']},
      to: {},
    },
    {
      name: 'no-dev-dependencies-in-production',
      severity: 'error',
      comment: 'Production code must not depend on build, lint or test tooling.',
      from: {path: '^(packages|plugins)/[^/]+/src/'},
      to: {dependencyTypes: ['npm-dev']},
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: {couldNotResolve: true},
    },
    {
      name: 'no-undeclared-dependencies',
      severity: 'error',
      from: {},
      to: {dependencyTypes: ['npm-no-pkg', 'npm-unknown']},
    },
  ],
  options: {
    doNotFollow: {path: 'node_modules'},
    combinedDependencies: true,
    tsPreCompilationDeps: true,
    tsConfig: {fileName: 'tsconfig.json'},
    enhancedResolveOptions: {exportsFields: ['exports'], conditionNames: ['import', 'default']},
  },
};
