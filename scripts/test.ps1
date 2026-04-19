param(
  [int]$Attempts = 1
)

if ($Attempts -lt 1) {
  Write-Error "Attempts debe ser mayor o igual a 1."
  exit 1
}

$ErrorActionPreference = "Stop"

# ==============================
# CONFIG HARD-CODEADA (LOCAL)
# ==============================
$WebhookUrl = "https://bigjack-rp.vercel.app/api/webhooks/orders"
$WebhookSecret = "pkwevojn2981334ou3m86b9209u25161v3rtf6g5g15iu5n19"

# SKUs reales compartidos por ti
$CatalogSkus = @(
  "PRD-LAM-IPH3", # LA MISIA (UNA CARNE)
  "PRD-INK-PXC0", # INKA COLA 600ML
  "PRD-LAR-N4R4", # LA ROYAL (DOBLE CARNE)
  "PRD-ALO-KC88", # A LO POBRE (UNA CARNE)
  "PRD-ALO-LA72", # A LO POBRE (DOBLE CARNE)
  "PRD-LAB-JFSY", # LA BACON (UNA CARNE)
  "PRD-LAR-LUS0", # LA ROYAL (UNA CARNE)
  "PRD-AGU-RC7G", # AGUA CIELO PERSONAL
  "PRD-LAB-JXVH", # LA BACON (DOBLE CARNE)
  "PRD-COC-QLER"  # COCA COLA 600ML
)

function Invoke-WebhookTest {
  param(
    [string]$Title,
    [string]$EventId,
    [array]$Items,
    [string]$Secret,
    [string]$ExpectedHint
  )

  $headers = @{ "Content-Type" = "application/json" }
  if ($Secret) {
    $headers["x-webhook-secret"] = $Secret
  }

  $payload = @{
    eventId = $EventId
    orderDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    source = "menu-web"
    customer = @{
      name = "Test Local Webhook"
      phone = "+51999999999"
    }
    paymentMethod = "yape"
    notes = "Script local hardcoded"
    items = $Items
    metadata = @{
      origin = "menu-web"
      channel = "menu-web"
      testMode = "hardcoded-local"
      expected = $ExpectedHint
    }
  }

  $body = $payload | ConvertTo-Json -Depth 10

  Write-Host ""
  Write-Host ("===== " + $Title + " =====")
  Write-Host ("URL: " + $WebhookUrl)
  Write-Host ("EVENT_ID: " + $EventId)
  Write-Host ("EXPECT: " + $ExpectedHint)
  Write-Host ("ITEMS: " + (($Items | ForEach-Object { $_.sku + " x" + $_.quantity }) -join ", "))

  try {
    $resp = Invoke-WebRequest -Method Post -Uri $WebhookUrl -Headers $headers -Body $body -TimeoutSec 30
    Write-Host ("STATUS: " + [int]$resp.StatusCode)
    Write-Host "BODY:"
    Write-Host $resp.Content
    return [PSCustomObject]@{ Status = [int]$resp.StatusCode; Body = $resp.Content }
  }
  catch {
    $response = $_.Exception.Response
    if ($null -ne $response) {
      $status = [int]$response.StatusCode
      $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
      $content = $reader.ReadToEnd()
      $reader.Close()
      Write-Host ("STATUS: " + $status)
      Write-Host "BODY:"
      Write-Host $content
      return [PSCustomObject]@{ Status = $status; Body = $content }
    }
    Write-Host "STATUS: 0"
    Write-Host "BODY:"
    Write-Host $_.Exception.Message
    return [PSCustomObject]@{ Status = 0; Body = $_.Exception.Message }
  }
}

Write-Output "=== TEST WEBHOOK LOCAL (HARDCODED) ==="
Write-Output ("Attempts: " + $Attempts)
Write-Output ("Webhook URL: " + $WebhookUrl)
Write-Output ("Secret hardcodeado: " + ($(if ($WebhookSecret) { "SI" } else { "NO" })))
Write-Output ""
Write-Output "SKUs disponibles en script:"
$CatalogSkus | ForEach-Object { Write-Output ("- " + $_) }

$exitCode = 0

for ($i = 1; $i -le $Attempts; $i++) {
  $baseEvent = "menu-local-" + (Get-Date -Format "yyyyMMddHHmmss") + "-" + $i

  # Caso 1: pedido valido (debe crear venta)
  $validItems = @(
    @{ sku = "PRD-LAM-IPH3"; quantity = 1; notes = "Hamburguesa" },
    @{ sku = "PRD-INK-PXC0"; quantity = 1; notes = "Bebida" }
  )
  $res1 = Invoke-WebhookTest -Title "CASO 1 - VALIDO" -EventId $baseEvent -Items $validItems -Secret $WebhookSecret -ExpectedHint "200 success=true"
  if ($res1.Status -ne 200) { $exitCode = 1 }

  # Caso 2: idempotencia (mismo eventId que caso 1)
  $res2 = Invoke-WebhookTest -Title "CASO 2 - DUPLICADO IDEMPOTENTE" -EventId $baseEvent -Items $validItems -Secret $WebhookSecret -ExpectedHint "200 duplicated=true"
  if ($res2.Status -ne 200) { $exitCode = 1 }

  # Caso 3: secret invalido
  $res3 = Invoke-WebhookTest -Title "CASO 3 - SECRET INVALIDO" -EventId ($baseEvent + "-badsecret") -Items $validItems -Secret "SECRET_INVALIDO" -ExpectedHint "401 No autorizado"
  if ($res3.Status -ne 401) { $exitCode = 1 }

  # Caso 4: SKU inexistente
  $badSkuItems = @(
    @{ sku = "SKU-NO-EXISTE-999"; quantity = 1; notes = "Debe fallar" }
  )
  $res4 = Invoke-WebhookTest -Title "CASO 4 - SKU INEXISTENTE" -EventId ($baseEvent + "-badsku") -Items $badSkuItems -Secret $WebhookSecret -ExpectedHint "400 missingSkus"
  if ($res4.Status -ne 400) { $exitCode = 1 }

  Write-Output ""
  Write-Output ("--- FIN BLOQUE DE PRUEBAS " + $i + " DE " + $Attempts + " ---")
  Write-Output ""
}

Write-Output "=== RESULTADO FINAL ==="
if ($exitCode -eq 0) {
  Write-Output "OK: Los status devueltos coinciden con lo esperado en los 4 casos."
} else {
  Write-Output "ERROR: Uno o mas casos no devolvieron el status esperado. Revisa STATUS/BODY arriba."
}

exit $exitCode
