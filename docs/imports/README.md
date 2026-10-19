# Add Gold Label and ABSOLUT RASPBERRY to Shopify

Import **vitreum-add-two-products.csv** in **Shopify Admin → Products → Import**.

1. Select the CSV file.
2. Keep **Overwrite products with matching handles** **unchecked**. Matching products will be skipped, rather than replaced.
3. Choose the Online Store sales channel. The file marks the two new products active and published.
4. Review the preview: exactly **two new products**, one image and one default variant each. Then import.

The file contains no rows for existing products and no deletion actions. The two handles were absent from the 15 published products in the local Shopify catalog at extraction time. Hidden or archived products were not accessible; keeping overwrite unchecked also protects any such matching handles.

The current catalog uses `/collections/all`, so the new published products will appear there without a theme edit. Both use the existing product-page carousel, purchase controls, and cash-on-delivery storefront presentation. This CSV does not change checkout payment providers.

| Product | Price (EGP) | Compare-at (EGP) | Source stock | Handle |
| --- | ---: | ---: | ---: | --- |
| GOLD LABEL | 800 | 950 | 1 | `gold-label` |
| ABSOLUT RASPBERRY 🫐 | 900 | — | 0 | `absolut-raspberry` |

Stock is tracked by Shopify, with selling past zero disabled. ABSOLUT RASPBERRY remains visible as sold out. Its visible product page says **Out of stock**, even though its structured data incorrectly says `InStock`; the CSV follows the visible page. Recheck quantities if importing later. Product CSV inventory quantities apply to a single-location store. If your store has multiple locations, verify and assign the quantities at the correct location after import.

The source provides one image per product and no selectable product options. The CSV uses one default variant per product, preserves the source SKU values and the raspberry description **LIMITED EDITION 💜**, and leaves Gold Label's description empty because none was supplied. No dimensions, weight, material specifications, or additional variants were invented. Prices assume your Shopify store currency is EGP. Tax and shipping-rate configuration remain Shopify defaults for new products.

The CSV references the source's public image URLs. Both returned HTTP 200 with image content and were inspected visually. Shopify downloads them during import; local backups are in `images/` if a source URL becomes unavailable. The source images have photographed backgrounds; no transparent cut-outs are supplied by this import.

Sources captured with Playwright on 2026-10-19:

- [Gold Label](https://vitreum-eg.store/pd/1367590)
- [ABSOLUT RASPBERRY 🫐](https://vitreum-eg.store/pd/1368637)
- [Shopify CSV import behavior](https://help.shopify.com/en/manual/products/import-export/import-products)
- [Shopify CSV format and legacy column compatibility](https://help.shopify.com/en/manual/products/import-export/using-csv)

`vitreum-new-products-source.json` records the extracted product data. To regenerate the UTF-8 CSV from that saved data, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File docs/imports/build-new-products-csv.ps1
```

Checks performed: two unique new handles; titles and emoji survive CSV round-trip; prices, sale comparison, and stock agree with visible source information; both public image downloads succeed. The file has **not** been imported into Shopify.
