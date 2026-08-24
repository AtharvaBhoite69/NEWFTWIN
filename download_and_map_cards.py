import os
import sys
import csv
import re
import time
from urllib.parse import urlparse, unquote
import requests
from bs4 import BeautifulSoup

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_INPUT = os.path.join(BASE_DIR, "india_credit_cards.csv")
GUIDE_CSV = os.path.join(BASE_DIR, "card_image_naming_guide.csv")
OUTPUT_FOLDER = os.path.join(BASE_DIR, "server", "assets", "cards")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
}

def sanitize_filename(name: str) -> str:
    clean = re.sub(r"[^\w\s-]", "", name).strip().lower()
    return re.sub(r"[-\s]+", "_", clean)

def load_naming_guide() -> dict:
    guide = {}
    if os.path.exists(GUIDE_CSV):
        try:
            with open(GUIDE_CSV, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    card_name = row.get("Card Name", "").strip().lower()
                    filename = row.get("Recommended Image Filename", "").strip()
                    if card_name and filename:
                        guide[card_name] = filename
        except Exception as e:
            print(f"[Warning] Could not load naming guide: {e}")
    return guide

def find_existing_asset_file(card_name: str, bank: str, target_filename: str, all_files: list[str]) -> str | None:
    # 1. Exact base match
    base_name, _ = os.path.splitext(target_filename)
    for f in all_files:
        f_base, _ = os.path.splitext(f)
        if f_base.lower() == base_name.lower():
            return f

    # 2. Token overlap match
    card_tokens = set(re.findall(r"\w+", f"{bank} {card_name}".lower())) - {"bank", "card", "credit", "the", "and"}
    best_file = None
    best_score = 0

    for f in all_files:
        f_base, _ = os.path.splitext(f)
        file_tokens = set(re.findall(r"\w+", f_base.lower())) - {"bank", "card", "credit", "the", "and"}
        overlap = card_tokens.intersection(file_tokens)
        score = sum(len(t) for t in overlap)
        if score > best_score and len(overlap) >= min(2, len(card_tokens)):
            best_score = score
            best_file = f

    return best_file if best_score >= 6 else None

def extract_card_image_url(source_url: str) -> str | None:
    if not source_url or not source_url.startswith("http"):
        return None

    parsed = urlparse(source_url)
    slug = parsed.path.strip("/").split("/")[-1]

    # Strategy 1: Direct CDN WebP URL on cardcheck.in
    if "cardcheck.in" in parsed.netloc and slug:
        for suffix in ["", "-cc", "-credit-card"]:
            test_slug = f"{slug}{suffix}" if not slug.endswith(suffix) else slug
            direct_url = f"https://cardcheck.in/cards/{test_slug}.webp"
            try:
                head = requests.head(direct_url, headers=HEADERS, timeout=6)
                if head.status_code == 200 and "image" in head.headers.get("Content-Type", ""):
                    return direct_url
            except Exception:
                pass

    # Strategy 2: Page HTML parse
    try:
        res = requests.get(source_url, headers=HEADERS, timeout=12)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            for img in soup.find_all("img"):
                src = img.get("src") or img.get("data-src") or ""
                if "/cards/" in src:
                    if "_next/image" in src and "url=" in src:
                        matched = re.search(r"url=([^&]+)", src)
                        if matched:
                            raw_path = unquote(matched.group(1))
                            return f"https://cardcheck.in{raw_path}"
                    return f"https://cardcheck.in{src}" if src.startswith("/") else src

            og_img = soup.find("meta", property="og:image")
            if og_img and og_img.get("content"):
                return og_img["content"]
    except Exception:
        pass

    return None

def download_image(img_url: str, dest_path: str) -> bool:
    try:
        res = requests.get(img_url, headers=HEADERS, timeout=15)
        if res.status_code == 200 and len(res.content) > 500:
            with open(dest_path, "wb") as f:
                f.write(res.content)
            return True
    except Exception:
        pass
    return False

def main():
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    naming_guide = load_naming_guide()
    all_files = [f for f in os.listdir(OUTPUT_FOLDER) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]

    if not os.path.exists(CSV_INPUT):
        print(f"Error: {CSV_INPUT} not found.")
        return

    with open(CSV_INPUT, mode="r", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))

    fieldnames = list(reader[0].keys())
    for col in ["image_url", "local_image_file"]:
        if col not in fieldnames:
            fieldnames.append(col)

    total_cards = len(reader)
    mapped_count = 0

    print(f"-> Completing Card Image Mapping for {total_cards} cards...\n")

    for idx, row in enumerate(reader, start=1):
        card_name = row.get("card_name", "").strip()
        bank = row.get("bank", "").strip()
        source_url = row.get("source_url", "").strip()

        guide_filename = naming_guide.get(card_name.lower())
        target_filename = guide_filename or f"{sanitize_filename(card_name)}.webp"

        # Check existing match
        matched_file = find_existing_asset_file(card_name, bank, target_filename, all_files)

        if matched_file:
            row["local_image_file"] = matched_file
            row["image_url"] = f"/assets/cards/{matched_file}"
            mapped_count += 1
            print(f"[{idx}/{total_cards}] [MATCHED] {bank} - {card_name} -> {matched_file}")
            continue

        # Otherwise download
        img_url = extract_card_image_url(source_url)
        dest_path = os.path.join(OUTPUT_FOLDER, target_filename)
        if img_url and download_image(img_url, dest_path):
            all_files.append(target_filename)
            row["local_image_file"] = target_filename
            row["image_url"] = f"/assets/cards/{target_filename}"
            mapped_count += 1
            print(f"[{idx}/{total_cards}] [DOWNLOADED] {bank} - {card_name} -> {target_filename}")
        else:
            print(f"[{idx}/{total_cards}] [MISSING] {bank} - {card_name}")

    with open(CSV_INPUT, mode="w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(reader)

    print("\n" + "="*50)
    print(f"Successfully mapped {mapped_count}/{total_cards} card images to india_credit_cards.csv!")
    print(f"Updated CSV: {CSV_INPUT}")
    print("="*50)

if __name__ == "__main__":
    main()
