import argparse
import functools
import hashlib
import json
import re
from datetime import date
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

HEADERS = [
    "home",
    "research",
    "publications",
    "team",
    "news",
    "teaching",
    "workshops",
    "tools",
    "jobs",
]

# Nav labels that differ from title case (product acronyms).
LABELS = {
    "chaos": "CHAOS",
    "loop": "LOOP",
    "tools": "Data and Tools",
}

# Nav entries that leave the static site (apps served alongside it).
EXTERNAL_LINKS: dict[str, str] = {}

BASE_PATH = Path(__file__).parent
DATA_DIR = BASE_PATH / "data"
TEMPLATE_DIR = BASE_PATH / "templates"


def format_date(input_date: date | list[date] | list[list[int]] | list[int]) -> str:
    date_range: list[date] = []
    bad_type = False
    if isinstance(input_date, date):
        date_range = [input_date]
    elif isinstance(input_date, list):
        if all(isinstance(d, int) for d in input_date) and len(input_date) == 3:
            date_range = [date(*input_date)]
        elif all(isinstance(d, date) for d in input_date):
            date_range = input_date.copy()
        elif (
            all(isinstance(d, list) for d in input_date)
            and all(isinstance(i, int) for d in input_date for i in d)
            and all(len(d) == 3 for d in input_date)
        ):
            date_range = [date(*d) for d in input_date]
        else:
            bad_type = True
    else:
        bad_type = True
    if bad_type:
        raise TypeError(f"Input dates have incorrect type or length. {input_date=}")
    if len(date_range) == 2:
        begin, end = date_range
        if begin.year != end.year:
            return f'{begin.strftime("%b %d, %Y")} &ndash;{end.strftime("%b %d, %Y")}'
        elif begin.month != end.month:
            return f'{begin.strftime("%b %d")} &ndash;{end.strftime("%b %d, %Y")}'
        else:
            return f'{begin.strftime("%b %d")}&ndash;{end.strftime("%d, %Y")}'
    else:
        return date_range[0].strftime("%b %d, %Y")


def process_home(data: dict[str, Any]):
    for slide in data["home"]["slides"]:
        slide["date"] = format_date(slide["date"])
    # Slideshow indicators cannot accommodate more than 8 slides
    # for small display sizes
    nslides_max = 8
    img_base = BASE_PATH / "media" / "publications"
    slides = []
    for pub in data["publications"]["journal"]:
        if "doi" in pub:
            pub["url"] = f"https://doi.org/{pub['doi']}"
        elif "arxiv" in pub:
            pub["url"] = f"https://arxiv.org/{pub['arxiv']}"
        elif "url" not in pub:
            continue

        if "filename" not in pub:
            continue
        img_file = img_base / f"{pub['filename']}.png"
        if not img_file.exists():
            continue

        slide = {
            "img": f"media/publications/{pub['filename']}.png",
            "text": pub["title"],
            "url": pub["url"],
        }
        slides.append(slide)
        if len(slides) == nslides_max:
            break
    data["slideshow_publications"] = slides


def process_jobs(data: dict[str, Any]):
    for job in data["jobs"]:
        job["open"] = format_date(job["open"])
        if close := job.get("close"):
            job["close"] = format_date(close)


def process_publications(data: dict[str, Any]):
    pubs = {
        "book": {
        },
        "journal": {
        },
    }
    file_base = BASE_PATH / "media" / "publications"
    for typ in pubs.keys():
        npubs = len(data["publications"][typ])
        for p, pub in enumerate(data["publications"][typ]):
            pub["number"] = npubs - p

            if len(pub["authors"]) == 1:
                authors = pub["author"][0]
            elif len(pub["authors"]) == 2:
                authors = " and ".join(pub["authors"])
            else:
                authors = ", ".join(pub["authors"][:-1]) + ", and " + pub["authors"][-1]
            pub["authors"] = authors

            if status := pub.get("status"):
                if status == "press":
                    pub["status"] = "in press"
                elif status == "published":
                    pub["status"] = ""

            if "url" in pub: pub["link"] = str(pub["url"])   #make a copy as "link" since url is overwritten here
            if doi := pub.get("doi"):
                pub["url"] = f'<a href="https://doi.org/{doi}" target="_blank">DOI:{doi}</a>'
                #closed-access papers have no PDF in media/publications (only open-access
                #PDFs and arXiv preprints are hosted), so the snapshot links to the DOI
                pub.setdefault("link", f"https://doi.org/{doi}")
            elif arxiv := pub.get("arxiv"):
                pub["url"] = f'<a href="https://arxiv.org/{arxiv}" target="_blank">ArXiV</a>'
            elif url := pub.get("url"):
                pub["url"] = f'<a href="{url}" target="_blank">publication</a>'

            if filename := pub.get("filename"):
                pdf_file = file_base / f"{filename}.pdf"
                img_file = file_base / f"{filename}.png"
                if img_file.exists():
                    pub["imgfile"] = filename
                pub["pdf_label"] = "PDF"
                if not pdf_file.exists():
                    #only open-access PDFs are hosted; a closed paper may still have its
                    #arXiv preprint (the author's version), which is linked as "preprint"
                    arxiv = pub.get("arxiv")
                    if arxiv and (file_base / f"{arxiv}.pdf").exists():
                        pub["filename"] = arxiv
                        pub["pdf_label"] = "preprint"
                    else:
                        del pub["filename"]

            year = pub["year"]
            if year not in pubs[typ].keys():
                pubs[typ][year] = [pub]
            else:
                pubs[typ][year].append(pub)
    data["publications"] = pubs


def process_team(data: dict[str, Any]):
    def sort_members(a, b):
        if a["id"] == "corey_oses":
            return 1
        if b["id"] == "corey_oses":
            return -1
        if a.get("rank", 0) != b.get("rank", 0):
            return 1 if a.get("rank", 0) < b.get("rank", 0) else -1
        lname_a=a["name"].split()[-1]
        lname_b=b["name"].split()[-1]
        if lname_a != lname_b:
            return 1 if lname_a < lname_b else -1
        return 0

    groups = [
        {
            "positions": ["Professor", "Assistant Professor"],
            "title": "",
        },
        {
            "positions": ["Research Scientist"],
            "title": "Research Scientists",
        },
        {
            "positions": ["Postdoctoral Associate"],
            "title": "Postdocs",
        },
        {
            "positions": ["Graduate Student", "Master Student"],
            "title": "Graduate Students",
        },
        {
            "positions": ["Undergraduate Student"],
            "title": "Undergraduate Students",
        },
        {
            "positions": ["High School Researcher", "Highschool Student"],
            "title": "High School Researchers",
        },
        {
            "positions": ["Summer Researcher", "Visiting Researcher", "Visiting Student"],
            "title": "Summer and Visiting Researchers",
        },
    ]

    socials = [
        {
            "base": "https://scholar.google.com/citations?user=",
            "icon": '<i class="ai ai-google-scholar-square ai-2x ai-inverse"></i>',
            "key": "gscholar",
        },
        {
            "base": "https://orcid.org/",
            "icon": '<i class="ai ai-orcid-square ai-2x ai-inverse"></i>',
            "key": "orcid",
        },
    ]

    # Assign team members to their groups
    team = {
        "alumni": [],
        "current": [],
    }
    for key in team.keys():
        team[key] = [{"title": grp["title"], "members": []} for grp in groups]
        # Catch-all group if no title fits
        team[key].append({"title": "Affiliates", "members": []})

    for member_id, member in data["team"].items():
        member["id"] = member_id
        member_socials = []
        if "socials" in member:
            for social in socials:
                key = social["key"]
                if key in member["socials"]:
                    member_socials.append({
                        "href": f"{social['base']}{member['socials'][key]}",
                        "icon": social["icon"],
                    })
        member["socials"] = member_socials

        key = "alumni" if member.get("alumn") else "current"
        g = 0
        for group in groups:
            p = 0
            for position in group["positions"]:
                if position in member["titles"]:
                    member["rank"] = p  # for sorting
                    team[key][g]["members"].append(member)
                    break
                p += 1
            if p < len(group["positions"]):
                break
            g += 1
        if g == len(groups):
            team[key][-1]["members"].append(member)

    for groups in team.values():
        for group in groups:
            group["members"] = sorted(group["members"],
                                      key=functools.cmp_to_key(sort_members),
                                      reverse=True)

    # Alumni: one flat list, most recent departure first (then latest start,
    # then last name), so the people who just left sit at the top.
    def alumni_key(member):
        years = re.findall(r"\d{4}", str(member.get("years", "")))
        end = int(years[-1]) if years else 0
        start = int(years[0]) if years else 0
        return (end, start, -ord(member["name"].split()[-1][0].lower()))

    flat = [m for group in team["alumni"] for m in group["members"]]

    # Discard empty groups
    data["team"] = {key: [grp for grp in item if grp["members"]]
                    for key, item in team.items()}
    data["team"]["alumni_flat"] = sorted(flat, key=alumni_key, reverse=True)


NEWS_CATEGORIES = [
    ("welcome", re.compile(r"welcome", re.I)),
    ("award", re.compile(r"\b(wins?|award|named|honored|fellow)", re.I)),
    ("workshop", re.compile(r"\b(workshop|school)\b", re.I)),
    ("talk", re.compile(r"\b(presents?|interview|seminar|speaker|symposium)", re.I)),
]


def news_category(title: str) -> str:
    """Coarse category badge for a news item, derived from its title."""
    for name, pattern in NEWS_CATEGORIES:
        if pattern.search(title):
            return name
    return "news"


def process_news(data: dict[str, Any]):
    by_year: dict[int, list[dict[str, Any]]] = {}
    for index, news_item in enumerate(data["news"], start=1):
        raw = news_item["date"]
        item_date = date(*raw) if isinstance(raw, list) and isinstance(raw[0], int) else None
        news_item["index"] = index
        news_item["year"] = item_date.year if item_date else None
        news_item["date_short"] = item_date.strftime("%b %d").replace(" 0", " ") if item_date else ""
        news_item["date"] = format_date(raw)
        news_item["category"] = news_category(news_item["title"])
        by_year.setdefault(news_item["year"], []).append(news_item)
    years = sorted((y for y in by_year if y is not None), reverse=True)
    data["news_years"] = years
    data["news_by_year"] = [(y, by_year[y]) for y in years]
    # Years before this cutoff are collapsed on the News page.
    data["news_archive_before"] = years[0] - 2 if years else 0
    press_file = DATA_DIR / "press.json"
    if press_file.exists():
        data["press"] = json.loads(press_file.read_text())
        for item in data["press"]:
            item["date"] = format_date(item["date"])


def process_workshops(data: dict[str, Any]):
    for workshop in data["workshops"]:
        workshop_date = [date(*d) for d in workshop["date"]]
        workshop["date"] = format_date(workshop_date)
        workshop_dir = Path(BASE_PATH, "media", "workshops", workshop["id"])
        workshop["has_flyer"] = (workshop_dir / "flyer.png").exists()
        for session in workshop["sessions"]:
            presenter = session.get("presenter", [])
            if isinstance(presenter, str):
                session["presenter"] = [presenter]
            elif isinstance(presenter, list):
                session["presenter"] = presenter
            else:
                raise TypeError("Presenter must be str or list.")
            if materials := session.get("materials"):
                if materials.startswith("http"):
                    materials_type = "url"
                else:
                    materials_type = "collab"
                session["materials"] = {
                    "link": materials,
                    "type": materials_type,
                }
        # Registration and Resources entries are notes about the event, not
        # talks: they leave the session list. Registration is shown only
        # while the event is still ahead.
        end = workshop_date[-1]
        workshop["upcoming"] = end >= date.today()
        extras = [s for s in workshop["sessions"] if s["title"] in ("Registration", "Resources", "Links")]
        workshop["sessions"] = [s for s in workshop["sessions"] if s not in extras]
        workshop["extras"] = [s for s in extras if s["title"] != "Registration" or workshop["upcoming"]]
        workshop["n_recordings"] = sum(1 for s in workshop["sessions"] if s.get("youtube_id"))
        workshop["n_materials"] = sum(1 for s in workshop["sessions"] if s.get("materials"))
        plain = re.sub(r"<[^>]+>", "", workshop["description"]).replace("\n", " ")
        first = re.split(r"(?<=[.!?])\s+", plain.strip(), maxsplit=1)[0]
        workshop["summary"] = first


CHAOS_SET_LABELS = {
    1: "Unaries", 2: "Binaries", 3: "Ternaries", 4: "Quaternaries",
    5: "Quinaries", 6: "Senaries", 7: "Septenaries", 8: "Octonaries",
}


def process_chaos(data: dict[str, Any]):
    """Turn the flat file list into table rows: label, name, snapshot date."""
    rows = []
    for name in data["chaos"]["files"]:
        m = re.match(r"(\d+)_(\w+?)_(\d{4})-(\d{2})-(\d{2})\.", name)
        if m:
            order = int(m.group(1))
            label = CHAOS_SET_LABELS.get(order, m.group(2).title())
            snapshot = date(int(m.group(3)), int(m.group(4)), int(m.group(5))).strftime("%b %d, %Y")
        else:
            label = "Checksums" if "checksum" in name else name
            snapshot = ""
        rows.append({"label": label, "name": name, "date": snapshot})
    data["chaos"]["file_rows"] = rows


PROCESS_DATA = {
    "chaos": process_chaos,
    "home": process_home,
    "jobs": process_jobs,
    "publications": process_publications,
    "team": process_team,
    "workshops": process_workshops,
}


def arg_parser() -> argparse.ArgumentParser:
    """Parse command line arguments.

    Returns:
    --------
    parser: argparse.ArgumentParser
        The argument parser object
    """
    parser = argparse.ArgumentParser(
        prog="build",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "section",
        type=str.lower,
        help="The section to build.",
    )
    parser.add_argument(
        "-e",
        "--extra_data",
        nargs="*",
        default=[],
    )
    parser.add_argument(
        "--root",
        default="",
        help="URL prefix for links in the shell (partials only), e.g. https://s4e.ai/",
    )
    parser.add_argument(
        "--outdir",
        default="dist/partials",
        help="Where the partials are written (partials only).",
    )
    return parser


def asset_version() -> str:
    """Short content hash of the stylesheet and scripts, used as a
    cache-busting query string on their URLs."""
    h = hashlib.sha1()
    for path in sorted((BASE_PATH / "css").glob("*.scss")) + sorted((BASE_PATH / "js").glob("*.js")):
        h.update(path.read_bytes())
    return h.hexdigest()[:10]


def build_html(section: str = "", extra_data: list = []) -> str:
    """Create a rendered HTML file.

    Parameters:
    -----------
    section: str
        The section/HTML name.
    extra_data: list
        Extra json files to be read in.

    Returns:
    --------
    str
        The rendered HTML file string.
    """
    section = section.removesuffix(".html")

    data = {
        "headers": HEADERS,
        "labels": {h: LABELS.get(h, h.title()) for h in HEADERS},
        "external_links": EXTERNAL_LINKS,
        "section": section,
        "asset_version": asset_version(),
        "root": "",
    }
    data["news"] = json.loads((DATA_DIR / "news.json").read_text())
    process_news(data)
    # Data and Tools: the family of products (CHAOS, LOOP, ...). Loaded on
    # every page so product pages can show the family sub-nav and light the
    # parent tab. Absent on main until the products are published.
    tools_file = DATA_DIR / "tools.json"
    data["tools"] = json.loads(tools_file.read_text()) if tools_file.exists() else None
    section_data_file = DATA_DIR / f"{section}.json"
    if section != "news" and section_data_file.exists():
        data[section] = json.loads(section_data_file.read_text())
    for extra in extra_data:
        extra_file = extra if extra.endswith(".json") else f"{extra}.json"
        extra_section = extra.removesuffix(".json")
        data[extra_section] = json.loads(Path(DATA_DIR / extra_file).read_text())
    if section in PROCESS_DATA:
        PROCESS_DATA[section](data)
    # A product page (CHAOS, LOOP) declares "product" in its data file:
    # name, full_name, optional subnav [{label, href}] and contributors
    # [{name, years}]. base.html uses it for the hero, sub-nav and footer.
    data["product"] = (data.get(section) or {}).get("product") if isinstance(data.get(section), dict) else None
    # Which top-level tab is lit: a product page lights its family tab.
    data["parent"] = "tools" if data["tools"] and any(
        p.get("id") == section for p in data["tools"].get("products", [])) else section

    loader = FileSystemLoader(TEMPLATE_DIR)
    env = Environment(loader=loader)
    template = env.get_template(f"{section}.html")
    return template.render(data=data)


# Shell fragments shared with LOOP (Peter's Django app at s4e.ai/loop).
# LOOP fetches https://s4e.ai/partials/<name>.html at request time, so the
# header, nav, sidebar and footer are rendered once, here, and never copied.
# Links carry an absolute root because the fragments are served under a
# different path.
PARTIALS = ["head", "header", "nav", "subnav", "sidebar", "footer"]
# Fragments that differ per product (hero line, footer contributors).
PRODUCT_PARTIALS = ["header", "footer"]


def build_partials(root: str, outdir: Path) -> list[Path]:
    """Write the shell fragments to outdir and return the files written."""
    data = {
        "headers": HEADERS,
        "labels": {h: LABELS.get(h, h.title()) for h in HEADERS},
        "external_links": EXTERNAL_LINKS,
        "section": "",
        "parent": "",
        "asset_version": asset_version(),
        "root": root,
        "product": None,
    }
    data["news"] = json.loads((DATA_DIR / "news.json").read_text())
    process_news(data)
    tools_file = DATA_DIR / "tools.json"
    data["tools"] = json.loads(tools_file.read_text()) if tools_file.exists() else None

    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    outdir.mkdir(parents=True, exist_ok=True)
    written = []

    def write(name: str, filename: str):
        html = env.get_template(f"partials/{name}.html").render(data=data)
        html = "\n".join(line for line in html.splitlines() if line.strip()) + "\n"
        path = outdir / filename
        path.write_text(html)
        written.append(path)

    for name in PARTIALS:
        write(name, f"{name}.html")
    # One header and footer per product: "product" comes from tools.json,
    # contributors from the product's own data file when it exists.
    for item in (data["tools"] or {}).get("products", []):
        product = {"name": item["name"], "full_name": item.get("full_name")}
        product_file = DATA_DIR / f"{item['id']}.json"
        if product_file.exists():
            extra = json.loads(product_file.read_text()).get("product", {})
            product["contributors"] = extra.get("contributors", [])
        data["product"] = product
        for name in PRODUCT_PARTIALS:
            write(name, f"{name}-{item['id']}.html")
        data["product"] = None
    return written


if __name__ == "__main__":
    parser = arg_parser()
    args, _ = parser.parse_known_args()
    if args.section == "partials":
        for path in build_partials(args.root, Path(args.outdir)):
            print(path)
    else:
        print(build_html(args.section, extra_data=args.extra_data))
