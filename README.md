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

## Day to day

- **Mark something sold**: set its `status` cell to `sold`. Also `pending` (reserved) or
  `available`. Sold items stay visible, greyed out and struck through — buyers can hide
  them with the toggle.
- **Change a price**: edit the `price` cell. `$` optional. Blank shows "Ask".
- **Add / remove / replace photos**: edit the folders under `~/Downloads/venta`, then
  `./build-images.sh && git add -A && git commit -m photos && git push`. The script
  rebuilds `docs/images` from scratch every time, so it handles all three cases.
- **Add an item**: add its photos, run the script, then add a row in the Sheet with
  `photos` pointing at the new files (e.g. `sofa/1.jpg,sofa/2.jpg`).

## Keeping `buyer` private

The Sheet is published to the web and the CSV URL sits in `docs/app.js`, so
**anything on the published tab is public**, whether or not the site draws it.
To track who each item is going to without exposing it:

1. In the Sheet, add a **`buyer`** column to your existing tab and rename that
   tab **`Catalog`**. This is your private master — edit only here.
2. Add a second tab named **`web`**, and put this in its cell A1:

   ```
   =QUERY(Catalog!A:P, "select A,B,C,D,E,F,G,H,I,J,K,L,M,N,O", 1)
   ```

   That mirrors every column except `buyer` (column P), and updates live.
3. `File → Share → Publish to web` → select the **`web`** tab (not "Entire
   document") → **Comma-separated values (.csv)** → Publish.
4. Put that new URL in `CSV_URL` at the top of `docs/app.js`.

Now `buyer` exists only on the unpublished tab. `node test.js` fails if a buyer
name is ever committed to this repo, since `docs/catalog.csv` is public too.

## Column reference

| column | values |
| --- | --- |
| `condition` | `new` `like_new` `good` `fair` |
| `status` | `available` `pending` `sold` |
| `pickup` | `pickup` `coordinate` `deliver` |
| `size_label` | `small` `medium` `large` (fallback when `dimensions_cm` is blank) |
| `photos` | comma-separated paths under `docs/images/`, first one is the cover |
| `buyer` | private — who it is going to. Never published, never rendered. |

## Language

English by default; `?lang=es` for Spanish. The toggle in the header just switches the
URL, so a link keeps whichever language you shared it in.

## Test

`node test.js` — checks the CSV parser, the cm→inch conversion, price sorting, and that
every photo referenced in `catalog.csv` exists on disk.
