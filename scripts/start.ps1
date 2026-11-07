$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$bridge = Join-Path $root 'bridge'
if (-not (Test-Path (Join-Path $bridge 'config.json'))) {
  throw '没有 config.json，请先运行 install.ps1'
}
Set-Location $bridge
node src\bridge.js
