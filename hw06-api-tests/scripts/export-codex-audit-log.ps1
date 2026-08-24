[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SessionFile,

  [Parameter(Mandatory = $true)]
  [string]$OutputFile,

  [int]$OutputExcerptLength = 700
)

$ErrorActionPreference = 'Stop'
$sessionPath = (Resolve-Path -LiteralPath $SessionFile).Path
$outputPath = [IO.Path]::GetFullPath($OutputFile)
$timezone = [TimeZoneInfo]::FindSystemTimeZoneById('SE Asia Standard Time')
$messages = [System.Collections.Generic.List[object]]::new()

foreach ($line in Get-Content -LiteralPath $sessionPath -Encoding UTF8) {
  try {
    $record = $line | ConvertFrom-Json
  }
  catch {
    continue
  }

  if ($record.type -ne 'response_item' -or $record.payload.type -ne 'message') {
    continue
  }

  if ($record.payload.role -notin @('user', 'assistant')) {
    continue
  }

  if ($record.payload.role -eq 'assistant' -and $record.payload.phase -ne 'final_answer') {
    continue
  }

  $parts = foreach ($content in $record.payload.content) {
    if ($content.text) { $content.text }
    elseif ($content.input_text) { $content.input_text }
    elseif ($content.output_text) { $content.output_text }
  }
  $text = ($parts -join "`n").Trim()
  if (-not $text -or $text.StartsWith('<environment_context>')) {
    continue
  }

  $utc = [DateTimeOffset]::Parse($record.timestamp)
  $local = [TimeZoneInfo]::ConvertTime($utc, $timezone)
  $messages.Add([pscustomobject]@{
    Role = $record.payload.role
    Timestamp = $local.ToString('yyyy-MM-dd HH:mm:ss zzz')
    Text = $text
  })
}

function Convert-ToQuote {
  param([string]$Text)

  return (($Text -replace "`r`n", "`n" -replace "`r", "`n") -split "`n" | ForEach-Object {
    if ($_ -eq '') { '>' } else { "> $_" }
  }) -join "`n"
}

$interactions = [System.Collections.Generic.List[object]]::new()
$pendingUser = $null
foreach ($message in $messages) {
  if ($message.Role -eq 'user') {
    if ($null -ne $pendingUser) {
      $interactions.Add([pscustomobject]@{
        User = $pendingUser
        Assistant = $null
      })
    }
    $pendingUser = $message
    continue
  }

  if ($null -ne $pendingUser) {
    $interactions.Add([pscustomobject]@{
      User = $pendingUser
      Assistant = $message
    })
    $pendingUser = $null
  }
}
if ($null -ne $pendingUser) {
  $interactions.Add([pscustomobject]@{
    User = $pendingUser
    Assistant = $null
  })
}

$builder = [Text.StringBuilder]::new()
[void]$builder.AppendLine('# Detailed AI Interaction Log - HW06-AI API Testing')
[void]$builder.AppendLine()
[void]$builder.AppendLine('**Student ID:** 23127522  ')
[void]$builder.AppendLine('**AI tool:** Codex CLI  ')
[void]$builder.AppendLine('**Source:** Local Codex session JSONL exported from the real HW06 working session  ')
[void]$builder.AppendLine("**Timezone:** Asia/Saigon  ")
[void]$builder.AppendLine("**Interactions recorded:** $($interactions.Count)  ")
[void]$builder.AppendLine()
[void]$builder.AppendLine('The prompt text below is copied from the local session log. AI output is retained as a verbatim excerpt to keep the appendix readable; repository artifacts and Git history provide the complete result of each action. No timestamp or interaction was invented.')

$index = 0
foreach ($interaction in $interactions) {
  $index++
  [void]$builder.AppendLine()
  [void]$builder.AppendLine("### Interaction $index")
  [void]$builder.AppendLine()
  [void]$builder.AppendLine("- **Tool:** Codex CLI")
  [void]$builder.AppendLine("- **Date/time:** $($interaction.User.Timestamp)")
  [void]$builder.AppendLine('- **Prompt:**')
  [void]$builder.AppendLine()
  [void]$builder.AppendLine((Convert-ToQuote $interaction.User.Text))
  [void]$builder.AppendLine()
  [void]$builder.AppendLine('- **AI output:**')
  [void]$builder.AppendLine()
  if ($null -eq $interaction.Assistant) {
    [void]$builder.AppendLine('> No standalone final answer was recorded for this turn; the work continued through commentary/tool execution or the next resumed turn.')
  }
  else {
    $output = $interaction.Assistant.Text
    if ($output.Length -gt $OutputExcerptLength) {
      $output = $output.Substring(0, $OutputExcerptLength).TrimEnd() + ' ... [excerpt truncated]'
    }
    [void]$builder.AppendLine((Convert-ToQuote $output))
  }
}

$outputDirectory = Split-Path -Parent $outputPath
[IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
[IO.File]::WriteAllText($outputPath, $builder.ToString(), [Text.UTF8Encoding]::new($false))
Write-Output "Created $outputPath with $($interactions.Count) interactions."
