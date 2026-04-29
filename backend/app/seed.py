import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"

def load_vehicle_catalog():
    with open(DATA_DIR / "vehicle_catalog.json", "r", encoding="utf-8") as f:
        return json.load(f)

def load_faq():
    with open(DATA_DIR / "faq.json", "r", encoding="utf-8") as f:
        return json.load(f)
