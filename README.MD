<div align="center">

# IP代理助手 V4.0

[![Chrome](https://img.shields.io/badge/Chrome-Latest-4285F4.svg?style=flat&logo=google-chrome&logoColor=white)](https://www.google.com/chrome/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E.svg?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Manifest V3](https://img.shields.io/badge/Manifest_V3-4285F4.svg?style=flat&logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)

[Chrome Web Store](https://chromewebstore.google.com/detail/ip%E4%BB%A3%E7%90%86%E5%8A%A9%E6%89%8B/dnbhefappamfbnghpgcpnfniojddeffk)
· [X](https://x.com/DevilflasherX)
· [Telegram](https://t.me/devilflasher0)
· [Discord](https://discord.com/invite/RMsffEx277)

作者：Devilflasher

</div>

> [!IMPORTANT]
> 本项目按 GPL-3.0 开源，仅用于合法的代理配置管理、开发和测试。使用者应遵守所在地法律法规以及代理服务商和目标网站的服务条款。开发者不对代理服务质量、第三方网络环境或不当使用造成的损失负责。

## 项目介绍

IP代理助手是一个 Manifest V3 Chrome 扩展，用于在浏览器内保存、切换、停用和诊断用户提供的代理服务器配置。

V4.0 不再把“已提交设置”描述为“已连接”。“代理已配置”只代表 Chrome 已接受当前设置，实际连通性仍取决于代理服务器、认证信息、来源 IP 白名单、本机 VPN/TUN、网络规则和目标网站。

## 支持范围

| 类型 | Chrome 支持情况 | 认证 |
| --- | --- | --- |
| HTTP | 支持 | 支持用户名/密码 |
| HTTPS | 支持，表示到代理服务器入口的连接使用 TLS | 支持用户名/密码 |
| SOCKS4 | 支持，目标主要限于 IPv4 | 不支持认证 |
| SOCKS5 | 支持，目标域名由代理端解析 | 不支持认证 |

> 很多代理商所称的“HTTPS 代理”实际是可以访问 HTTPS 网站的普通 HTTP 代理，这种情况仍应选择 **HTTP**。只有代理服务器入口本身使用 TLS 时才选择 **HTTPS**。

受 Chrome 原生代理接口限制，SOCKS4/SOCKS5 只支持无用户名、无密码配置；SOCKS5 不提供 UDP 代理。

## V4.0 主要改进

- 等待并复核 Chrome 代理配置结果，减少错误的成功提示。
- 在 Manifest V3 Service Worker 顶层注册认证监听器，休眠唤醒后仍可处理 HTTP/HTTPS 代理认证。
- 捕获代理控制权冲突和 `chrome.proxy.onProxyError`，显示可操作的错误信息。
- 明确阻止 Chrome 不支持的 SOCKS4/SOCKS5 用户名密码配置。
- 支持常见代理文本格式、CSV 导入和带方括号的 IPv6 地址。
- 配置及认证信息从 `storage.sync` 迁移到 `storage.local`，不再参与 Google 账号同步。
- 移除自动访问第三方测试网址和远程字体，所有运行时代码均随扩展打包。
- 修复配置渲染注入、状态写入竞态、版本更新时强制断开和 CSV 引号解析问题。

## 与 VPN、TUN 和代理客户端配合

VMess、VLESS、Trojan、Shadowsocks、Hysteria 等协议由 Clash、V2Ray、sing-box、Surge 等外部客户端处理，本扩展不实现这些协议内核，也不提供两级代理链配置。

- 外部客户端只开启“系统代理”时，本扩展启用 `fixed_servers` 会替换 Chrome 的系统代理，二者不能自动串联。
- 如需让 Chrome 到静态代理服务器的底层连接继续经过外部客户端，请使用 TUN、VPN 或全局接管模式。
- 外部客户端的规则必须允许访问静态代理服务器的地址和端口。
- 如果静态代理使用来源 IP 白名单，需要把当前外部节点的出口 IP 加入白名单；切换节点后通常需要同步更新。

## 安装

### Chrome Web Store

访问 [IP代理助手商店页面](https://chromewebstore.google.com/detail/ip%E4%BB%A3%E7%90%86%E5%8A%A9%E6%89%8B/dnbhefappamfbnghpgcpnfniojddeffk)，点击“添加至 Chrome”。

### 从源码加载

1. 克隆或下载本仓库。
2. 打开 `chrome://extensions/`。
3. 开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择包含 `manifest.json` 的仓库根目录。

## 使用方法

1. 点击扩展图标并进入设置页。
2. 添加代理名称、协议、服务器地址、端口和可选认证信息。
3. 保存后回到扩展弹窗，打开对应代理开关。
4. 根据弹窗中的配置状态或错误提示排查问题。
5. 关闭开关后，扩展会把 Chrome 恢复为“系统代理”模式。

支持的常见单行格式：

```text
host:port
scheme://user:pass@host:port
host:port:user:pass
[IPv6]:port
```

CSV 字段顺序：

```csv
名称,协议,服务器地址,端口,用户名,密码
代理1,HTTP,192.0.2.10,8080,user,password
代理2,SOCKS5,2001:db8::10,1080,,
```

SOCKS4/SOCKS5 行的用户名和密码必须留空。

## 常见问题

### SOCKS5 支持用户名和密码吗？

不支持。Chrome 的 `proxy` API 不提供 SOCKS4/SOCKS5 认证能力。本扩展继续支持无用户名、无密码的 SOCKS4/SOCKS5。

### 为什么代理显示“已配置”但网页无法访问？

“已配置”仅表示 Chrome 已应用设置。请继续检查代理地址和端口、HTTP/HTTPS 认证信息、代理服务状态、来源 IP 白名单、VPN/TUN 模式以及本机网络规则。

### 为什么只开系统代理的 Clash/V2Ray 无法与静态代理叠加？

启用本扩展后，Chrome 使用扩展提供的固定代理设置，不再沿用系统代理。需要通过 TUN、VPN 或全局接管模式处理到静态代理入口的底层连接。

### 代理配置保存在哪里？

配置和认证信息仅保存在本机的 `chrome.storage.local` 中，不会通过 Google 账号同步。

## 隐私

- 不收集或上传代理配置、认证信息、浏览记录、请求内容或响应内容。
- 不使用广告、分析或用户追踪服务。
- 不会为了测试连通性而自动访问开发者指定的第三方网址。
- 用户主动点击社区或作者链接时，Chrome 才会打开相应第三方网站。

完整说明见 [PRIVACY.MD](PRIVACY.MD)。

## 开发与测试

项目中的测试使用 Node.js 内置功能，无需安装第三方测试依赖：

```powershell
node tests/proxy_utils.test.cjs
node tests/background.test.mjs
node tests/package.test.mjs
```

在 Windows PowerShell 中构建商店发布包：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\build-release.ps1
```

脚本会先运行语法检查和测试，再生成：

- `dist/IP-proxy-assistant-v4.0.0-upload-folder/`
- `dist/IP-proxy-assistant-v4.0.0.zip`

发布检查事项见 [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)。

## 更新日志

### V4.0.0

- 提升 Manifest V3 后台认证和代理设置稳定性。
- 增加代理控制权与运行错误诊断。
- 明确 HTTP/HTTPS 与 SOCKS4/SOCKS5 的认证边界。
- 改进代理格式、IPv6 和 CSV 导入兼容性。
- 改为本地存储认证配置并移除自动外部测试请求。
- 修复多项状态、渲染和版本升级问题。

### V3.0.0

- 更新界面并加入多代理管理、CSV 导入和图标角标。
- 升级至 Manifest V3。

## 许可证

本项目采用 [GNU General Public License v3.0](LICENSE)。复制、修改和分发时请遵守许可证条款。
