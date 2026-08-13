[CmdletBinding()]
param(
    [string]$Repository = "Earr22/codex-edge",
    [switch]$SkipDoctor
)

$ErrorActionPreference = "Stop"

function Find-CodexCli {
    $candidates = New-Object System.Collections.Generic.List[string]
    $manifestPath = Join-Path $env:LOCALAPPDATA "OpenAI\Codex\chrome-native-hosts-v2.json"
    if (Test-Path -LiteralPath $manifestPath) {
        try {
            $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
            $latest = $manifest.entries | Sort-Object { [datetimeoffset]$_.updatedAt } -Descending | Select-Object -First 1
            if ($latest.paths.codexCliPath) { $candidates.Add([string]$latest.paths.codexCliPath) }
        } catch {
            # Continue to other official local candidates.
        }
    }

    if ($env:USERPROFILE) {
        $candidates.Add((Join-Path $env:USERPROFILE ".codex\plugins\.plugin-appserver\codex.exe"))
    }
    $command = Get-Command codex -ErrorAction SilentlyContinue
    if ($command) { $candidates.Add($command.Source) }

    foreach ($candidate in $candidates | Select-Object -Unique) {
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
        try {
            & $candidate --version *> $null
            if ($LASTEXITCODE -eq 0) { return $candidate }
        } catch {
            # Try the next official local candidate.
        }
    }
    return $null
}

$codexCli = Find-CodexCli
if (-not $codexCli) {
    throw "A runnable Codex CLI was not found. Install or update Codex Desktop, then retry."
}

Write-Host "Adding the Codex Edge marketplace..."
& $codexCli plugin marketplace add $Repository
if ($LASTEXITCODE -ne 0) { throw "Could not add the Codex Edge marketplace." }

Write-Host "Installing Codex Edge..."
& $codexCli plugin add "codex-edge@codex-edge"
if ($LASTEXITCODE -ne 0) { throw "Could not install Codex Edge." }

if (-not $SkipDoctor) {
    Write-Host "Run the read-only doctor from the installed plugin when Codex exposes its installed path."
}

Write-Host "Installation completed. Restart Codex Desktop and start a new task with Codex Edge enabled."
