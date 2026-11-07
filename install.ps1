# 一键安装（Windows）
# 前置：Node.js 22+、DeepSeek Harness、SnowLuma 已安装。
param(
  [string]$AssistantName = '对话者',
  [long]$OwnerQQ = 0,
  [string]$DshUrl = 'http://127.0.0.1:3080',
  [string]$SnowLumaHome = '',
  [string]$DataDir = '',
  [switch]$SkipNpm
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$bridge = Join-Path $root 'bridge'
if (-not $DataDir) { $DataDir = Join-Path $root 'data' }

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw '缺少 Node.js 22+，请先安装 Node.js。' }
$nodeMajor = [int](& node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 22) { throw "Node.js 版本过低：$nodeMajor，需要 22+。" }
if (-not (Test-Path (Join-Path $bridge 'package.json'))) { throw '安装包不完整：bridge/package.json 不存在。' }

if ($OwnerQQ -le 0) {
  $raw = Read-Host '输入 owner 的 QQ 号（只有这个号能私聊控制 bot）'
  $OwnerQQ = [long]$raw
}
if (-not $SnowLumaHome) {
  $SnowLumaHome = Read-Host '输入 SnowLuma 安装目录（可留空，之后在 config.json 填）'
}

New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $DataDir 'workspace') -Force | Out-Null

$role = Join-Path $bridge 'roles'
New-Item -ItemType Directory -Path $role -Force | Out-Null
$template = Join-Path $root 'personas\example-dialogue\persona.md'
$targetRole = Join-Path $role "$AssistantName.md"
if ((Test-Path $template) -and -not (Test-Path $targetRole)) {
  Copy-Item $template $targetRole
}
$state = Join-Path $bridge 'state'
New-Item -ItemType Directory -Path $state -Force | Out-Null
@{ role = $AssistantName; mode = 'active' } | ConvertTo-Json | Set-Content (Join-Path $state 'current-role.json') -Encoding UTF8

$example = Join-Path $root 'config\config.example.json'
$config = Get-Content $example -Raw -Encoding UTF8 | ConvertFrom-Json
$config.dsh.baseUrl = $DshUrl
$config.ownerQQ = $OwnerQQ
$config.sessionCwd = Join-Path $DataDir 'workspace'
if ($SnowLumaHome) { $config.snowluma.homeDir = $SnowLumaHome }
$config | ConvertTo-Json -Depth 20 | Set-Content (Join-Path $bridge 'config.json') -Encoding UTF8

if (-not $SkipNpm) {
  Push-Location $bridge
  try { npm install --omit=dev } finally { Pop-Location }
}

Write-Host ''
Write-Host "已生成：$targetRole"
Write-Host "已生成：$bridge\config.json"
Write-Host "数据目录：$DataDir"
Write-Host ''
Write-Host '下一步：'
Write-Host '1. 启动 DSH Web（默认 3080）'
Write-Host '2. 启动 SnowLuma（OneBot HTTP 3000 / WS 3001）'
Write-Host '3. 运行 scripts\start.ps1'
