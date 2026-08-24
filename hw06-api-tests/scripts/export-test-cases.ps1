[CmdletBinding()]
param(
  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$workspaceDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$planDir = Join-Path $workspaceDir 'test-plans'
$testCaseDir = Join-Path $workspaceDir 'test-cases'
$resultPath = Join-Path $testCaseDir 'audit-overrides.json'

if (-not $OutputDirectory) {
  $OutputDirectory = $testCaseDir
}
$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)

$issueUrls = @{
  '#1' = 'https://github.com/venncoder08/HW06_API_Testing/issues/1'
  '#2' = 'https://github.com/venncoder08/HW06_API_Testing/issues/2'
  '#3' = 'https://github.com/venncoder08/HW06_API_Testing/issues/3'
  '#4' = 'https://github.com/venncoder08/HW06_API_Testing/issues/4'
  '#5' = 'https://github.com/venncoder08/HW06_API_Testing/issues/5'
  '#6' = 'https://github.com/venncoder08/HW06_API_Testing/issues/6'
  '#7' = 'https://github.com/venncoder08/HW06_API_Testing/issues/7'
  '#8' = 'https://github.com/venncoder08/HW06_API_Testing/issues/8'
}

function Get-TestType {
  param(
    [string]$Technique,
    [string]$InputText
  )

  $text = "$Technique $InputText".ToLowerInvariant()
  $types = [System.Collections.Generic.List[string]]::new()
  function Add-TypeOnce([string]$Type) {
    if (-not $types.Contains($Type)) {
      $types.Add($Type)
    }
  }

  if ($text -match 'boundary|below min|exact min|above min|lower valid|above boundary|below boundary') { Add-TypeOnce 'Boundary' }
  if ($text -match 'state|lifecycle|usage (state|isolation)|double delete') { Add-TypeOnce 'State Transition' }
  if ($text -match 'concurrent') { Add-TypeOnce 'Concurrency' }
  if ($text -match 'schema|required fields|type enum') { Add-TypeOnce 'Schema' }
  if ($text -match 'formula|discount_amount|final_amount') { Add-TypeOnce 'Calculation' }
  if ($text -match 'jwt|auth|authorization|scheme|forged|role|ownership|mass assignment|sensitive|sql injection|xss|idor|user id mismatch|user role') { Add-TypeOnce 'Security' }
  if ($text -match 'duplicate|uniqueness|isolation|immutable|other coupon|snapshot') { Add-TypeOnce 'Data Integrity' }
  if ($text -match 'missing|null|empty|whitespace|type|array|object|boolean|number|string|unicode|punctuation|multiline|malformed|wrong content|negative|zero|country prefix|hyphen|spaces|first digit|alphabetic|invalid|nonexistent|expired|inactive') { Add-TypeOnce 'Equivalence Partitioning' }
  if ($text -match '^positive| matching| valid |type percent|type fixed|min positive|max uses positive|admin identity partition') { Add-TypeOnce 'Positive' }
  if ($types.Count -eq 0) { Add-TypeOnce 'Functional' }
  return $types -join '; '
}

function ConvertFrom-PlanCell {
  param([string]$Value)

  return $Value.Trim().Replace('<br>', [Environment]::NewLine).Replace([string][char]96, '')
}

function Read-TestPlan {
  param([string]$Feature)

  $path = Join-Path $planDir "$Feature.md"
  $cases = [System.Collections.Generic.List[object]]::new()
  foreach ($line in (Get-Content -LiteralPath $path -Encoding UTF8)) {
    $match = [regex]::Match($line, '^\| (FR\d+-TC-\d{3}) \| (.*?) \| (.*?) \| (.*?) \|$')
    if (-not $match.Success) {
      continue
    }
    $cases.Add([PSCustomObject]@{
      Id = $match.Groups[1].Value
      Technique = ConvertFrom-PlanCell $match.Groups[2].Value
      Input = ConvertFrom-PlanCell $match.Groups[3].Value
      Expected = ConvertFrom-PlanCell $match.Groups[4].Value
    })
  }
  return ,$cases
}

function ConvertTo-ExcelColumnName {
  param([int]$ColumnNumber)

  $name = ''
  while ($ColumnNumber -gt 0) {
    $ColumnNumber--
    $name = [char](65 + ($ColumnNumber % 26)) + $name
    $ColumnNumber = [math]::Floor($ColumnNumber / 26)
  }
  return $name
}

function ConvertTo-XmlText {
  param([object]$Value)

  if ($null -eq $Value) {
    return ''
  }
  return [System.Security.SecurityElement]::Escape([string]$Value)
}

function Get-CellStyle {
  param(
    [int]$RowIndex,
    [object]$Value
  )

  if ($RowIndex -eq 0) { return 1 }
  switch ([string]$Value) {
    'VALID' { return 3 }
    'PASS' { return 3 }
    'FAIL' { return 4 }
    'BLOCKED' { return 5 }
    default { return 2 }
  }
}

function New-WorksheetXml {
  param(
    [object[]]$Rows,
    [double[]]$ColumnWidths
  )

  $lastRow = $Rows.Count
  $lastColumn = $Rows[0].Count
  $lastColumnName = ConvertTo-ExcelColumnName $lastColumn
  $builder = [System.Text.StringBuilder]::new()

  [void]$builder.AppendLine('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
  [void]$builder.AppendLine('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">')
  [void]$builder.AppendLine(('<dimension ref="A1:{0}{1}"/>' -f $lastColumnName, $lastRow))
  [void]$builder.AppendLine('<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>')
  [void]$builder.AppendLine('<cols>')
  for ($columnIndex = 0; $columnIndex -lt $lastColumn; $columnIndex++) {
    $columnNumber = $columnIndex + 1
    $width = if ($columnIndex -lt $ColumnWidths.Count) { $ColumnWidths[$columnIndex] } else { 22 }
    [void]$builder.AppendLine(('<col min="{0}" max="{0}" width="{1}" customWidth="1"/>' -f $columnNumber, $width))
  }
  [void]$builder.AppendLine('</cols><sheetData>')

  for ($rowIndex = 0; $rowIndex -lt $Rows.Count; $rowIndex++) {
    $excelRow = $rowIndex + 1
    [void]$builder.Append(('<row r="{0}">' -f $excelRow))
    for ($columnIndex = 0; $columnIndex -lt $Rows[$rowIndex].Count; $columnIndex++) {
      $excelColumn = ConvertTo-ExcelColumnName ($columnIndex + 1)
      $reference = "$excelColumn$excelRow"
      $value = $Rows[$rowIndex][$columnIndex]
      $style = Get-CellStyle $rowIndex $value
      $xmlValue = ConvertTo-XmlText $value
      [void]$builder.Append(('<c r="{0}" t="inlineStr" s="{1}"><is><t xml:space="preserve">{2}</t></is></c>' -f $reference, $style, $xmlValue))
    }
    [void]$builder.AppendLine('</row>')
  }

  [void]$builder.AppendLine('</sheetData>')
  [void]$builder.AppendLine(('<autoFilter ref="A1:{0}{1}"/>' -f $lastColumnName, $lastRow))
  [void]$builder.AppendLine('</worksheet>')
  return $builder.ToString()
}

function Add-ZipTextEntry {
  param(
    [System.IO.Compression.ZipArchive]$Archive,
    [string]$Name,
    [string]$Content
  )

  $entry = $Archive.CreateEntry($Name, [System.IO.Compression.CompressionLevel]::Optimal)
  $entryStream = $entry.Open()
  $writer = [System.IO.StreamWriter]::new($entryStream, [System.Text.UTF8Encoding]::new($false))
  try {
    $writer.Write($Content)
  }
  finally {
    $writer.Dispose()
    $entryStream.Dispose()
  }
}

function New-SummaryRows {
  param(
    [string]$Feature,
    [object[]]$Cases,
    [hashtable]$Results
  )

  $featureResults = @($Cases | ForEach-Object { $Results[$_.Id] })
  $bugIds = @($featureResults | ForEach-Object {
    if ($_.bugId) { $_.bugId -split ',\s*' }
  } | Where-Object { $_ } | Sort-Object -Unique)

  $rows = [System.Collections.Generic.List[object]]::new()
  $rows.Add(@('Metric', 'Value', 'Details'))
  $rows.Add(@('Feature', $Feature, ''))
  $rows.Add(@('Total Test Cases', $Cases.Count, ''))
  $rows.Add(@('Audit VALID', @($featureResults | Where-Object audit -eq 'VALID').Count, 'Design reviewed independently from execution result'))
  $rows.Add(@('Audit INVALID', @($featureResults | Where-Object audit -eq 'INVALID').Count, ''))
  $rows.Add(@('Audit INCOMPLETE', @($featureResults | Where-Object audit -eq 'INCOMPLETE').Count, ''))
  $rows.Add(@('Execution PASS', @($featureResults | Where-Object executionStatus -eq 'PASS').Count, 'All Newman assertions passed'))
  $rows.Add(@('Execution FAIL', @($featureResults | Where-Object executionStatus -eq 'FAIL').Count, 'At least one Newman assertion failed'))
  $rows.Add(@('Execution BLOCKED', @($featureResults | Where-Object executionStatus -eq 'BLOCKED').Count, 'Fixture/manual/stateful execution was not conclusive'))
  $rows.Add(@('Linked GitHub Bugs', $bugIds.Count, ($bugIds -join ', ')))
  $rows.Add(@('', '', ''))
  $rows.Add(@('Bug ID', 'GitHub Issue', 'Mapped Test Cases'))

  foreach ($bugId in $bugIds) {
    $mappedCases = @($Cases | Where-Object {
      ($Results[$_.Id].bugId -split ',\s*') -contains $bugId
    } | ForEach-Object Id)
    $rows.Add(@($bugId, $issueUrls[$bugId], ($mappedCases -join ', ')))
  }
  return ,$rows
}

if (-not (Test-Path -LiteralPath $resultPath)) {
  throw "Execution result file not found: $resultPath"
}

$resultObject = Get-Content -LiteralPath $resultPath -Raw -Encoding UTF8 | ConvertFrom-Json
$results = @{}
foreach ($property in $resultObject.PSObject.Properties) {
  $results[$property.Name] = $property.Value
}

$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>
'@

$rootRelationships = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
'@

$workbookRelationships = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
'@

$styles = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Aptos"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF5B3A29"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD9EAD3"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF4CCCC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border/>
    <border>
      <left style="thin"><color rgb="FFD9D9D9"/></left>
      <right style="thin"><color rgb="FFD9D9D9"/></right>
      <top style="thin"><color rgb="FFD9D9D9"/></top>
      <bottom style="thin"><color rgb="FFD9D9D9"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>
'@

Add-Type -AssemblyName System.IO.Compression
[System.IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null

$features = @('FR04', 'FR09', 'FR17')
foreach ($feature in $features) {
  $cases = Read-TestPlan $feature
  $detailRows = [System.Collections.Generic.List[object]]::new()
  $detailRows.Add(@('ID', 'Type', 'Technique / Ref', 'Input / Action', 'Expected Result', 'Audit', 'Note', 'Actual Result', 'Execution Status', 'Bug ID', 'Evidence'))

  foreach ($case in $cases) {
    $result = $results[$case.Id]
    if ($null -eq $result) {
      throw "Missing audit/execution result for $($case.Id)"
    }
    $detailRows.Add(@(
      $case.Id,
      (Get-TestType $case.Technique $case.Input),
      $case.Technique,
      $case.Input,
      $case.Expected,
      $result.audit,
      $result.auditNote,
      $result.actualResult,
      $result.executionStatus,
      $result.bugId,
      $result.evidence
    ))
  }

  $summaryRows = New-SummaryRows $feature $cases $results
  $workbook = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="$feature" sheetId="1" r:id="rId1"/>
    <sheet name="Summary" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>
"@

  $outputPath = Join-Path $OutputDirectory "$feature-Test-Cases.xlsx"
  $fileStream = [System.IO.FileStream]::new($outputPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
  $archive = [System.IO.Compression.ZipArchive]::new($fileStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)

  try {
    Add-ZipTextEntry $archive '[Content_Types].xml' $contentTypes
    Add-ZipTextEntry $archive '_rels/.rels' $rootRelationships
    Add-ZipTextEntry $archive 'xl/workbook.xml' $workbook
    Add-ZipTextEntry $archive 'xl/_rels/workbook.xml.rels' $workbookRelationships
    Add-ZipTextEntry $archive 'xl/styles.xml' $styles
    Add-ZipTextEntry $archive 'xl/worksheets/sheet1.xml' (New-WorksheetXml $detailRows @(18, 28, 28, 48, 48, 14, 58, 70, 18, 14, 70))
    Add-ZipTextEntry $archive 'xl/worksheets/sheet2.xml' (New-WorksheetXml $summaryRows @(28, 80, 75))
  }
  finally {
    $archive.Dispose()
    $fileStream.Dispose()
  }

  Write-Output "Created $outputPath"
}
