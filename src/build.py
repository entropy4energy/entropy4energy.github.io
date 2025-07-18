import argparse
import functools
import json
from datetime import date
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

HEADERS = [
    "home",
    "publications",
    "team",
    "news",
    "jobs",
    "workshops",
]

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
            return f'{begin.strftime("%b %d, %Y")} &ndash; {end.strftime("%b %d, %Y")}'
        elif begin.month != end.month:
            return f'{begin.strftime("%b %d")} &ndash; {end.strftime("%b %d, %Y")}'
        else:
            return f'{begin.strftime("%b %d")} &ndash; {end.strftime("%d, %Y")}'
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
            elif arxiv := pub.get("arxiv"):
                pub["url"] = f'<a href="https://arxiv.org/{arxiv}" target="_blank">ArXiV</a>'
            elif url := pub.get("url"):
                pub["url"] = f'<a href="{url}" target="_blank">publication</a>'

            if filename := pub.get("filename"):
                pdf_file = file_base / f"{filename}.pdf"
                img_file = file_base / f"{filename}.png"
                if img_file.exists():
                    pub["imgfile"] = filename
                if not pdf_file.exists():
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
            "positions": ["Highschool Student"],
            "title": "Highschool Students",
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

    # Discard empty groups
    data["team"] = {key: [grp for grp in item if grp["members"]]
                    for key, item in team.items()}


def process_news(data: dict[str, Any]):
    for news_item in data["news"]:
        news_item["date"] = format_date(news_item["date"])


def process_workshops(data: dict[str, Any]):
    for workshop in data["workshops"]:
        workshop_date = [date(*d) for d in workshop["date"]]
        workshop["date"] = format_date(workshop_date)
        workshop_dir = Path(BASE_PATH, "media", "workshops", workshop["id"])
        workshop["has_flyer"] = (workshop_dir / "flyer.png").exists()
        for session in workshop["sessions"]:
            if isinstance(session["presenter"], str):
                session["presenter"] = [session["presenter"]]
            elif not isinstance(session["presenter"], list):
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


PROCESS_DATA = {
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
    return parser


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
        "section": section,
    }
    data["news"] = json.loads((DATA_DIR / "news.json").read_text())
    process_news(data)
    section_data_file = DATA_DIR / f"{section}.json"
    if section != "news" and section_data_file.exists():
        data[section] = json.loads(section_data_file.read_text())
    for extra in extra_data:
        extra_file = extra if extra.endswith(".json") else f"{extra}.json"
        extra_section = extra.removesuffix(".json")
        data[extra_section] = json.loads(Path(DATA_DIR / extra_file).read_text())
    if section in PROCESS_DATA:
        PROCESS_DATA[section](data)

    loader = FileSystemLoader(TEMPLATE_DIR)
    env = Environment(loader=loader)
    template = env.get_template(f"{section}.html")
    return template.render(data=data)


if __name__ == "__main__":
    parser = arg_parser()
    args, _ = parser.parse_known_args()
    print(build_html(args.section, extra_data=args.extra_data))
