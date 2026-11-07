# 安全与隐私

## 必须

- 使用单独的 QQ bot 账号，不要用主号
- `ownerQQ` 只填你自己的 QQ
- `allow.private` / `allow.groups` 只开放必要会话
- 不要把 Cookie、token、API key 提交到 Git
- 不要把 `bridge/state`、`data`、`logs` 提交到 Git

## 不要

- 不要把 bot 拉进不信任的群
- 不要给 bot 支付、密码、隐私窗口权限
- 不要把别人的聊天记录和声音上传公开仓库
- 不要把第三方软件和模型直接打包进仓库

## 公开前的检查

```powershell
# 检查常见敏感词（示例）
Select-String -Path .\**\* -Pattern 'sessionid|passport_csrf|api[_-]?key|Bearer ' -ErrorAction SilentlyContinue
```

确认没有 QQ 号、Cookie、路径、私人角色名后再 push。
