import sqlite3, csv, os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "india_credit_cards.csv")
DB_PATH = os.path.join(BASE_DIR, "server", "data", "ftwin.db")
ASSETS_DIR = os.path.join(BASE_DIR, "server", "assets", "cards")

with open(CSV_PATH, 'r', encoding='utf-8') as f:
    csv_rows = list(csv.DictReader(f))

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
c.execute('SELECT COUNT(*) FROM credit_cards')
db_total = c.fetchone()[0]

c.execute("SELECT COUNT(*) FROM credit_cards WHERE image_url IS NOT NULL AND image_url != ''")
db_with_img = c.fetchone()[0]

c.execute('SELECT bank, COUNT(*) FROM credit_cards GROUP BY bank ORDER BY COUNT(*) DESC')
bank_counts = c.fetchall()

c.execute('SELECT network, COUNT(*) FROM credit_cards GROUP BY network ORDER BY COUNT(*) DESC')
network_counts = c.fetchall()

img_files = [f for f in os.listdir(ASSETS_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]

print(f"Total CSV Cards: {len(csv_rows)}")
print(f"Total DB Catalog Cards: {db_total}")
print(f"Cards with Images in DB: {db_with_img}")
print(f"Total Image Asset Files: {len(img_files)}\n")

print("Bank Breakdown:")
for b, cnt in bank_counts:
    print(f"  - {b}: {cnt} cards")

print("\nNetwork Breakdown:")
for n, cnt in network_counts:
    print(f"  - {n or 'Standard'}: {cnt} cards")
