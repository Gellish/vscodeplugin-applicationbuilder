# PowerShell Script to install this extension into Antigravity IDE
$extensionName = "vscodeplugin-applicationbuilder"
$targetDir = "$HOME\.antigravity\extensions\$extensionName"

# Ensure build is fresh
npm run build

# Create target directory if it doesn't exist
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir
}

# Copy relevant files (excluding node_modules for speed/size)
Write-Host "Installing $extensionName to $targetDir..."
Copy-Item -Path "dist" -Destination $targetDir -Recurse -Force
Copy-Item -Path "package.json" -Destination $targetDir -Force
Copy-Item -Path "README.md" -Destination $targetDir -Force

Write-Host "Installation complete! Please restart Antigravity IDE."
