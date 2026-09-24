"""Create a one-time SQL import from an existing local store, or bundled seed data.
Usage: python3 scripts/export_store.py [path/to/.data/store.json] > private-import/initial.sql
No network access and no changes to the source workbook or store.
"""
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
store = {
    "items": json.loads((root / "src/data/items.json").read_text()),
    "audits": [], "kitEdits": [], "tolerancePct": 5,
    "checkouts": [], "stagings": [], "requests": [], "extraLocations": [],
}
if len(sys.argv) > 1:
    store.update(json.loads(Path(sys.argv[1]).read_text()))
for collection in ("courses", "locations", "disposals"):
    store[collection] = json.loads((root / "src/data" / (collection + ".json")).read_text())
encoded = json.dumps(store, separators=(",", ":"), ensure_ascii=False).replace("'", "''")
print("-- Private one-time import. Refuses to overwrite an initialized database.")
print("begin;")
print("select public.hhp_initialize_store('" + encoded + "'::jsonb);")
print("commit;")
