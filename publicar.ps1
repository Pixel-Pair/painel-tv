# Publica (ou atualiza) o painel no GitHub Pages da conta Pixel-Pair.
# Uso: clique direito > Executar com PowerShell, ou rode no terminal.
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$user = gh api user --jq .login
if ($user -ne "Pixel-Pair") {
  gh auth switch --hostname github.com --user Pixel-Pair
  $user = gh api user --jq .login
  if ($user -ne "Pixel-Pair") { throw "A conta ativa nao e Pixel-Pair ($user). Parando." }
}
Write-Host "Conta: $user" -ForegroundColor Cyan

if (-not (Test-Path .git)) { git init -b main | Out-Null }
git config user.name "Pixel Pair"
git config user.email "Pixel-Pair@users.noreply.github.com"
git add index.html logo.png .gitignore scripts .github publicar.ps1
git commit -m "Atualiza painel" 2>$null | Out-Null

gh repo view "$user/painel-tv" --json name 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  gh repo create painel-tv --public --source . --remote origin --description "Painel de TV da Pixel Pair"
}

# Pages publicado pelo GitHub Actions (necessario para o Ibovespa)
gh api -X POST "repos/$user/painel-tv/pages" -f build_type=workflow 2>$null | Out-Null
gh api -X PUT "repos/$user/painel-tv/pages" -f build_type=workflow 2>$null | Out-Null

git push -u origin main

Write-Host ""
Write-Host "Enviado! Em 1-2 minutos o painel atualiza em:" -ForegroundColor Green
Write-Host "https://$($user.ToLower()).github.io/painel-tv/" -ForegroundColor Green
