# whistle.sake

whistle 插件：按规则自动保存抓包响应为本地文件，并用保存的文件 Mock 请求（取 save + mock 之意）。

## 功能

- **保存规则**：URL（子串 或 `/正则/i`）+ HTTP 方法 + 响应类型（JSON / 文本 / SSE）多维匹配，命中即把响应体写入规则指定的目录；支持响应状态码过滤、响应体大小上限与 JSON 格式化；每条规则独立的保存目录与开关
- **Mock 规则**：URL + 方法匹配命中的请求直接返回本地保存的响应，不再访问真实服务器
  - 一条规则可挂多个响应文件，支持 **固定 / 轮换 / 随机** 三种返回模式
  - JSON / 文本一次性返回（可配响应延迟）；SSE 按事件逐段推送（可配推送间隔）
  - 支持自定义状态码、响应头、Mock 命中率与随机延迟抖动
- 文件搜索和类型筛选、文件预览与在线编辑（CodeMirror）、来源 URL / 方法 / 大小 / 时间展示
- 从保存规则一键生成 Mock、规则筛选、轮换进度重置、最近使用目录

## 安装

1. 先安装 whistle：[https://github.com/avwo/whistle](https://github.com/avwo/whistle)
2. 安装插件：
   ```
   bun i -g whistle.sake
   ```
3. 在 whistle 管理界面的 Plugins 中打开 Sake 的配置界面。

## 使用

### 保存规则

1. 打开「保存规则」总开关。
2. 添加规则：填写 URL 匹配（子串或 `/正则/i`）、可选 HTTP 方法、保存目录（本地绝对路径）、保存类型与大小上限。高级选项可按状态码过滤，并将 JSON 格式化后保存。
3. 点击「更新配置」或 ⌘/Ctrl + S 生效。命中的请求响应体会保存为 `{路径末段}_{时间戳}.json|txt`，并在目录下维护 `.sake-index.json` 索引。

### Mock 规则

1. 打开「Mock 规则」总开关。
2. 添加规则，或从一条保存规则点击「生成 Mock」。
3. 选择文件来源目录并勾选一个或多个响应文件。
4. 选择返回模式（固定 / 轮换 / 随机）与响应类型。
5. 可在高级选项中覆盖响应状态码和响应头，配置命中率与延迟抖动。
6. 点击「更新配置」生效。首个命中的启用规则生效；被 Mock 的响应不会被自动保存再次捕获。

## 开发

```bash
bun install
bun run dev        # Rsbuild，/cgi-bin 代理到 127.0.0.1:8899 的 whistle，可用 WHISTLE_PORT 覆盖
bun run build      # 构建服务端（tsc → lib/）与界面（Rsbuild → public/）
bun test           # 纯逻辑单元测试
bun run lint
bun run typecheck
```

技术栈：TypeScript · Rsbuild · React 19 · antd · CodeMirror · Koa · bun

目录结构：

```
server/   插件服务端（resStatsServer 保存响应、rulesServer 动态 mock 规则、uiServer 配置界面 CGI）
src/      配置界面（React + antd）
test/     纯逻辑单元测试（bun:test）
rules.txt 插件全局规则（触发插件 hooks）
```
