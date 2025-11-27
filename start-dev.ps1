# Start both web and API dev servers concurrently in the same terminal

Write-Host "Starting web and API dev servers..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop both servers.`n" -ForegroundColor Yellow

# Start both servers as background jobs
$webJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    Set-Location web
    npm run dev 2>&1
}

$apiJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    Set-Location api
    npm run start:dev 2>&1
}

# Function to display output with prefixes
function Show-Output {
    param($Job, $Prefix, $Color)
    $output = Receive-Job -Job $Job -ErrorAction SilentlyContinue
    if ($output) {
        $output | ForEach-Object {
            Write-Host "[$Prefix] $_" -ForegroundColor $Color
        }
    }
}

# Monitor both jobs and display output
try {
    while ($true) {
        Show-Output -Job $webJob -Prefix "WEB" -Color Cyan
        Show-Output -Job $apiJob -Prefix "API" -Color Magenta
        
        # Check if jobs completed
        if ($webJob.State -eq "Completed" -or $webJob.State -eq "Failed") {
            Show-Output -Job $webJob -Prefix "WEB" -Color Cyan
            Write-Host "`nWeb server stopped." -ForegroundColor Red
            break
        }
        if ($apiJob.State -eq "Completed" -or $apiJob.State -eq "Failed") {
            Show-Output -Job $apiJob -Prefix "API" -Color Magenta
            Write-Host "`nAPI server stopped." -ForegroundColor Red
            break
        }
        
        Start-Sleep -Milliseconds 200
    }
}
finally {
    Write-Host "`nStopping servers..." -ForegroundColor Yellow
    Stop-Job -Job $webJob, $apiJob -ErrorAction SilentlyContinue
    Remove-Job -Job $webJob, $apiJob -Force -ErrorAction SilentlyContinue
    Write-Host "Servers stopped." -ForegroundColor Green
}

