# Moving sale site

**Live site: https://rhanuch.github.io/venta/** — Spanish: https://rhanuch.github.io/venta/?lang=es

Static page on GitHub Pages. All item data lives in a Google Sheet published as CSV,
so changing a price or marking something sold takes one cell edit and no redeploy.

Sheet: https://docs.google.com/spreadsheets/d/1BVJGFqgG3MaGtp2I7XL0bQHBQ9U_6WRP72KPWKALdus/edit

## One-time setup

1. **Load the catalog into the Sheet** — in the Sheet: `File → Import → Upload → catalog.csv`,
   choose **Replace current sheet**, separator comma. All 40 rows land filled in.
2. **Fill the `price` column.** It's the only one left blank. `dimensions_cm` is also
   blank — fill it (as `L x W x H`) for anything worth measuring; the site converts to
   inches automatically. Rows left blank fall back to the small/medium/large label.
3. **Publish the sheet** — `File → Share → Publish to web`, pick the sheet tab,
   format **Comma-separated values (.csv)**, Publish. Copy that URL.
4. **Paste it** into `CSV_URL` at the top of `docs/app.js`, commit, push.
5. **Turn on Pages** — repo `Settings → Pages → Source: Deploy from a branch`,
   branch `main`, folder `/docs`.

## Day to day — everything lives in the Sheet

Prices, status, descriptions, conditions: **edit the Sheet, that's it.** Changes are
live on the next page load. Never edit `catalog.csv` by hand — CI overwrites it from
the Sheet every 6 hours, so the repo copy is a backup, not a source.

- **Mark something sold**: set `status` to `sold` (or `pending`, or `available`). Sold
  items stay visible, greyed with a SOLD stamp; buyers can hide them with the toggle.
- **Change a price**: edit `price`. `$` optional. Blank shows "Ask".

## Adding an item — no laptop needed

1. On github.com open `docs/images`, **Add file → Upload files**, and drop the photos
   into a **new folder named exactly like the item's `id`** (e.g. type `sofa/` before the
   filename). Any size, any orientation, `.jpg` / `.png` / `.heic` all fine.
2. Add a row in the Sheet. Set `id` to that same folder name and **leave `photos`
   blank**.

That's it. Within about a minute CI will resize everything to 1600px / 80% quality,
strip EXIF, fix rotation, rebuild `docs/images.json`, and redeploy. The site finds the
photos by matching the folder name to the row's `id`.

Fill `photos` explicitly only when you want a specific cover shot or a subset, e.g.
`sofa/3.jpg,sofa/1.jpg`.

### From the laptop instead
Drop folders into `~/Downloads/venta/` and run `./build-images.sh && git add -A &&
git commit -m photos && git push`. Same result, just resized locally.

## What CI does

`.github/workflows/site.yml` runs on every push, every 6 hours, and on demand:

1. Compresses any photo over 1600px or 500KB and converts it to `.jpg`
2. Regenerates `docs/images.json` (the id → photos map)
3. Pulls the published Sheet into `catalog.csv` and `docs/catalog.csv`
4. Commits anything that changed and deploys to Pages

The Sheet pull refuses to overwrite if it returns fewer than 5 rows, so a broken
publish or a Google outage can't wipe the catalog.

## Column reference

| column | values |
| --- | --- |
| `condition` | `new` `like_new` `very_good` `good` `fair` — blank shows no badge |
| `status` | `available` `pending` `sold` |
| `pickup` | `pickup` `coordinate` `deliver` |
| `size_label` | `small` `medium` `large` (fallback when `dimensions_cm` is blank) |
| `photos` | comma-separated paths under `docs/images/`, first one is the cover |
| `retail` | what it cost new; renders as struck-through "$X new". Blank hides it. |
| `buyer` | who the item is going to. Ignored by the site — for your own tracking. |

## Language

English by default; `?lang=es` for Spanish. The toggle in the header just switches the
URL, so a link keeps whichever language you shared it in.

## Test

`node test.js` — checks the CSV parser, the cm→inch conversion, price sorting, and that
every photo referenced in `catalog.csv` exists on disk.
