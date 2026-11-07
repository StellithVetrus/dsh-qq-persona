$ErrorActionPreference = 'Continue'
$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'qq-bridge[\\/]src[\\/]bridge\.js' }
if (-not $procs) { Write-Host '没有运行中的 bridge'; exit 0 }
foreach ($p in $procs) {
  Write-Host "停止 $($p.ProcessId)"
  Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
