$ErrorActionPreference = 'Stop'

$requiredFiles = @(
    'AGENTS.md',
    '.harness/source.json',
    'docs/conventions/coding.md',
    'docs/conventions/git-workflow.md',
    'docs/domain/glossary.md',
    'docs/decisions/README.md',
    'docs/failures/README.md',
    'docs/harness/adoption-report.md',
    '.github/ISSUE_TEMPLATE/feature_request.md',
    '.github/ISSUE_TEMPLATE/bug_report.md',
    '.github/pull_request_template.md'
)

foreach ($relativePath in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $relativePath -PathType Leaf)) {
        throw "Missing required harness file: $relativePath"
    }
}

$source = Get-Content -LiteralPath '.harness/source.json' -Raw | ConvertFrom-Json
if (-not $source.source -or -not $source.source_commit -or $source.applied_profile -ne 'generic') {
    throw 'Invalid .harness/source.json: source, source_commit, and generic applied_profile are required.'
}

$report = Get-Content -LiteralPath 'docs/harness/adoption-report.md' -Raw
foreach ($section in @(
    '## Target Repository Observed',
    '## Files Added Or Changed',
    '## Checks Run',
    '## Verification Gate Placement',
    '## Effectiveness Measurement Plan',
    '## Remaining Manual Steps'
)) {
    if ($report -notmatch [regex]::Escape($section)) {
        throw "Adoption report is missing section: $section"
    }
}

$temporaryFiles = Get-ChildItem -Recurse -File -Force |
    Where-Object {
        $_.FullName -notmatch '\\\.git\\' -and
        $_.FullName -notmatch '\\harness-starter-kit\\' -and
        $_.Name -match '^(temp_|.*(_new|_old|_backup|_fix)$)'
    }

if ($temporaryFiles) {
    $names = ($temporaryFiles | ForEach-Object { $_.FullName }) -join ', '
    throw "Temporary agent files found: $names"
}

Write-Output 'Harness checks passed.'
