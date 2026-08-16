[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("Install", "Uninstall", "Start", "Stop", "Status", "Run")]
    [string]$Command = "Status"
)

$ErrorActionPreference = "Stop"

$TaskName = "Rebel Palworld Cloud Connector"
$ConnectorRoot = $PSScriptRoot
$ProjectRoot = (Resolve-Path (Join-Path $ConnectorRoot "..\..")).Path
$WatcherPath = Join-Path $ConnectorRoot "watch-save.mjs"
$ConfigPath = Join-Path $ConnectorRoot "cloud-sync.json"
$StatusPath = Join-Path $ConnectorRoot "watcher-status.json"
$LogDirectory = Join-Path $ConnectorRoot "logs"
$LogPath = Join-Path $LogDirectory "rebel-background-connector.log"
$ScriptPath = $MyInvocation.MyCommand.Path

function Write-ConnectorLog {
    param([string]$Message)

    if (-not (Test-Path $LogDirectory)) {
        New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
    }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogPath -Value "[$timestamp] $Message" -Encoding utf8
}

function Assert-ConnectorSetup {
    if (-not (Test-Path $WatcherPath)) {
        throw "Watcher not found: $WatcherPath"
    }

    if (-not (Test-Path $ConfigPath)) {
        throw "Cloud connector configuration not found: $ConfigPath"
    }

    $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

    if (
        [string]::IsNullOrWhiteSpace([string]$config.endpoint) -or
        [string]::IsNullOrWhiteSpace([string]$config.serverId) -or
        [string]::IsNullOrWhiteSpace([string]$config.token)
    ) {
        throw "cloud-sync.json is incomplete."
    }

    if ([string]$config.endpoint -notmatch '^https://') {
        throw "The cloud connector endpoint must use HTTPS."
    }

    $null = Get-Command node -ErrorAction Stop
}

function Get-ConnectorTask {
    Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
}

function Show-ConnectorStatus {
    $task = Get-ConnectorTask

    Write-Host ""
    Write-Host "REBEL PALWORLD BACKGROUND CONNECTOR" -ForegroundColor Cyan
    Write-Host "===================================="

    if (-not $task) {
        Write-Host "Installed: No" -ForegroundColor Yellow
        Write-Host "Run: pnpm connector:install"
        return
    }

    $taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName

    Write-Host "Installed: Yes" -ForegroundColor Green
    Write-Host "Task state: $($task.State)"
    Write-Host "Last run: $($taskInfo.LastRunTime)"
    Write-Host "Last task result: $($taskInfo.LastTaskResult)"
    Write-Host "Cloud config: $(if (Test-Path $ConfigPath) { 'Present' } else { 'Missing' })"

    if (Test-Path $StatusPath) {
        try {
            $watcherStatus = Get-Content $StatusPath -Raw | ConvertFrom-Json

            if ($watcherStatus.heartbeatAt) {
                Write-Host "Watcher heartbeat: $($watcherStatus.heartbeatAt)"
            }

            if ($watcherStatus.lastSuccessfulSyncAt) {
                Write-Host "Last local sync: $($watcherStatus.lastSuccessfulSyncAt)"
            }

            if ($watcherStatus.lastError) {
                Write-Host "Last watcher error: $($watcherStatus.lastError)" -ForegroundColor Red
            }
        } catch {
            Write-Host "Watcher status file could not be read." -ForegroundColor Yellow
        }
    }

    Write-Host "Log file: $LogPath"

    if (Test-Path $LogPath) {
        Write-Host ""
        Write-Host "Recent log output:"
        Get-Content $LogPath -Tail 12
    }
}

function Install-Connector {
    Assert-ConnectorSetup

    if (-not (Test-Path $LogDirectory)) {
        New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
    }

    $powerShellPath = Join-Path $PSHOME "powershell.exe"

    if (-not (Test-Path $powerShellPath)) {
        $powerShellPath = (Get-Command powershell.exe -ErrorAction Stop).Source
    }

    $arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" Run' -f $ScriptPath

    $actionOptions = @{
        Execute = $powerShellPath
        Argument = $arguments
        WorkingDirectory = $ProjectRoot
    }

    $settingsOptions = @{
        AllowStartIfOnBatteries = $true
        DontStopIfGoingOnBatteries = $true
        RestartCount = 999
        RestartInterval = (New-TimeSpan -Minutes 1)
        ExecutionTimeLimit = [TimeSpan]::Zero
        MultipleInstances = "IgnoreNew"
    }

    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $principalOptions = @{
        UserId = $currentUser
        LogonType = "Interactive"
        RunLevel = "Limited"
    }

    $registrationOptions = @{
        TaskName = $TaskName
        Action = (New-ScheduledTaskAction @actionOptions)
        Trigger = (New-ScheduledTaskTrigger -AtLogOn)
        Settings = (New-ScheduledTaskSettingsSet @settingsOptions)
        Principal = (New-ScheduledTaskPrincipal @principalOptions)
        Description = "Watches the local Palworld save and uploads processed Rebel snapshots to the private cloud."
        Force = $true
    }

    Register-ScheduledTask @registrationOptions | Out-Null
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 2

    Write-Host ""
    Write-Host "Rebel background connector installed and started." -ForegroundColor Green
    Write-Host "It will start automatically whenever you sign into Windows."
    Write-Host "Raw Level.sav files are never uploaded."

    Show-ConnectorStatus
}

function Uninstall-Connector {
    $task = Get-ConnectorTask

    if ($task) {
        if ($task.State -eq "Running") {
            Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        }

        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }

    Write-Host "Rebel background connector removed." -ForegroundColor Green
    Write-Host "Your private cloud-sync.json configuration was kept."
}

function Start-Connector {
    $task = Get-ConnectorTask

    if (-not $task) {
        throw "The Rebel background connector is not installed. Run: pnpm connector:install"
    }

    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 2
    Show-ConnectorStatus
}

function Stop-Connector {
    $task = Get-ConnectorTask

    if (-not $task) {
        Write-Host "The Rebel background connector is not installed."
        return
    }

    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Write-Host "Rebel background connector stopped." -ForegroundColor Yellow
}

function Run-Connector {
    Assert-ConnectorSetup

    if (-not (Test-Path $LogDirectory)) {
        New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
    }

    $createdNew = $false
    $mutex = [System.Threading.Mutex]::new(
        $true,
        "Local\RebelPalworldCloudConnector",
        [ref]$createdNew
    )

    if (-not $createdNew) {
        Write-ConnectorLog "Another connector instance is already running; exiting."
        $mutex.Dispose()
        return
    }

    try {
        $nodePath = (Get-Command node -ErrorAction Stop).Source

        Write-ConnectorLog "Background connector starting."
        Write-ConnectorLog "Watching local Palworld saves. Only processed snapshots are uploaded."

        Push-Location $ProjectRoot

        try {
            & $nodePath $WatcherPath *>> $LogPath
            $exitCode = $LASTEXITCODE
        } finally {
            Pop-Location
        }

        Write-ConnectorLog "Watcher exited with code $exitCode."
        exit $exitCode
    } catch {
        Write-ConnectorLog "Connector failed: $($_.Exception.Message)"
        exit 1
    } finally {
        if ($createdNew) {
            try {
                $mutex.ReleaseMutex()
            } catch {
                # The process may be terminating; nothing else is required.
            }

            $mutex.Dispose()
        }
    }
}

switch ($Command) {
    "Install" { Install-Connector }
    "Uninstall" { Uninstall-Connector }
    "Start" { Start-Connector }
    "Stop" { Stop-Connector }
    "Status" { Show-ConnectorStatus }
    "Run" { Run-Connector }
}
