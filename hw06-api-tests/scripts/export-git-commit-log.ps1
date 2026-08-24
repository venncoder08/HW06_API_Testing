[CmdletBinding()]
param(
  [string]$OutputFile = 'git-commit-log.txt'
)

$ErrorActionPreference = 'Stop'
$workspaceDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$outputPath = [IO.Path]::GetFullPath((Join-Path $workspaceDir $OutputFile))
$entries = & git -C $workspaceDir log --reverse --date=iso-strict --pretty=format:'%H|%ad|%an|%s'
if ($LASTEXITCODE -ne 0) {
  throw 'git log failed'
}

$builder = [Text.StringBuilder]::new()
[void]$builder.AppendLine('HW06-AI API Testing - Git Commit Log')
[void]$builder.AppendLine('Student ID: 23127522')
[void]$builder.AppendLine('Repository: https://github.com/venncoder08/HW06_API_Testing')
[void]$builder.AppendLine('Generated from: git log --reverse --date=iso-strict')
[void]$builder.AppendLine()
[void]$builder.AppendLine('Commit SHA | Date/time | Author | Subject')
[void]$builder.AppendLine('--- | --- | --- | ---')
foreach ($entry in $entries) {
  $parts = $entry -split '\|', 4
  [void]$builder.AppendLine("$($parts[0]) | $($parts[1]) | $($parts[2]) | $($parts[3])")
}
[void]$builder.AppendLine()
[void]$builder.AppendLine('Note: the commit that first adds this generated file cannot include its own SHA in the file content.')

[IO.File]::WriteAllText($outputPath, $builder.ToString(), [Text.UTF8Encoding]::new($false))
Write-Output "Created $outputPath with $($entries.Count) commits."
