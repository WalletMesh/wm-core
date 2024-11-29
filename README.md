# WalletMesh Core

## Description

Core WalletMesh Protocol Libraries


## Development

This is a monorepo managed by [lerna](https://lerna.js.org/) and [pnpm](https://pnpm.io/).
[Biome](https://biomejs.dev) is used for formatting and linting.

VSCode & the provided devcontainer (in `.devcontainer`) is the recommended development environment.

### Setup

```bash
pnpm install
```

### Create a new package

```bash
pnpm create-package <name>
```

This will create a new package in the `packages/<name>` directory with the package name `@walletmesh/<name>`.
