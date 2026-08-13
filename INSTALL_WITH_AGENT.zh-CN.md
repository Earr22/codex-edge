# 让 Agent 安装 Codex Edge

把下面提示词复制到新的 Codex 任务。它授权安装插件，但不授权 Agent 自动修复系统配置。

```text
请为当前 Windows 用户安装非官方 Codex Edge 插件：https://github.com/Earr22/codex-edge

目标：
- 把 codex-edge 安装为 Codex 插件 Marketplace 来源。
- 运行只读诊断。
- 让用户在新的 Codex Desktop 任务中可以明确选择 Microsoft Edge。

必须遵循的流程：
1. 确认系统是 Windows。确认已安装 Codex Desktop、Microsoft Edge、Node.js 18+ 和官方 ChatGPT 浏览器扩展；不要读取浏览器配置内容。
2. 阅读仓库的 README.zh-CN.md、SECURITY.md、PRIVACY.md、THIRD_PARTY.md 和本文件。
3. 定位可运行的官方 Codex CLI。优先使用最新 native-host 清单中的 `paths.codexCliPath`，其次尝试当前用户的 `.codex/plugins/.plugin-appserver/codex.exe`，最后尝试 `codex` 命令；不要输出原始路径。
4. 检查该仓库是否已配置为 Marketplace。只使用受支持的 Codex 插件命令，不手改 config.toml 或其他 Marketplace 条目。
5. 使用已定位的 Codex CLI 执行：
   codex plugin marketplace add Earr22/codex-edge
   codex plugin add codex-edge@codex-edge
6. 通过 Codex 插件列表或缓存元数据定位安装目录，不猜测带版本号的路径。
7. 在安装后的插件目录执行 `node scripts/codex-edge.mjs doctor`，保持路径脱敏开启。
8. 如果 doctor 健康，停止修改文件；提示用户重启 Codex Desktop，并新建启用了 Codex Edge 的任务。
9. 如果 doctor 报告 resourcesPath 过期，只执行 `node scripts/codex-edge.mjs repair` 预览。展示目标字段、脱敏前后值、备份策略和修改理由。
10. 再次取得用户明确确认。只有确认后才能执行：
   node scripts/codex-edge.mjs repair --apply --acknowledge-backup
11. 再次运行 doctor，然后提示用户重启 Codex Desktop 并新建任务。
12. 使用 https://example.com 等无需登录的公开网页验证。不要列出用户原有标签页，不使用账号页面。

硬性安全限制：
- 不索取或显示密码、Token、Cookie、会话数据、浏览历史、local/session storage 或原始浏览器配置。
- 除非用户明确要求排障，否则不输出原始本机路径。
- 不设置 NODE_REPL_TRUST_ALL_CODE=1，不关闭沙箱，不开放远程调试端口，不切换到 Chrome 或内置 Browser。
- 不修改官方浏览器客户端、扩展文件、WindowsApps 文件、注册表、全局 Git 配置或无关 Codex 设置。
- 没有第 10 步的单独确认，不得写入修复。

最终报告：
- 已安装或此前已安装
- Doctor 状态
- 修复为预览/已执行/无需修复
- 如有备份，报告脱敏后的备份位置
- 重启和新建任务说明
```

安装成功不等于 Edge 已连接。最终浏览器验证必须在重启后的新 Codex Desktop 任务中进行。
