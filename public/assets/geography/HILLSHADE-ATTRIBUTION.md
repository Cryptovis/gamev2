# Shaded relief (hillshade) texture

`hillshade-2048.webp` is derived from Natural Earth *Gray Earth with Shaded Relief, Hypsography, Ocean Bottom and Drainages*
(GRAY_50M_SR_OB, 1:50m, 10800 × 5400 equirectangular).

Source: https://naciscdn.org/naturalearth/50m/raster/GRAY_50M_SR_OB.zip
Catalog: https://www.naturalearthdata.com/downloads/50m-raster-data/50m-gray-earth/

Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com

Licence: public domain (Natural Earth terms of use). No permission or attribution is required; the credit above is given as a courtesy.

Processing (`scripts/build-hillshade.mjs`, committed result): single-channel greyscale, resized to 2048 × 1024 (the same frame as the
Blue Marble surface so both layers reproject identically), levels black point 40 / white point 230, WebP quality 82.

Used only as a presentation layer (multiply blend over the political or geographic map). It is bundled locally; no remote image request is made in the game.
