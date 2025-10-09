$ErrorActionPreference = 'Stop'

$url = 'http://localhost:3001/api/batch/generate-all'
$body = @{ 
  mode = 'byDays'
  expirationDays = 7
  includeQr = $true
  lazyQr = $false
  name = 'Lote pairing test'
}

$json = $body | ConvertTo-Json -Compress

Write-Host "POST $url" -ForegroundColor Cyan
Write-Host $json

try {
  $resp = Invoke-RestMethod -UseBasicParsing -Method Post -ContentType 'application/json' -Body $json -Uri $url
  $resp | ConvertTo-Json -Depth 8
} catch {
  Write-Host $_ -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $text = $reader.ReadToEnd()
    Write-Host 'Response body:' -ForegroundColor Yellow
    Write-Host $text
  }
  exit 1
}