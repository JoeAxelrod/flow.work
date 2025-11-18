# PowerShell script to test the hook endpoint
# Usage: .\test-hook.ps1

$baseUrl = "http://localhost:3001"
$slug = "my-workflow"
$key = "s1"
$instanceId = "550e8400-e29b-41d4-a716-446655440000"

$body = @{
    instanceId = $instanceId
    data = @{
        message = "test hook data"
        value = 123
    }
} | ConvertTo-Json

$uri = "$baseUrl/api/v1/hook/workflow/$slug/station/$key"

Write-Host "Sending POST request to: $uri" -ForegroundColor Cyan
Write-Host "Body: $body" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json"
    Write-Host "Success! Response:" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Yellow
    }
}

