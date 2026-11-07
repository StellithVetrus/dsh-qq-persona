# DSH QQ Persona

一个把 **DeepSeek Harness**、**SnowLuma（QQ/OneBot）** 和 **QQ 桥接** 串起来的最小可运行框架。

> 默认角色是“对话者”，不是任何现成作品角色。  
> 角色、声音、记忆都由使用者自己定义；仓库不附带私人角色卡、Cookie、聊天记录或声音模型。

## 它是什么

```text
QQ ←→ SnowLuma/OneBot ←→ qq-bridge ←→ DSH Web ←→ 模型
```

桥接把 QQ 消息变成 DSH agent 的输入，再把 agent 的回复发回 QQ。

这个仓库提供：

- qq-bridge 的 MIT 源码底座
- 一键安装脚本
- 配置模板
- “对话者”示例人格
- 启动/停止脚本
- 安装与安全文档

## 前置条件

需要用户自己安装：

1. **Windows 10/11**
2. **Node.js 22+**
3. **DeepSeek Harness**（DSH）
4. **SnowLuma**（QQ 的 OneBot 实现）
5. 一个单独的 QQ bot 账号
6. 模型 API（DeepSeek 或兼容端点）

> DSH 和 SnowLuma 是第三方软件，本仓库不打包它们。

## 安装成 DSH 插件

先安装 bridge 依赖：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

再把本目录作为本地插件挂到 DSH：

```powershell
dsh plugin --profile web add link:<本项目绝对路径>
```

重启 DSH 后，在「设置」里会看到 **QQ 对话者**。
第一次打开设置页时，填写：

- 人格文件路径
- Owner QQ
- DSH 地址
- SnowLuma 目录

插件只负责启动/停止 bridge，不会打包任何人的人格。

## 也可以不用插件

```powershell
# 1. 克隆
git clone <你的仓库地址> dsh-qq-persona
cd dsh-qq-persona

# 2. 安装
powershell -ExecutionPolicy Bypass -File .\install.ps1

# 3. 先启动 DSH Web（默认 3080）和 SnowLuma
# 4. 启动桥接
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

安装脚本会问：

- 你的 QQ 号（owner）
- SnowLuma 目录（可留空）
- 数据目录（默认 `.\data`）

然后生成：

- `bridge/config.json`
- `bridge/roles/对话者.md`
- `bridge/state/current-role.json`
- `data/workspace`

## 改角色

编辑：

```text
personas/example-dialogue/persona.md
```

或者新建：

```text
personas/<你的角色名>/persona.md
```

安装时把 `-AssistantName` 改成你的角色名：

```powershell
.\install.ps1 -AssistantName "小助手"
```

角色卡不要直接使用别人的作品角色或声音；确保你有权使用。

## 声音（可选）

默认不启用 TTS。  
需要语音时，自行准备 TTS 服务（如 GPT-SoVITS）和你有权使用的参考音频；仓库不附带声音模型。

见 [`docs/voice.md`](docs/voice.md)。

## 数据与隐私

运行时数据不进 Git：

```text
bridge/config.json
bridge/state/
data/
logs/
*.wav
*.pth
```

不要提交：

- Cookie / token / API key
- QQ 号、群号
- 聊天记录、记忆、session
- 声音模型、参考音频
- 私人角色卡

## 安全

- 只允许 owner 私聊控制 bot
- 不要给陌生人群发权限
- 不要把配置和 Cookie 发到公开仓库
- 工具权限按最小必要开放

见 [`docs/security.md`](docs/security.md)。

## 许可证

- 本仓库：MIT
- `bridge/`：来自 qq-bridge，MIT，保留原作者版权
- DSH、SnowLuma 等第三方软件按其自身许可证使用，不随本仓库分发

## 说明

这是可运行的底座，不是某个特定角色的人设包。  
“对话者”只是默认示例；使用者应当自己填写角色、关系和声音。
