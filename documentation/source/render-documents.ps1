$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$review = Join-Path $root 'source\evidence\rendered'
New-Item -ItemType Directory -Path $review -Force | Out-Null
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($file in Get-ChildItem (Join-Path $root 'docx') -Filter '*.docx') {
    $document = $word.Documents.Open($file.FullName)
    try {
      foreach ($toc in $document.TablesOfContents) { $toc.Update() }
      $document.Repaginate()
      $document.Save()
      $pdf = Join-Path $review ($file.BaseName + '.pdf')
      $document.ExportAsFixedFormat($pdf, 17)
      Write-Output ($file.Name + ': ' + $document.ComputeStatistics(2) + ' pages; PDF rendered')
    } finally { $document.Close(0) }
  }
} finally { $word.Quit() }
