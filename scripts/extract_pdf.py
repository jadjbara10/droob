"""
Extract transit route data from Jordan PDFs.
PDF format per row:
  Line: Route Name (اسم الخط)
  Line(s): Route Path (مسار الخط) - may span multiple lines
  Line: Fare + Vehicle Type (e.g., "550حافلة متوسطة")
  Line: Fare Unit ("فلس" or "دينار")
"""
import fitz
import os
import json
import re

PDF_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "root_storage")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "src")

# -------------- PDF text extraction --------------
def extract_page_texts(pdf_path):
    """Return list of per-page text strings."""
    doc = fitz.open(pdf_path)
    texts = [page.get_text() for page in doc]
    doc.close()
    return texts


# -------------- Parsing helpers --------------
def is_header_line(line):
    """Detect table header rows."""
    headers = ["اسم الخط", "مسار الخط", "التعرفة", "فئة المركبة", "وحدة التعرفة"]
    line_clean = line.strip()
    return any(h in line_clean for h in headers) or line_clean == ""


def is_fare_line(line):
    """Return (fare_float, vehicle_type_str) if line ends with 'NUMBERحافلة/صغيرة TYPE'."""
    m = re.search(r'(\d+\.?\d*)\s*(حافلة|صغيرة|باص|مركبة)\s*(عمومية|متوسطة|كبيرة|صغيرة)?', line)
    if m:
        fare = float(m.group(1))
        vtype = f"{m.group(2)} {m.group(3)}".strip() if m.group(3) else m.group(2)
        return (fare, vtype, m.start())
    return None


def is_unit_line(line):
    """Check if line is just a fare unit."""
    s = line.strip()
    return s in ["فلس", "دينار", "قرش"]


def extract_origin_dest(name):
    """Pull origin / destination from a route name string."""
    origin, destination = "", ""
    # Split on common delimiters
    if " - " in name:
        parts = name.split(" - ", 1)
    elif "/" in name:
        parts = name.split("/", 1)
    else:
        parts = [name]
    origin = parts[0].strip().strip(":").strip("-").strip("/")
    if len(parts) > 1:
        destination = parts[1].strip().strip(":").strip("-").strip("/")
    # Drop trailing numbers (fare appended to destination)
    destination = re.sub(r'\d+\.?\d*$', '', destination).strip()
    return origin, destination


# -------------- Main parser (state machine) --------------
def parse_governorate_pages(page_texts):
    """State machine that walks lines and groups 4-part rows."""
    rows = []
    lines = []
    for pt in page_texts:
        for raw_line in pt.split("\n"):
            line = raw_line.strip()
            if line:
                lines.append(line)

    idx = 0
    while idx < len(lines):
        line = lines[idx]

        # Skip headers
        if is_header_line(line):
            idx += 1
            continue

        # --- Try to match a complete row ---
        route_name = line
        path_parts = []
        fare = None
        vehicle_type = None
        fare_unit = "فلس"  # default

        # Check if current line already contains fare info at end
        fare_info = is_fare_line(route_name)
        if fare_info:
            fare, vehicle_type, pos = fare_info
            route_name = route_name[:pos].strip()
            # Next line might be unit
            if idx + 1 < len(lines) and is_unit_line(lines[idx + 1]):
                fare_unit = lines[idx + 1].strip()
                idx += 2
            else:
                idx += 1
            origin, dest = extract_origin_dest(route_name)
            rows.append({
                "governorate": "",  # filled later
                "route_name": route_name,
                "origin": origin,
                "destination": dest,
                "path": "",
                "fare": fare,
                "fare_unit": fare_unit,
                "vehicle_type": vehicle_type,
            })
            continue

        # Route name line — check next lines for path/fare
        idx += 1

        # Collect path lines (contain street keywords OR are continuation)
        while idx < len(lines):
            next_line = lines[idx]
            if is_header_line(next_line):
                break

            fare_info = is_fare_line(next_line)
            if fare_info:
                fare, vehicle_type, pos = fare_info
                # If fare is at end of this line, the prefix might be path
                prefix = next_line[:pos].strip()
                if prefix:
                    path_parts.append(prefix)
                idx += 1
                break

            # Check if next line is a unit line (then previous line should have had fare)
            if is_unit_line(next_line):
                # backtrack — the path itself might have ended with fare
                # Look at last path_part for fare
                if path_parts:
                    last = path_parts[-1]
                    fare_info2 = is_fare_line(last)
                    if fare_info2:
                        fare, vehicle_type, pos2 = fare_info2
                        path_parts[-1] = last[:pos2].strip()
                        fare_unit = next_line.strip()
                        idx += 1
                        break
                # If no fare found, treat unit line as noise and skip
                idx += 1
                break

            # Check if next line looks like a new route name (has / or - and short)
            if len(next_line) < 100 and ("/" in next_line or " - " in next_line):
                # Might be next route — but first check it's not a path continuation
                if not any(kw in next_line for kw in ["شارع", "دوار", "مجمع", "جسر"]):
                    break

            # Otherwise it's a path line
            path_parts.append(next_line)
            idx += 1
            if len(path_parts) > 5:  # safety
                break

        # Check if fare_unit on next line
        if idx < len(lines) and is_unit_line(lines[idx]):
            fare_unit = lines[idx].strip()
            idx += 1

        # Build result
        path_text = " ".join(p.strip() for p in path_parts if p.strip())
        origin, dest = extract_origin_dest(route_name)

        rows.append({
            "governorate": "",
            "route_name": route_name,
            "origin": origin,
            "destination": dest,
            "path": path_text,
            "fare": fare,
            "fare_unit": fare_unit,
            "vehicle_type": vehicle_type,
        })

    return rows


# -------------- Main --------------
def main():
    pdf_files = sorted([f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")])

    print(f"Found {len(pdf_files)} PDFs")
    all_routes = []

    for filename in pdf_files:
        path = os.path.join(PDF_DIR, filename)
        governorate = filename.replace(".pdf", "")
        print(f"  {filename} … ", end="", flush=True)
        pages = extract_page_texts(path)
        routes = parse_governorate_pages(pages)
        for r in routes:
            r["governorate"] = governorate
        all_routes.extend(routes)
        print(f"{len(routes)} routes")

    # Quality stats
    with_fare = [r for r in all_routes if r["fare"] is not None]
    with_path = [r for r in all_routes if r["path"]]
    with_dest = [r for r in all_routes if r["destination"]]
    print(f"\nTotal: {len(all_routes)}")
    print(f"  with fare: {len(with_fare)}")
    print(f"  with path: {len(with_path)}")
    print(f"  with destination: {len(with_dest)}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "pdf-extracted-routes.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_routes, f, ensure_ascii=False, indent=2)
    print(f"\nSaved → {out_path}")


if __name__ == "__main__":
    main()