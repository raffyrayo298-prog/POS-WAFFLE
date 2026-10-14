#!/usr/bin/env pwsh
# Run a local static server, install deps and Playwright browsers, run tests, then stop server.
# Treat non-terminating errors as terminating so the script stops on failures
$ErrorActionPreference = 'Stop'

# Change to the script directory (works when invoked from anywhere)
Push-Location -LiteralPath $PSScriptRoot

Write-Host "Starting static server on port 60355..."
try {
  $server = Start-Process -FilePath "python" -ArgumentList '-m','http.server','60355' -NoNewWindow -PassThru
} catch {
  Write-Error "Failed to start python HTTP server. Ensure Python is installed and on PATH. $_"
  Pop-Location
  exit 1
}

# Give the server a moment to start
Start-Sleep -Seconds 1

$exitCode = 0
try {
  Write-Host "Installing npm dependencies (may take a while)..."
  npm install

  Write-Host "Installing Playwright browsers..."
  npx playwright install

  Write-Host "Running Playwright tests..."
  npx playwright test --reporter=line
  $exitCode = $LASTEXITCODE
} catch {
  Write-Error "Playwright run failed: $_"
  $exitCode = 1
} finally {
  Write-Host "Stopping static server..."
  try {
    if ($server -and -not $server.HasExited) {
      Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    }
  } catch {
    Write-Warning "Failed to stop server process: $_"
  }
  Pop-Location
}

exit $exitCode
