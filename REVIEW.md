# 审阅说明

这是公开前的**干净底座**，不是把当前运行目录直接打包。

## 已包含

- DSH 插件外壳：`index.js` / `client.js` / `cordis.patch.yml`
- `bridge/`：qq-bridge 源码（MIT，来自上游）
- `personas/example-dialogue/`：默认“对话者”人格
- `config/config.example.json`：配置模板
- `install.ps1`：一键安装
- `scripts/start.ps1` / `scripts/stop.ps1`
- `README.md`、`docs/`、`LICENSE`、`NOTICE`
- `.gitignore`：排除配置、Cookie、记忆、session、声音

## 明确未包含

- 私人角色卡
- 私人角色的语音/参考音频/模型
- 你的 QQ 号、群号、Cookie、API key
- 聊天记录、长期记忆、session
- 旧运行目录里的运行数据
- 抖音插件源码（第三方，建议单独安装）
- DSH / SnowLuma / ffmpeg / 模型二进制

## 还没迁入的当前功能

当前运行版里做过、但这个底座尚未合并的：

- 视频抽帧 + 视觉描述
- 30 分钟/时间窗口预算
- 抖音插件工具白名单
- 当前版本的 prompt 调整
- 自定义去口癖规则

这些应作为后续补丁逐个迁入；不要为了“完整”把它们连同私人配置一起复制。

## 安装前置

用户需要自己安装：

- Windows 10/11
- Node.js 22+
- DeepSeek Harness
- SnowLuma
- 模型 API

安装脚本会检查 Node 和 bridge，但不会替你安装 DSH/SnowLuma。

## 试跑

```powershell
cd <你解压后的项目目录>
powershell -ExecutionPolicy Bypass -File .\install.ps1 -SkipNpm
```

安装后编辑 `bridge/config.json`，填入：

- `ownerQQ`
- `allow.private` / `allow.groups`
- `snowluma.homeDir`
- 模型配置

## 上传前

1. 人工看一遍 `README.md` 和 `REVIEW.md`
2. 搜私人角色名、QQ 号、`Cookie`、`api key`
3. 确认 `.gitignore` 生效
4. `git init`、`git add`、`git status`
5. 确认没有 `bridge/config.json`、`bridge/state/`、`data/`
6. 再创建 GitHub 仓库并 push
