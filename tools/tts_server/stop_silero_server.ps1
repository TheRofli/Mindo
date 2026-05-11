param(
  [int]$Port = 9100
)

$ErrorActionPreference = "Stop"

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
$processIds = $connections |
  Select-Object -ExpandProperty OwningProcess -Unique |
  Where-Object { $_ -and $_ -ne 0 }

if (!$processIds) {
  Write-Host "No Contex Silero TTS listener found on port $Port."
  exit 0
}

foreach ($processId in $processIds) {
  try {
    Stop-Process -Id $processId -Force
    Write-Host "Stopped process $processId on port $Port."
  } catch {
    Write-Host "Could not stop process $processId: $($_.Exception.Message)"
  }
}
