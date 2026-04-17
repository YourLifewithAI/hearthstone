<#
.SYNOPSIS
Snapshot context files to the Hearthstone API KV store.

.DESCRIPTION
Reads markdown files from the context/ directory and POSTs them to the
Hearthstone Worker's /context/snapshot endpoint. These files become the
system prompt context when chatting via Hearthstone on mobile.

.PARAMETER ApiKey
Hearthstone bearer token. Defaults to `$env:HEARTHSTONE_API_KEY.

.PARAMETER ApiUrl
Hearthstone Worker base URL. Defaults to `$env:HEARTHSTONE_API_URL.

.PARAMETER ContextDir
Directory containing your markdown files. Defaults to ../context relative
to this script.

.EXAMPLE
`$env:HEARTHSTONE_API_KEY = "your-64-char-hex"
`$env:HEARTHSTONE_API_URL = "https://your-worker.your-name.workers.dev"
.\scripts\snapshot.ps1
#>

param(
    [string]$ApiKey = $env:HEARTHSTONE_API_KEY,
    [string]$ApiUrl = $env:HEARTHSTONE_API_URL,
    [string]$ContextDir = "$PSScriptRoot\..\context"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    Write-Error "HEARTHSTONE_API_KEY not set. Set `$env:HEARTHSTONE_API_KEY or pass -ApiKey."
    exit 1
}
if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
    Write-Error "HEARTHSTONE_API_URL not set. Set `$env:HEARTHSTONE_API_URL or pass -ApiUrl."
    exit 1
}

# Match CTX_KEYS in api/src/types.ts. If you add keys there, add matching files here.
$files = [ordered]@{
    "about"    = "$ContextDir\about.md"
    "projects" = "$ContextDir\projects.md"
    "style"    = "$ContextDir\style.md"
    "notes"    = "$ContextDir\notes.md"
}

$batch = [System.Collections.Generic.List[object]]::new()
$totalBytes = 0

foreach ($key in $files.Keys) {
    $path = $files[$key]
    if (Test-Path $path) {
        # Read bytes, decode as UTF8, strip BOM. Dodges PowerShell's
        # Get-Content auto-wrapping multi-line strings as {value: ...}.
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $content = [System.Text.Encoding]::UTF8.GetString($bytes)
        if ($content.Length -gt 0 -and $content[0] -eq [char]0xFEFF) {
            $content = $content.Substring(1)
        }
        $batch.Add([pscustomobject]@{ key = [string]$key; content = [string]$content })
        $totalBytes += $content.Length
        Write-Host ("  {0,-10} {1,6:N0} chars  {2}" -f $key, $content.Length, $path)
    } else {
        Write-Warning ("  {0,-10} SKIP (not found): {1}" -f $key, $path)
    }
}

if ($batch.Count -eq 0) {
    Write-Error "No files to snapshot. Check $ContextDir."
    exit 1
}

Write-Host ""
Write-Host ("Snapshotting {0} files ({1:N0} total chars)..." -f $batch.Count, $totalBytes)

$body = @{ files = $batch.ToArray() } | ConvertTo-Json -Depth 4 -Compress

# Use HttpClient directly — Invoke-RestMethod mangles encoding on large payloads.
Add-Type -AssemblyName System.Net.Http

$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [System.TimeSpan]::FromSeconds(30)
$client.DefaultRequestHeaders.Authorization =
    [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $ApiKey)

$content = [System.Net.Http.StringContent]::new(
    $body,
    [System.Text.UTF8Encoding]::new($false),  # no BOM
    "application/json"
)

try {
    $response = $client.PostAsync("$ApiUrl/context/snapshot", $content).GetAwaiter().GetResult()
    $respBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

    if (-not $response.IsSuccessStatusCode) {
        Write-Error ("Snapshot failed: HTTP {0}`n{1}" -f $response.StatusCode, $respBody)
        exit 1
    }

    $result = $respBody | ConvertFrom-Json
    Write-Host ""
    Write-Host "Snapshot complete." -ForegroundColor Green
    Write-Host ("  Written:   {0}" -f ($result.written -join ", "))
    Write-Host ("  Version:   {0}" -f $result.meta.version)
    Write-Host ("  Timestamp: {0}" -f $result.meta.timestamp)
} finally {
    $client.Dispose()
    $content.Dispose()
}
