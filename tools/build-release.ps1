$ErrorActionPreference = "Stop"

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$manifest = Get-Content -LiteralPath (Join-Path $projectRoot "manifest.json") -Encoding UTF8 -Raw | ConvertFrom-Json
$version = $manifest.version

$releaseFiles = @(
    "manifest.json",
    "background.js",
    "popup.html",
    "proxy_set.html",
    "js/jquery.js",
    "js/proxy_utils.js",
    "js/popup.js",
    "js/proxy_set.js",
    "css/bottom-buttons.css",
    "css/delete-button.css",
    "css/eye-button.css",
    "css/import-guide.css",
    "css/switch.css",
    "favicon/icon-192x192.png",
    "img/128.png",
    "img/16.png",
    "img/48.png",
    "img/add.png",
    "img/b_logo.png",
    "img/logo.png"
)

Push-Location $projectRoot
try {
    node --check background.js
    node --check js/proxy_utils.js
    node --check js/popup.js
    node --check js/proxy_set.js
    node tests/proxy_utils.test.cjs
    node tests/background.test.mjs
    node tests/package.test.mjs

    foreach ($relativePath in $releaseFiles) {
        if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $relativePath))) {
            throw "Missing release file: $relativePath"
        }
    }

    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    $staging = [IO.Path]::GetFullPath((Join-Path $tempRoot ("ip-proxy-assistant-" + [guid]::NewGuid().ToString("N"))))
    if (-not $staging.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe staging directory"
    }
    New-Item -ItemType Directory -Path $staging | Out-Null

    foreach ($relativePath in $releaseFiles) {
        $destination = Join-Path $staging $relativePath
        New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $projectRoot $relativePath) -Destination $destination
    }

    $dist = Join-Path $projectRoot "dist"
    New-Item -ItemType Directory -Path $dist -Force | Out-Null
    $resolvedDist = [IO.Path]::GetFullPath($dist).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    $uploadFolder = [IO.Path]::GetFullPath((Join-Path $dist "IP-proxy-assistant-v$version-upload-folder"))
    if (-not $uploadFolder.StartsWith($resolvedDist, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe upload folder"
    }
    if (Test-Path -LiteralPath $uploadFolder) {
        Remove-Item -LiteralPath $uploadFolder -Recurse -Force
    }
    New-Item -ItemType Directory -Path $uploadFolder | Out-Null
    Copy-Item -Path (Join-Path $staging "*") -Destination $uploadFolder -Recurse

    $zipPath = Join-Path $dist "IP-proxy-assistant-v$version.zip"
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if (Test-Path -LiteralPath $zipPath) {
        Remove-Item -LiteralPath $zipPath -Force
    }
    $archive = [IO.Compression.ZipFile]::Open($zipPath, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($relativePath in $releaseFiles) {
            $entryName = $relativePath.Replace("\", "/")
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive,
                (Join-Path $uploadFolder $relativePath),
                $entryName,
                [IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
        }
    } finally {
        $archive.Dispose()
    }

    $archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
        $entries = @($archive.Entries | Where-Object { $_.Name } | ForEach-Object { $_.FullName })
        $expected = @($releaseFiles | ForEach-Object { $_.Replace("\", "/") })
        $invalidSeparators = @($entries | Where-Object { $_.Contains("\") })
        $unexpected = @($entries | Where-Object { $_ -notin $expected })
        $missing = @($expected | Where-Object { $_ -notin $entries })
        if ($invalidSeparators.Count -or $unexpected.Count -or $missing.Count) {
            throw "Release archive allowlist mismatch. Invalid separators: $($invalidSeparators -join ', '); Unexpected: $($unexpected -join ', '); Missing: $($missing -join ', ')"
        }
    } finally {
        $archive.Dispose()
    }

    Write-Output "Created $uploadFolder"
    Write-Output "Created $zipPath"
} finally {
    Pop-Location
    if ($staging -and (Test-Path -LiteralPath $staging)) {
        $resolvedStaging = [IO.Path]::GetFullPath($staging)
        $resolvedTempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
        if ($resolvedStaging.StartsWith($resolvedTempRoot, [StringComparison]::OrdinalIgnoreCase)) {
            Remove-Item -LiteralPath $resolvedStaging -Recurse -Force
        }
    }
}
