Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "On Call Timesheet - GitHub update"
Write-Host ""

# Confirm this is actually a Git repository.
git rev-parse --is-inside-work-tree 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "This folder is not a Git repository."
    Write-Host "Put push.ps1 inside your cloned GitHub repository folder."
    Read-Host "Press Enter to close"
    exit 1
}

# Show you what will be included before staging.
Write-Host "Changed files:"
git status --short
Write-Host ""

$note = Read-Host "Commit message"

if ([string]::IsNullOrWhiteSpace($note)) {
    $note = "Update on call timesheet"
}

# Stage every added, changed, renamed, and deleted file.
git add -A

# Stop if there is nothing staged to commit.
git diff --cached --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "No changes to commit."
    Read-Host "Press Enter to close"
    exit 0
}

# Create the local commit.
git commit -m $note

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Commit failed."
    Read-Host "Press Enter to close"
    exit 1
}

# Upload to the remote repository.
git push

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Commit was created locally, but upload to GitHub failed."
    Write-Host "Check your internet connection, GitHub sign-in, remote URL, and branch."
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host ""
Write-Host "Finished. GitHub Pages should update shortly."
Read-Host "Press Enter to close"