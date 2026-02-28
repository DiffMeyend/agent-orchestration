<#
.SYNOPSIS
  Rotate context/context_packets/*.json and context/briefs/*.md into history/YYYY/MM/<workflow>/.

.DESCRIPTION
  v0 utility script. Manually run to move files older than a threshold (default 7 days).
  TODOs:
    - Infer workflow from filename/path instead of defaulting to "ticket_triage".
    - Hook into a scheduler (Task Scheduler / cron) when automation is ready.
    - Add dry-run / log output as needed.
#>

param(
    [int]$RetentionDays = 7,
    [switch]$DryRun,
    [string]$DefaultWorkflow = "ticket_triage"
)

$contextPacketsDir = Join-Path $PSScriptRoot "../context/context_packets"
$briefsDir = Join-Path $PSScriptRoot "../context/briefs"
$historyRoot = Join-Path $PSScriptRoot "../history"
$cutoff = (Get-Date).AddDays(-$RetentionDays)

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message"
}

function Get-WorkflowName {
    param($file, $sourceDir, $defaultWorkflow)

    try {
        $relativeDir = [System.IO.Path]::GetRelativePath((Resolve-Path $sourceDir), $file.DirectoryName)
    } catch {
        $relativeDir = ""
    }

    if ($relativeDir -and $relativeDir -ne "." -and $relativeDir -ne $null) {
        $firstSegment = ($relativeDir -split "[/\\]")[0]
        if ($firstSegment -and $firstSegment -ne ".") {
            return $firstSegment
        }
    }

    if ($file.BaseName -match '^\d{4}-\d{2}-\d{2}_(?<slug>[a-z0-9\-_]+)$') {
        $slug = $Matches['slug']
        $token = ($slug -split "[-_]")[0]
        if ($token) {
            return $token
        }
    }

    return $defaultWorkflow
}

function Move-Artifacts($sourceDir, $pattern, $artifactLabel) {
    if (-not (Test-Path $sourceDir)) {
        Write-Log "Skipping nonexistent directory: $sourceDir"
        return
    }

    Write-Log "Scanning $artifactLabel artifacts in $sourceDir"
    Get-ChildItem -Path $sourceDir -Filter $pattern -File -Recurse | ForEach-Object {
        $file = $_
        if ($file.LastWriteTime -gt $cutoff) {
            return
        }

        $workflow = Get-WorkflowName -file $file -sourceDir $sourceDir -defaultWorkflow $DefaultWorkflow
        $year = $file.LastWriteTime.ToString('yyyy')
        $month = $file.LastWriteTime.ToString('MM')
        $destDir = Join-Path $historyRoot "$year/$month/$workflow"
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }

        $destPath = Join-Path $destDir $file.Name
        if ($DryRun) {
            Write-Log "[DRY RUN] Would move $($file.FullName) -> $destPath"
        } else {
            Write-Log "Moving $($file.FullName) -> $destPath"
            Move-Item -Path $file.FullName -Destination $destPath -Force
        }
    }
}

Write-Log "Starting rotation (RetentionDays=$RetentionDays, DryRun=$DryRun)"
Move-Artifacts -sourceDir $contextPacketsDir -pattern "*.json" -artifactLabel "context packets"
Move-Artifacts -sourceDir $briefsDir -pattern "*.md" -artifactLabel "briefs"

if ($DryRun) {
    Write-Log "Dry run complete. No files were moved."
} else {
    Write-Log "Rotation complete (manual review recommended)."
}
