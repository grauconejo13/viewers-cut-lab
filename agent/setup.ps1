$ErrorActionPreference = "Stop"

$agentDir = $PSScriptRoot
$adkVenv = Join-Path $agentDir ".adk-venv"
$serverVenv = Join-Path $agentDir ".venv"
$serverPython = Join-Path $serverVenv "Scripts\python.exe"
$adkPython = Join-Path $adkVenv "Scripts\python.exe"

if (-not (Test-Path -LiteralPath $serverPython)) {
    throw "Expected the existing Python 3.10+ environment at agent/.venv."
}
if (-not (Test-Path -LiteralPath $adkPython)) {
    & $serverPython -m venv $adkVenv
    if ($LASTEXITCODE -ne 0) {
        throw "Could not create the isolated ADK environment."
    }
}

& $adkPython -m pip install -r (Join-Path $agentDir "requirements.txt")
if ($LASTEXITCODE -ne 0) {
    throw "Could not install the ADK client requirements."
}
& $serverPython -m pip install -r (Join-Path $agentDir "requirements-mcp.txt")
if ($LASTEXITCODE -ne 0) {
    throw "Could not install the mcp-clickhouse server requirements."
}
& $adkPython (Join-Path $agentDir "smoke_test.py")
if ($LASTEXITCODE -ne 0) {
    throw "The offline ADK/MCP smoke test failed."
}
