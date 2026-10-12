Set-Location -Path $PSScriptRoot

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"

$note = Read-Host "Commit comment"

if ([string]::IsNullOrWhiteSpace($note)) {
    $note = "Update scanner"
}

# Stage every added, changed, or deleted file in the repo
git add -A

# Check whether anything is actually staged
git diff --cached --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "No changes to commit."
    Read-Host "Press Enter to close"
    exit 0
}

git commit -m "$note - $timestamp"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Commit failed."
    Read-Host "Press Enter to close"
    exit 1
}

git push

Write-Host ""
Write-Host "Finished."
Read-Host "Press Enter to close"