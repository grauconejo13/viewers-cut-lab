param(
    [ValidatePattern("^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    [string]$MovieId = "luminous-archive"
)

$ErrorActionPreference = "Stop"

$requiredEnvironment = @(
    "CLICKHOUSE_HOST",
    "CLICKHOUSE_PORT",
    "CLICKHOUSE_USER",
    "CLICKHOUSE_PASSWORD",
    "CLICKHOUSE_SECURE",
    "CLICKHOUSE_DATABASE",
    "GOOGLE_GENAI_USE_VERTEXAI",
    "GOOGLE_CLOUD_PROJECT",
    "GOOGLE_CLOUD_LOCATION"
)
$missingEnvironment = @(
    $requiredEnvironment | Where-Object {
        -not [Environment]::GetEnvironmentVariable($_, "Process")
    }
)
if ($missingEnvironment.Count -gt 0) {
    throw "Missing required process environment variables: $($missingEnvironment -join ', ')"
}
if ($env:GOOGLE_GENAI_USE_VERTEXAI.ToLowerInvariant() -ne "true") {
    throw "GOOGLE_GENAI_USE_VERTEXAI must be true for this Google Cloud run."
}

$adkPython = Join-Path $PSScriptRoot ".adk-venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $adkPython)) {
    throw "ADK environment not found. Run .\agent\setup.ps1 first."
}

& $adkPython (Join-Path $PSScriptRoot "run_agent.py") $MovieId
exit $LASTEXITCODE
