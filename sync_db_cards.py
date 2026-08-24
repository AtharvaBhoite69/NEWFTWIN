import os
import sqlite3
import csv
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "server", "data", "ftwin.db")
ASSETS_DIR = os.path.join(BASE_DIR, "server", "assets", "cards")
CSV_PATH = os.path.join(BASE_DIR, "india_credit_cards.csv")

def main():
    if not os.path.exists(DB_PATH):
        print("Database not found:", DB_PATH)
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Load CSV mappings
    csv_map = {}
    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                name = row.get("card_name", "").strip().lower()
                bank = row.get("bank", "").strip().lower()
                img = row.get("image_url", "").strip()
                if img:
                    csv_map[(bank, name)] = img
                    csv_map[name] = img

    # 2. Get all asset files
    asset_files = [f for f in os.listdir(ASSETS_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]

    # 3. Read all cards from DB
    cursor.execute("SELECT id, card_name, bank, image_url FROM credit_cards")
    cards = cursor.fetchall()

    updated = 0
    for card_id, card_name, bank, current_img in cards:
        c_name = card_name.strip().lower()
        b_name = (bank or "").strip().lower()

        target_img = None

        # Try CSV map
        if (b_name, c_name) in csv_map:
            target_img = csv_map[(b_name, c_name)]
        elif c_name in csv_map:
            target_img = csv_map[c_name]
        else:
            # Fuzzy match against asset files
            card_tokens = set(re.findall(r"\w+", f"{b_name} {c_name}")) - {"bank", "card", "credit", "the", "and"}
            best_file = None
            best_score = 0
            for f in asset_files:
                f_tokens = set(re.findall(r"\w+", f.lower())) - {"bank", "card", "credit", "the", "and"}
                overlap = card_tokens.intersection(f_tokens)
                score = sum(len(t) for t in overlap)
                if score > best_score and len(overlap) >= 1:
                    best_score = score
                    best_file = f
            if best_file and best_score >= 3:
                target_img = f"/assets/cards/{best_file}"

        if target_img:
            cursor.execute(
                "UPDATE credit_cards SET image_url = ?, image_source = 'asset', image_verified = 1 WHERE id = ?",
                (target_img, card_id)
            )
            updated += 1

    conn.commit()
    cursor.execute("SELECT COUNT(*), COUNT(image_url) FROM credit_cards WHERE image_url IS NOT NULL AND image_url != ''")
    res = cursor.fetchone()
    print(f"Done! Cards with verified images in DB: {res[0]}/{len(cards)}")
    conn.close()

if __name__ == "__main__":
    main()
