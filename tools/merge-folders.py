#!/usr/bin/env python3
"""Fold the photo folders into the catalog.

- A folder under docs/images with no matching row becomes a new row (id = folder).
- A row with a blank `photos` cell gets the folder's photos.
- A row with photos already listed keeps that order, and any NEW files in the
  folder are appended — so dropping a photo in never disturbs a chosen cover.

Run locally with: python3 tools/merge-folders.py
"""
import csv, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG = os.path.join(ROOT, 'catalog.csv')
MANIFEST = os.path.join(ROOT, 'docs', 'images.json')

manifest = json.load(open(MANIFEST))
rows = list(csv.DictReader(open(CATALOG)))
hdr = list(rows[0].keys())
by_id = {r['id']: r for r in rows}
# Some folders are shared by several rows (7 plants all live in plantas/).
# A folder is only "unclaimed" if none of its photos are referenced anywhere.
claimed = {p.strip() for r in rows for p in r['photos'].split(',') if p.strip()}

added, filled, extended = [], [], []

for r in rows:
    files = manifest.get(r['id'])
    if not files:
        continue
    listed = [p.strip() for p in r['photos'].split(',') if p.strip()]
    if not listed:
        r['photos'] = ','.join(files)
        filled.append(r['id'])
    else:
        new = [f for f in files if f not in listed]
        if new:
            r['photos'] = ','.join(listed + new)
            extended.append(f"{r['id']} (+{len(new)})")

for folder in sorted(manifest):
    if folder in by_id or any(f in claimed for f in manifest[folder]):
        continue
    blank = {h: '' for h in hdr}
    blank['id'] = folder
    blank['photos'] = ','.join(manifest[folder])
    blank['status'] = 'available'
    rows.append(blank)
    added.append(folder)

with open(CATALOG, 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=hdr)
    w.writeheader(); w.writerows(rows)

for label, items in (('new items', added), ('photos filled', filled), ('photos added', extended)):
    if items:
        print(f"{label}: {', '.join(items)}")
if not (added or filled or extended):
    print("catalog already matches the folders")
