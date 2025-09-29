param(
  [Parameter(Mandatory=$true)][string]$TokenId
)

# Cargar variables desde .env (formato KEY=VALUE, ignorar comentarios y líneas vacías)
Get-Content -Raw .env | Select-String -Pattern '.*' | ForEach-Object {
  $_.Line | Where-Object { $_ -and ($_ -notmatch '^[#;]') -and ($_ -match '=') } | ForEach-Object {
    $parts = $_ -split '=',2
    if($parts.Length -eq 2){
      $name = $parts[0].Trim()
      $value = $parts[1].Trim()
      if($name){ Set-Item -Path env:$name -Value $value -ErrorAction SilentlyContinue }
    }
  }
}

Write-Host "Usando DATABASE_URL (parcial): $($env:DATABASE_URL.Substring(0,[Math]::Min(55,$env:DATABASE_URL.Length)))..."

if(-not $env:DATABASE_URL){ Write-Error 'DATABASE_URL no cargado'; exit 1 }

npx tsx scripts/inspect-token.ts $TokenId
