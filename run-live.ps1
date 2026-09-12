$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

if (-not (Test-Path '.env')) {
  Copy-Item '.env.example' '.env'
  Write-Host 'Created .env from .env.example. Add your OpenWeatherMap API key, then rerun this script.'
  exit 1
}

if (-not (Test-Path 'node_modules')) {
  Write-Host 'No node_modules folder is required for this project.'
}

node --version
npm test
npm start
