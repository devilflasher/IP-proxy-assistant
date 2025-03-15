<div align="center">

# IP代理助手 V3.0

[![Chrome](https://img.shields.io/badge/Chrome-Latest-4285F4.svg?style=flat&logo=google-chrome&logoColor=white)](https://www.google.com/chrome/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E.svg?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26.svg?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6.svg?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Manifest V3](https://img.shields.io/badge/Manifest_V3-4285F4.svg?style=flat&logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE)

  <strong>作者：Devilflasher</strong>：<span title="No Biggie Community Founder"></span>
  [![X](https://img.shields.io/badge/X-1DA1F2.svg?style=flat&logo=x&logoColor=white)](https://x.com/DevilflasherX)
[![微信](https://img.shields.io/badge/微信-7BB32A.svg?style=flat&logo=wechat&logoColor=white)](https://x.com/DevilflasherX/status/1781563666485448736 "Devilflasherx")
 [![Telegram](https://img.shields.io/badge/Telegram-0A74DA.svg?style=flat&logo=telegram&logoColor=white)](https://t.me/devilflasher0)
 [![Discord](https://img.shields.io/badge/Discord-7289DA.svg?style=flat&logo=discord&logoColor=white)](https://discord.com/invite/RMsffEx277)
 （欢迎加入微信群或Discord社区交流）

</div>

> [!IMPORTANT]
> ## ⚠️ 免责声明
> 
> 1. **本插件为开源项目，仅供学习交流使用，不得用于任何闭源商业用途**
> 2. **使用者应遵守当地法律法规，禁止用于任何非法用途**
> 3. **开发者不对因使用本插件导致的直接/间接损失承担任何责任**
> 4. **使用本插件即表示您已阅读并同意本免责声明**

## 插件介绍
IP代理助手是一款Chrome浏览器代理管理插件。它可以帮助用户轻松管理和切换不同的代理服务器，支持批量导入配置，并提供实时的连接状态监控。3.0版本带来了全新的用户体验和更丰富的功能。

## 功能特性

- `全新界面设计`：3.0版本采用现代简约风格，交互更流畅
- `多代理管理`：支持添加、编辑、删除多个代理服务器配置
- `浏览器角标`：在图标上显示当前代理窗口编号，一目了然
- `批量导入导出`：支持通过CSV文件批量导入导出代理配置
- `快速切换`：一键切换不同的代理服务器
- `状态监控`：实时显示代理连接状态
- `自动认证`：支持代理服务器的用户名密码认证
- `Manifest V3`：全面升级至Manifest V3架构，提供更好的安全性和性能
- `系统兼容`：完美支持Windows和MacOS系统

## 环境要求

- Chrome浏览器 最新版
- 支持Windows/MacOS系统
- 开启全局（TUN模式）的代理环境

## 安装教程

### 方法一：从Chrome商店安装

1. 访问Chrome网上应用店
2. 搜索"IP代理助手"
3. 点击"添加到Chrome"

### 方法二：开发者模式安装

1. 下载插件源码
2. 打开Chrome扩展程序页面 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择插件源码目录

## 使用说明

### 基本设置

1. **添加代理服务器**
   - 点击插件图标打开弹窗
   - 点击设置按钮进入设置页面
   - 点击"+"按钮添加新代理配置
   - 填写代理服务器信息（协议、IP、端口等）
   - 点击保存

2. **批量导入配置**
   - 在设置页面点击"批量导入"
   - 选择CSV格式的配置文件
   - 确认导入的配置信息
   - 点击保存

### CSV文件格式
```csv
代理1,http,192.168.1.1,8080,username,password
代理2,https,10.0.0.1,3128,,
```
字段说明：名称,协议类型,IP地址,端口,用户名(可选),密码(可选)

### 日常使用

1. **切换代理**
   - 点击插件图标
   - 从下拉菜单选择代理服务器
   - 点击开关启用代理

2. **查看状态**
   - 代理连接状态
   - 当前使用的代理信息
   - 图标角标显示当前代理编号

## 注意事项

- MAC系统首次使用时可能需要在系统设置中允许代理更改
- 建议定期检查代理服务器的可用性
- 使用批量导入功能时请确保CSV文件格式正确
- 名称位置建议填窗口编号，这样插件连接代理后，浏览器插件图标上会有角标显示窗口编号

## 常见问题

1. **IP代理无法连接**
   - 检查代理服务器是否在线
   - 验证IP地址和端口是否正确
   - 确认用户名密码是否正确

2. **认证弹窗频繁出现（就是让你输入用户名和密码的那个弹窗）**
   - 更换其它厂家的IP尝试
   - 检查代理配置信息是否正确
   - 确保系统防火墙未拦截代理连接
   - 检查杀毒软件是否干扰了认证过程

3. **TUN模式弹窗提示**
   - 确认系统TUN模式或全局代理是否正确开启
   - Clash需开启TUN模式及服务模式
   - V2Ray需开启TUN模式
   - Surge需开启TUN模式
   - Quantumult X需开启TUN模式
   - sing-box需开启TUN模式
   - 快连默认配置下应该能正常使用

4. **代理连接弹窗提示**
   - 检查电脑是否开了翻墙软件
   - 检查翻墙软件是否工作正常

## 隐私说明

- 所有配置信息仅保存在用户本地
- 不收集任何用户个人信息
- 不上传任何数据到外部服务器
- 完整的隐私政策请查看：[隐私政策](https://github.com/YOUR_USERNAME/YOUR_REPO/blob/main/PRIVACY.md)

## 更新日志

### v3.0 (2024-03-15)
- 全新界面设计，现代化UI体验
- 增加浏览器图标角标，显示当前代理编号
- 优化批量导入功能，支持更灵活的CSV格式
- 全面升级至Manifest V3架构
- 改进代理认证机制
- 优化数据存储结构
- 提升Mac系统兼容性

### v2.1
- 优化代理认证机制
- 改进TUN模式检测
- 增加Mac系统兼容性
- UI界面优化

### v2.0
- 添加批量导入功能
- 支持CSV文件导入
- 增加状态监控功能
- 改进错误提示

## 许可证

本项目采用 GPL-3.0 License，保留所有权利。使用本代码需明确标注来源，禁止闭源商业使用。

🔄 持续更新中 