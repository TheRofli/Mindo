param(
  [int]$Port = 9200
)

$ErrorActionPreference = "Stop"

$shutdownRequested = $false

try {
  Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/shutdown" -Method Post -TimeoutSec 3 | Out-Null
  $shutdownRequested = $true
  Start-Sleep -Milliseconds 300
} catch {
  Write-Host "Kokoro JS shutdown endpoint did not respond: $($_.Exception.Message)"
}

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if (!$listeners) {
  if ($shutdownRequested) {
    Write-Host "Contex Kokoro JS TTS stopped via shutdown endpoint."
  } else {
    Write-Host "No Contex Kokoro JS TTS listener found on port $Port."
  }
  exit 0
}

$processIds = $listeners |
  Select-Object -ExpandProperty OwningProcess -Unique |
  Where-Object { $_ -and $_ -gt 0 }

foreach ($processId in $processIds) {
  try {
    Stop-Process -Id $processId -Force
    Write-Host "Stopped Contex Kokoro JS TTS process $processId on port $Port."
  } catch {
    Write-Host "Could not stop process $processId`: $($_.Exception.Message)"
  }
}
