# VITREUM immersive product visuals

Floating homepage artwork and the collection tornado use `snippets/vitreum-product-visual.liquid`. Catalog cards, product galleries, variant images, prices and product URLs continue using the original Shopify product data. No CSS blending, color removal or browser-side image generation is involved.

## Configure a shared cut-out (recommended)

1. Prepare a **separate** PNG or WebP with a real alpha channel. Center the exact artwork with a small transparent margin, ideally 1200–1600px on its longest edge. Keep the entire artwork, including its frame if the frame is part of the product. Avoid baked backgrounds, checkerboard patterns, floor shadows or large empty margins.
2. Upload that derivative under **Shopify Admin → Content → Files**. Suggested name: `vitreum-<product-handle>-cutout-v1.png`.
3. Under **Settings → Custom data → Products**, create a definition named **Vitreum cut-out**, namespace/key **`custom.vitreum_cutout`**, type **File**, one file, restricted to images. These are admin configuration steps; theme code does not create metafield definitions.
4. Open the product, select its derivative in that metafield, and save. Both immersive sections automatically use it. Keep it outside the product media gallery to avoid changing the normal catalog and product page.

## Override a section in the Theme Editor

Open **Vitreum story chapters** or **Vitreum product vortex**, add a **Product cut-out** block, choose its product, and select the transparent image. The block maps an image to an existing product; it never adds a fake product. The homepage allows four mappings, the vortex 24. First matching nonempty block wins. A mapping is used only if that product is in the section's current collection.

Image priority:

1. Product cut-out block in the current section.
2. Product metafield `custom.vitreum_cutout` (an image file).
3. Original featured product image.
4. Existing product placeholder when no product image exists.

The fallback can still have its photographed rectangular background. A fallback is deliberately not labelled a transparent asset. File extensions alone do not prove transparency. A failed cut-out image request is retried once using the original product photo; there is no retry loop.

## Background-removal workflow

Use a **copy** of the original photograph. Shopify's media editor offers AI background removal; its tools also apply to files in Content → Files. Alternatively, preprocess a duplicate using an image editor with a reviewed alpha mask. Never overwrite the catalog's source image just to supply a floating visual.

1. Upload a separate copy, open that copy in Shopify's media editor, remove its background, and save the derivative.
2. Check the result over both a light and a dark background. Glass edges, labels, reflections, fragments and the artwork's frame must remain faithful. AI results require review; do not publish a cut-out that alters the actual object.
3. Verify genuine transparency with an alpha inspector. A checkerboard drawn into an opaque image is not transparency. Export PNG or alpha WebP, not JPEG.
4. Assign the reviewed file through the metafield or section block above. Repeat independently for each product.

Suggested AI brief: “Remove only the surrounding photographed background. Preserve the exact artwork, its frame where it is part of the sold piece, glass fragments, labels, lettering, proportions and colors. Do not reconstruct, redesign or replace the product. Export genuine transparent alpha.”

This theme does not send product images to a third-party API, embed credentials, or run background removal during page loads. Processing is done once before delivery; the storefront serves responsive Shopify CDN images. No cut-outs have been generated or assigned automatically.

## Validation and maintenance

- The initial audit sampled all 15 product images currently rendered by the vortex and eight alternate PNG images from these products; all were opaque. This does not establish that every file in the store's Files library is opaque.
- `data-visual-kind` reports `cutout` for explicitly configured derivatives and `catalog` for fallbacks. `data-visual-source` reports `section`, `metafield`, `catalog` or `fallback`.
- Inspect both a homepage story image and the matching vortex image after assignment. The standard collection grid and product page should still show their original photos.
- Resize, use reduced motion and disable JavaScript: the server-selected image and real product link still render. JavaScript only adds image-load recovery and the existing motion.
- The image wrapper reserves its existing aspect ratio; source changes do not change the product's layout slot.

Official references:

- [Shopify media editor and AI background removal](https://help.shopify.com/en/manual/shopify-admin/productivity-tools/media-editor)
- [Assigning file-reference metafield values](https://help.shopify.com/en/manual/custom-data/metafields/adding-values-to-metafields)
