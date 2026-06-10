# Builds data/sentences.js from the ManyThings/Tatoeba jpn-eng export.
# Keeps short sentences whose kanji all appear in our kanji deck, and which
# contain a vocab-deck word (>= 2 chars) to use as the cloze target.
param(
  [string]$PairsFile = "$env:TEMP\jpn-eng\jpn.txt",
  [string]$ProjectDir = "C:\Users\s.martin\Projects\nihongo-trainer"
)

$kanjiJs = Get-Content "$ProjectDir\data\kanji.js" -Raw -Encoding UTF8
$allowedKanji = New-Object 'System.Collections.Generic.HashSet[char]'
foreach ($m in [regex]::Matches($kanjiJs, 'ch:\s*"(.)"')) { [void]$allowedKanji.Add($m.Groups[1].Value[0]) }
Write-Host "Allowed kanji: $($allowedKanji.Count)"

$vocabJs = Get-Content "$ProjectDir\data\vocab.js" -Raw -Encoding UTF8
$terms = @()
foreach ($m in [regex]::Matches($vocabJs, 'jp:\s*"([^"]+)"')) {
  $t = $m.Groups[1].Value
  if ($t.Length -ge 2) { $terms += $t }
}
# longest first so we cloze 日本語 rather than 日本 inside it
$terms = $terms | Sort-Object { -$_.Length }
Write-Host "Cloze candidate terms: $($terms.Count)"

function Test-KanjiChar([char]$c) { return ($c -ge 0x4E00 -and $c -le 0x9FFF) -or $c -eq [char]0x3005 }
function Test-KanaChar([char]$c) { return ($c -ge 0x3041 -and $c -le 0x3096) -or ($c -ge 0x30A1 -and $c -le 0x30FA) -or $c -eq [char]0x30FC }

$seen = New-Object 'System.Collections.Generic.HashSet[string]'
$rows = New-Object System.Collections.ArrayList

foreach ($line in [System.IO.File]::ReadLines($PairsFile)) {
  $parts = $line -split "`t"
  if ($parts.Count -lt 2) { continue }
  $en = $parts[0]; $jp = $parts[1]
  if ($jp.Length -gt 24 -or $jp.Length -lt 6) { continue }
  if ($en.Length -gt 60) { continue }
  if (-not $seen.Add($jp)) { continue }

  # every kanji must be one we teach
  $ok = $true
  foreach ($c in $jp.ToCharArray()) {
    if ((Test-KanjiChar $c) -and -not $allowedKanji.Contains($c)) { $ok = $false; break }
  }
  if (-not $ok) { continue }

  # find a cloze target with clean script boundaries
  $target = $null
  foreach ($t in $terms) {
    $idx = $jp.IndexOf($t)
    if ($idx -lt 0) { continue }
    $beforeOk = $true; $afterOk = $true
    if ($idx -gt 0) {
      $prev = $jp[$idx - 1]; $first = $t[0]
      if ((Test-KanjiChar $first) -and (Test-KanjiChar $prev)) { $beforeOk = $false }
      if ((Test-KanaChar $first) -and (Test-KanaChar $prev)) { $beforeOk = $false }
    }
    $endIdx = $idx + $t.Length
    if ($endIdx -lt $jp.Length) {
      $next = $jp[$endIdx]; $last = $t[$t.Length - 1]
      if ((Test-KanjiChar $last) -and (Test-KanjiChar $next)) { $afterOk = $false }
      if ((Test-KanaChar $last) -and (Test-KanaChar $next)) { $afterOk = $false }
    }
    if ($beforeOk -and $afterOk) { $target = $t; break }
  }
  if ($null -eq $target) { continue }

  [void]$rows.Add(@($jp, $en, $target))
}

Write-Host "Matched sentences: $($rows.Count)"
$rows = $rows | Sort-Object { $_[0].Length } | Select-Object -First 500

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("// Cloze sentences from Tatoeba (via manythings.org/anki), CC-BY 2.0 FR, tatoeba.org.")
[void]$sb.AppendLine("// Filtered so every kanji appears in our kanji deck. Format: [japanese, english, clozeTarget]")
[void]$sb.AppendLine("const SENTENCES = [")
foreach ($r in $rows) {
  $jp = $r[0].Replace('\', '\\').Replace('"', '\"')
  $en = $r[1].Replace('\', '\\').Replace('"', '\"')
  $tg = $r[2].Replace('\', '\\').Replace('"', '\"')
  [void]$sb.AppendLine("[`"$jp`",`"$en`",`"$tg`"],")
}
[void]$sb.AppendLine("];")
[System.IO.File]::WriteAllText("$ProjectDir\data\sentences.js", $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Wrote $(@($rows).Count) sentences to data\sentences.js"
