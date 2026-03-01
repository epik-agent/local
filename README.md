# Epik

[![CI](https://github.com/epik-agent/local/actions/workflows/ci.yml/badge.svg)](https://github.com/epik-agent/local/actions/workflows/ci.yml)

Epik is a desktop application that autonomously builds software. Connect it to a GitHub repository with open issues, and it drives Claude to implement them — streaming progress in real time.

## Requirements

- [Rust](https://rustup.rs)
- [Node.js](https://nodejs.org) ≥ 20
- [pnpm](https://pnpm.io)

## Build

```sh
pnpm install
pnpm run build:sidecar
pnpm tauri build
```

## Run

```sh
pnpm install
pnpm run build:sidecar
pnpm tauri dev
```

## Test

```sh
pnpm test
```
