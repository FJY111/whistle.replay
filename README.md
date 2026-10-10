# whistle.replay

whistle 插件：按规则保存抓包响应为本地文件，并按路径和 HTTP 方法自动回放最早的一份。

## 功能

- **保存规则**：完整 URL（子串 或 `/正则/i`）+ HTTP 方法 + 响应类型（JSON / 文本 / SSE）多维匹配，命中即把响应体写入规则指定的目录；同时记下状态码、响应头、请求头和请求体。支持响应状态码过滤、响应体大小上限与 JSON 格式化；每条规则独立的保存目录与开关
- **回放开关**：默认开启。关闭时一律不回放，请求继续访问真实服务器
- **需要回放**：白名单。可选域名（只比主机名）和可选路径（只比 pathname），语法都是子串或 `/正则/i`，两者都填必须同时命中；还可限制方法。开关开启时，只有命中白名单的请求才按 pathname + HTTP 方法回放最早的一份（原始状态码、响应头、响应体）。未命中或对不上则继续访问真实服务器。空响应、二进制和超过大小上限的响应不保存
- 已保存文件预览与在线编辑（CodeMirror），可查看路径、状态码、请求侧信息和响应头

## 安装

1. 先安装 whistle：[https://github.com/avwo/whistle](https://github.com/avwo/whistle)
2. 安装插件：
   ```
   bun i -g whistle.replay
   ```
3. 在 whistle 管理界面的 Plugins 中打开 Replay 的配置界面。

## 使用

### 保存规则

1. 打开「保存规则」总开关。
2. 添加规则：填写 URL 匹配（子串或 `/正则/i`）、可选 HTTP 方法、保存目录（本地绝对路径）、保存类型与大小上限。高级选项可按状态码过滤，并将 JSON 格式化后保存。
3. 点击「更新配置」或 ⌘/Ctrl + S 生效。命中的请求响应体会保存为 `{路径末段}_{时间戳}_{随机}.json|txt`。`.replay-index.json` 最多展示较新的 500 条；`.replay-replay.json` 按路径和方法保留最早一份，供自动回放。这两个文件写在保存目录里，和 `whistle.sake` 的 `.sake-*` 分开。

保存成功后不会自动对所有请求回放。回放还要打开「需要回放」开关，并且请求命中白名单。被回放的响应不会再次写入。

### 需要回放

1. 回放开关默认开启，和保存开关同一层级。关闭后一律不回放。
2. 添加白名单：域名只比较主机名，路径只比较 pathname，都可以是子串或 `/正则/i`。只填其中一个即可；两个都填必须同时命中。可选 HTTP 方法。
3. 点击「更新配置」生效。开关开启且命中任一启用规则时，按 pathname 和 HTTP 方法回放最早的一份；否则继续访问真实服务器。未命中白名单的请求若同时命中保存规则，仍会保存真实响应。

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
server/   插件服务端（resStatsServer 保存响应、rulesServer 按路径自动回放、uiServer 配置界面 CGI）
src/      配置界面（React + antd）
test/     纯逻辑单元测试（bun:test）
rules.txt 插件全局规则（触发插件 hooks）
```
