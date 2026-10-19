$ErrorActionPreference = 'Stop'

$sourcePath = Join-Path $PSScriptRoot 'vitreum-new-products-source.json'
$csvPath = Join-Path $PSScriptRoot 'vitreum-add-two-products.csv'
$products = Get-Content -Raw -LiteralPath $sourcePath -Encoding UTF8 | ConvertFrom-Json
$expectedHandles = @('gold-label', 'absolut-raspberry')

if ($products.Count -ne 2) { throw 'The import must contain exactly two products.' }

$rows = foreach ($product in $products) {
    if ($product.handle -notin $expectedHandles) { throw 'Unexpected product handle.' }
    if ($product.structured.offers.priceCurrency -ne 'EGP') { throw 'Expected EGP source prices.' }
    if ($null -eq $product.stockQuantity) { throw 'A verified stock quantity is required.' }
    if ($product.productImages.Count -ne 1) { throw 'Review the image rows before exporting.' }

    $compareAtPrice = ''
    $saleMatch = [regex]::Match($product.visibleDetails, 'EGP\s+([\d,]+)\s+EGP\s+([\d,]+)')
    if ($saleMatch.Success) { $compareAtPrice = $saleMatch.Groups[2].Value.Replace(',', '') + '.00' }

    $description = ''
    $descriptionMatch = [regex]::Match($product.visibleDetails, 'LIMITED EDITION [^\r\n]+')
    if ($descriptionMatch.Success) {
        $description = '<p>' + [System.Net.WebUtility]::HtmlEncode($descriptionMatch.Value) + '</p>'
    }

    [pscustomobject][ordered]@{
        'Handle' = $product.handle
        'Title' = $product.structured.name
        'Body (HTML)' = $description
        'Vendor' = 'VITREUM'
        'Type' = 'Glass art'
        'Tags' = 'glass-art, imported-vitreum-eg'
        'Published' = 'TRUE'
        'Option1 Name' = 'Title'
        'Option1 Value' = 'Default Title'
        'Variant SKU' = [string]$product.structured.sku
        'Variant Inventory Tracker' = 'shopify'
        'Variant Inventory Qty' = [int]$product.stockQuantity
        'Variant Inventory Policy' = 'deny'
        'Variant Fulfillment Service' = 'manual'
        'Variant Price' = ([decimal]$product.structured.offers.price).ToString('F2', [cultureinfo]::InvariantCulture)
        'Variant Compare At Price' = $compareAtPrice
        'Variant Requires Shipping' = 'TRUE'
        'Image Src' = $product.productImages[0]
        'Image Position' = 1
        'Image Alt Text' = $product.structured.name + ' framed glass artwork'
        'Status' = 'active'
    }
}

$rows | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding UTF8
$roundTrip = @(Import-Csv -LiteralPath $csvPath -Encoding UTF8)
if ($roundTrip.Count -ne 2 -or @($roundTrip.Handle | Sort-Object -Unique).Count -ne 2) {
    throw 'CSV validation failed: expected two unique products.'
}
foreach ($row in $roundTrip) {
    $source = $products | Where-Object handle -EQ $row.Handle
    if ($row.Title -cne $source.structured.name -or [int]$row.'Variant Inventory Qty' -ne $source.stockQuantity) {
        throw 'CSV validation failed: source title or inventory changed.'
    }
}

$roundTrip | Select-Object Handle, Title, 'Variant Price', 'Variant Compare At Price', 'Variant Inventory Qty'
