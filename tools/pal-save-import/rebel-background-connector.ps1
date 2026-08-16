[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("Install", "Uninstall", "Start", "Stop", "Status", "Run")]
    [string]$Command = "Status"
)

$ErrorActionPreference = "Stop"
$ConnectorRoot = $PSScriptRoot
$ProjectRoot = (Resolve-Path (Join-Path $ConnectorRoot "..\..")).Path
$WatcherPath = Join-Path $ConnectorRoot "watch-save.mjs"
$ConfigPath = Join-Path $ConnectorRoot "cloud-sync.json"
$StatusPath = Join-Path $ConnectorRoot "watcher-status.json"
$LogDirectory = Join-Path $ConnectorRoot "logs"
$LogPath = Join-Path $LogDirectory "rebel-background-connector.log"
$ScriptPath = $MyInvocation.MyCommand.Path
$StartupShortcutPath = Join-Path ([Environment]::GetFolderPath("Startup")) "Rebel Palworld Cloud Connector.lnk"

function Get-PowerShellPath {
    $candidate = Join-Path $PSHOME "powershell.exe"
    if (Test-Path $candidate) { return $candidate }
    return (Get-Command powershell.exe -ErrorAction Stop).Source
}

function Get-RunArguments {
    return '-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" Run' -f $ScriptPath
}

function Write-ConnectorLog {
    param([string]$Message)
    if (-not (Test-Path $LogDirectory)) {
        New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
    }
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogPath -Value "[$timestamp] $Message" -Encoding utf8
}

function Assert-ConnectorSetup {
    if (-not (Test-Path $WatcherPath)) { throw "Watcher not found: $WatcherPath" }
    if (-not (Test-Path $ConfigPath)) { throw "Cloud connector configuration not found: $ConfigPath" }

    $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
    if (
        [string]::IsNullOrWhiteSpace([string]$config.endpoint) -or
        [string]::IsNullOrWhiteSpace([string]$config.serverId) -or
        [string]::IsNullOrWhiteSpace([string]$config.token)
    ) { throw "cloud-sync.json is incomplete." }
    if ([string]$config.endpoint -notmatch '^https://') { throw "The cloud connector endpoint must use HTTPS." }
    $null = Get-Command node -ErrorAction Stop
}

function Get-ConnectorProcesses {
    $escapedScriptPath = [WildcardPattern]::Escape($ScriptPath)
    return @(
        Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $_.ProcessId -ne $PID -and
            $_.Name -match '^powershell(\.exe)?$' -and
            $_.CommandLine -like "*$escapedScriptPath* Run*"
        }
    )
}

function Start-ConnectorProcess {
    if ((Get-ConnectorProcesses).Count -gt 0) { return }
    $options = @{
        FilePath = Get-PowerShellPath
        ArgumentList = Get-RunArguments
        WorkingDirectory = $ProjectRoot
        WindowStyle = "Hidden"
    }
    Start-Process @options | Out-Null
}

function Show-ConnectorStatus {
    $processes = Get-ConnectorProcesses
    Write-Host ""
    Write-Host "REBEL PALWORLD BACKGROUND CONNECTOR" -ForegroundColor Cyan
    Write-Host "===================================="
    Write-Host "Installed: $(if (Test-Path $StartupShortcutPath) { 'Yes' } else { 'No' })"
    Write-Host "Running: $(if ($processes.Count -gt 0) { 'Yes' } else { 'No' })"
    Write-Host "Cloud config: $(if (Test-Path $ConfigPath) { 'Present' } else { 'Missing' })"
    Write-Host "Startup shortcut: $StartupShortcutPath"

    if (Test-Path $StatusPath) {
        try {
            $status = Get-Content $StatusPath -Raw | ConvertFrom-Json
            if ($status.heartbeatAt) { Write-Host "Watcher heartbeat: $($status.heartbeatAt)" }
            if ($status.lastSuccessfulSyncAt) { Write-Host "Last local sync: $($status.lastSuccessfulSyncAt)" }
            if ($status.lastError) { Write-Host "Last watcher error: $($status.lastError)" -ForegroundColor Red }
        } catch { Write-Host "Watcher status file could not be read." -ForegroundColor Yellow }
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

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($StartupShortcutPath)
    $shortcut.TargetPath = Get-PowerShellPath
    $shortcut.Arguments = Get-RunArguments
    $shortcut.WorkingDirectory = $ProjectRoot
    $shortcut.WindowStyle = 7
    $shortcut.Description = "Rebel Palworld private cloud save connector"
    $shortcut.Save()

    Start-ConnectorProcess
    Start-Sleep -Seconds 2
    Write-Host ""
    Write-Host "Rebel background connector installed and started." -ForegroundColor Green
    Write-Host "It will start quietly whenever you sign into Windows."
    Write-Host "Raw Level.sav files are never uploaded."
    Show-ConnectorStatus
}

function Stop-Connector {
    foreach ($process in (Get-ConnectorProcesses)) {
        & taskkill.exe /PID $process.ProcessId /T /F 2>$null | Out-Null
    }
    Write-Host "Rebel background connector stopped." -ForegroundColor Yellow
}

function Uninstall-Connector {
    Stop-Connector
    if (Test-Path $StartupShortcutPath) { Remove-Item $StartupShortcutPath -Force }
    Write-Host "Rebel background connector removed." -ForegroundColor Green
    Write-Host "Your private cloud-sync.json configuration was kept."
}

function Start-Connector {
    Assert-ConnectorSetup
    if (-not (Test-Path $StartupShortcutPath)) {
        throw "The Rebel background connector is not installed. Run: pnpm connector:install"
    }
    Start-ConnectorProcess
    Start-Sleep -Seconds 2
    Show-ConnectorStatus
}

function Run-Connector {
    Assert-ConnectorSetup
    if (-not (Test-Path $LogDirectory)) {
        New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
    }

    $createdNew = $false
    $mutex = [System.Threading.Mutex]::new($true, "Local\RebelPalworldCloudConnector", [ref]$createdNew)
    if (-not $createdNew) {
        Write-ConnectorLog "Another connector instance is already running; exiting."
        $mutex.Dispose()
        return
    }

    try {
        $nodePath = (Get-Command node -ErrorAction Stop).Source
        Write-ConnectorLog "Background connector starting."
        Write-ConnectorLog "Watching local Palworld saves. Only processed snapshots are uploaded."

        while ($true) {
            Push-Location $ProjectRoot
            try {
                $previousErrorPreference = $ErrorActionPreference
                $ErrorActionPreference = "Continue"
                & $nodePath $WatcherPath *>> $LogPath
                $exitCode = $LASTEXITCODE
            } catch {
                $exitCode = 1
                Write-ConnectorLog "Watcher error: $($_.Exception.Message)"
            } finally {
                $ErrorActionPreference = $previousErrorPreference
                Pop-Location
            }

            Write-ConnectorLog "Watcher exited with code $exitCode. Restarting in 10 seconds."
            Start-Sleep -Seconds 10
        }
    } finally {
        if ($createdNew) {
            try { $mutex.ReleaseMutex() } catch { }
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
