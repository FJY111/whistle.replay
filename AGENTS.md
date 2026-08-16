# AGENTS.md

## Project

whistle 插件：按规则保存抓包响应并用文件 Mock 请求。Package manager is **bun** (`>=1.3.0` in `package.json` `engines`). Do not use npm, yarn, or pnpm.

Shared agent config lives in `.agents/`. `.claude`, `.codex`, and `.cursor` are symlinks to that folder — edit `.agents/` only.

## Layout

- `server/` — 插件服务端（tsc → `lib/`，CommonJS，供 whistle `require`）
- `src/` — 配置界面（`index.tsx` 入口，colocated `*.css`，`assets/`）
- `public/` — Rsbuild 构建产物，由 uiServer 托管
- `test/` — bun:test 纯逻辑单测
- `rules.txt` — 插件全局规则
- `rsbuild.config.mts` — 界面打包
- `tsconfig.server.json` — 服务端编译
- `eslint.config.ts` / `.stylelintrc.json` / `.prettierrc` — lint and format

## Commands

- `bun run dev` — Start the UI dev server（`/cgi-bin` 代理到本地 whistle）
- `bun run build` — Build server (`lib/`) and UI (`public/`)
- `bun run build:server` — `tsc -p tsconfig.server.json`
- `bun run build:ui` — Rsbuild production build
- `bun run preview` — Preview the production UI locally
- `bun test` — Run bun:test unit tests
- `bun run lint` — Lint with ESLint and Stylelint
- `bun run format` — Format with Prettier
- `bun run check` — Check formatting with Prettier
- `bun run typecheck` — Type-check UI, server, and tests

Before claiming work is done, run `bun run lint`, `bun run typecheck`, `bun run check`, and `bun test`.

## Conventions

- TypeScript `strict` + `verbatimModuleSyntax`（UI / tests）: use `import type` for type-only imports
- Server compiles as CommonJS (`export =` for whistle hooks)
- Always use curly braces; `===` (`== null` is allowed for nullish checks)
- No `console.log` (`console.warn` / `console.error` are allowed)
- Function components; colocate `Component.css` next to `Component.tsx`
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, …). `commitlint` runs on `commit-msg`. Do not commit unless asked.

## Docs

- Rsbuild: https://rsbuild.rs/llms.txt
- Rspack: https://rspack.rs/llms.txt
- ESLint: https://eslint.org/docs/latest/
- Stylelint: https://stylelint.io/user-guide/rules/

## Tools

### ESLint

- Run `bun run lint` to lint JS/TS and CSS
- JS/TS config: `eslint.config.ts`
- CSS config: `.stylelintrc.json`

### Prettier

- Run `bun run format` to format your code
- Config: `.prettierrc`

### husky / lint-staged

- `.husky/pre-commit` runs `bunx lint-staged`
- Staged `*.{js,jsx,ts,tsx}` go through `eslint --fix` then `prettier --write`
- Staged `*.css` go through `stylelint --fix` then `prettier --write`
- `.husky/commit-msg` runs `bunx commitlint --edit` (Conventional Commits)
