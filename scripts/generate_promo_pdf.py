from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs"
OUT_DIR.mkdir(exist_ok=True)
OUTPUT = OUT_DIR / "energy-travel-promo-de.pdf"

PAGE_W = 1240
PAGE_H = 1754
MARGIN = 90
TEXT_COLOR = "#171717"
MUTED = "#525252"
ACCENT = "#e11d48"
CARD_BG = "#f8fafc"

FONT_REG = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 30)
FONT_SMALL = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 24)
FONT_TITLE = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 60)
FONT_H2 = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 40)
FONT_H3 = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 30)


def fit_image(path: Path, width: int, height: int) -> Image.Image:
    img = Image.open(path).convert("RGB")
    ratio = min(width / img.width, height / img.height)
    resized = img.resize((int(img.width * ratio), int(img.height * ratio)))
    canvas = Image.new("RGB", (width, height), "white")
    offset = ((width - resized.width) // 2, (height - resized.height) // 2)
    canvas.paste(resized, offset)
    return canvas


def draw_wrapped(draw: ImageDraw.ImageDraw, text: str, font, x: int, y: int, width: int, fill: str, line_gap: int = 12):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        bbox = draw.textbbox((x, y), line, font=font)
        y += (bbox[3] - bbox[1]) + line_gap
    return y


def add_title(draw, title: str, subtitle: str):
    draw.text((MARGIN, 80), title, font=FONT_TITLE, fill=TEXT_COLOR)
    return draw_wrapped(draw, subtitle, FONT_REG, MARGIN, 170, PAGE_W - 2 * MARGIN, MUTED, 14)


def page_one() -> Image.Image:
    page = Image.new("RGB", (PAGE_W, PAGE_H), "white")
    draw = ImageDraw.Draw(page)

    hero = fit_image(ROOT / "public" / "images" / "hero.jpg", PAGE_W - 2 * MARGIN, 560)
    page.paste(hero, (MARGIN, 90))

    logo = fit_image(ROOT / "public" / "logo.png", 120, 120)
    page.paste(logo, (MARGIN, 690))

    draw.text((MARGIN + 145, 705), "Energy Travel", font=FONT_TITLE, fill=TEXT_COLOR)
    draw.text((MARGIN, 800), "Mehrsprachige Buchungsplattform für Reisen und Programme", font=FONT_H2, fill=TEXT_COLOR)

    intro = (
        "Energy Travel ist eine moderne Website für die Vermarktung, Verwaltung und Buchung "
        "von Gruppenreisen und Programmen. Die Plattform verbindet eine attraktive öffentliche "
        "Präsentation mit einem klaren Reservierungsprozess, Sitzplatzwahl, Nutzerprofilen, "
        "mehrsprachigen Inhalten und einem Dashboard für das interne Management."
    )
    y = draw_wrapped(draw, intro, FONT_REG, MARGIN, 875, PAGE_W - 2 * MARGIN, MUTED, 14)

    draw.rounded_rectangle((MARGIN, y + 20, PAGE_W - MARGIN, y + 280), 28, fill=CARD_BG)
    draw.text((MARGIN + 30, y + 50), "Warum ist die Plattform interessant?", font=FONT_H3, fill=TEXT_COLOR)
    bullets = [
        "Klarer Buchungsfluss von der Auswahl bis zur Zahlung",
        "Unterstützung für Reisen und Programme auf derselben Plattform",
        "Sitzplatz-Layouts für Busse oder individuelle Veranstaltungen",
        "Geeignet für internationale Zielgruppen dank Mehrsprachigkeit",
    ]
    by = y + 105
    for bullet in bullets:
        draw.text((MARGIN + 35, by), f"- {bullet}", font=FONT_REG, fill=MUTED)
        by += 48

    return page


def page_two() -> Image.Image:
    page = Image.new("RGB", (PAGE_W, PAGE_H), "white")
    draw = ImageDraw.Draw(page)
    y = add_title(
        draw,
        "Zentrale Funktionen",
        "Die Website ist nicht nur ein einfacher Katalog, sondern eine komplette Buchungs- und Verwaltungsumgebung.",
    )

    left_x = MARGIN
    right_x = PAGE_W // 2 + 20
    box_w = PAGE_W // 2 - MARGIN - 35
    box_h = 260

    cards = [
        ("Öffentliche Präsentation", "Angebote werden visuell ansprechend mit Bild, Beschreibung, Preis und Termin dargestellt."),
        ("Sitzplatzwahl", "Nutzer können verfügbare Sitzplätze sehen, auswählen und für mehrere Personen reservieren."),
        ("Reservierungsstatus", "Reservierungen werden sauber durch Zustände wie gehalten, zahlungsbereit und bezahlt geführt."),
        ("Interne Verwaltung", "Dashboard für Reisen, Programme, Sitzpläne, Übersetzungen, Reservierungen und Auswertungen."),
    ]

    positions = [
        (left_x, y + 30),
        (right_x, y + 30),
        (left_x, y + 330),
        (right_x, y + 330),
    ]

    for (title, body), (x, cy) in zip(cards, positions):
        draw.rounded_rectangle((x, cy, x + box_w, cy + box_h), 28, fill=CARD_BG)
        draw.text((x + 28, cy + 28), title, font=FONT_H3, fill=TEXT_COLOR)
        draw_wrapped(draw, body, FONT_REG, x + 28, cy + 82, box_w - 56, MUTED, 12)

    travel = fit_image(ROOT / "public" / "images" / "travel.jpg", PAGE_W - 2 * MARGIN, 420)
    page.paste(travel, (MARGIN, 1220))
    draw.rounded_rectangle((MARGIN, 1560, PAGE_W - MARGIN, 1660), 24, fill="#fff1f2")
    draw.text((MARGIN + 28, 1588), "Ideal für Veranstalter, Gruppenreisen, Busunternehmen und Community-Projekte.", font=FONT_H3, fill=ACCENT)
    return page


def page_three() -> Image.Image:
    page = Image.new("RGB", (PAGE_W, PAGE_H), "white")
    draw = ImageDraw.Draw(page)
    y = add_title(
        draw,
        "Wie die Plattform genutzt wird",
        "Der Ablauf ist so gestaltet, dass Interessenten schnell verstehen, buchen und später ihre Reservierung weiterführen können.",
    )

    steps = [
        ("1. Angebot entdecken", "Der Besucher sieht Reisen oder Programme auf der Startseite und in den Listenansichten."),
        ("2. Details prüfen", "Jedes Angebot zeigt Beschreibung, Zeitpunkt, Preis und relevante organisatorische Informationen."),
        ("3. Sitzplatz auswählen", "Der Nutzer sieht das vorbereitete Sitzlayout und erkennt freie, gesperrte oder belegte Plätze."),
        ("4. Buchung fortsetzen", "Nach der Auswahl werden Passagier- oder Teilnehmerdaten erfasst und die Zahlung vorbereitet."),
        ("5. Nachverfolgung", "Im Bereich 'Meine Buchungen' kann der Nutzer offene und abgeschlossene Reservierungen jederzeit wiederfinden."),
    ]

    sy = y + 40
    for title, body in steps:
        draw.rounded_rectangle((MARGIN, sy, PAGE_W - MARGIN, sy + 170), 26, fill=CARD_BG)
        draw.text((MARGIN + 28, sy + 24), title, font=FONT_H3, fill=TEXT_COLOR)
        draw_wrapped(draw, body, FONT_REG, MARGIN + 28, sy + 72, PAGE_W - 2 * MARGIN - 56, MUTED, 12)
        sy += 195

    footer = (
        "Kurz gesagt: Energy Travel ist eine flexible Buchungswebsite, die gleichzeitig verkaufsstark, "
        "mehrsprachig und administrativ gut kontrollierbar ist. Sie eignet sich sowohl für klassische "
        "Reiseangebote als auch für Programme, Events oder besondere Gruppenformate."
    )
    draw.rounded_rectangle((MARGIN, 1310, PAGE_W - MARGIN, 1575), 30, fill="#18181b")
    draw.text((MARGIN + 30, 1350), "Empfehlung", font=FONT_H2, fill="white")
    draw_wrapped(draw, footer, FONT_REG, MARGIN + 30, 1420, PAGE_W - 2 * MARGIN - 60, "#e4e4e7", 14)

    draw.text((MARGIN, 1640), "Kontakt und Demo auf Anfrage verfugbar.", font=FONT_SMALL, fill=MUTED)
    return page


def main():
    pages = [page_one(), page_two(), page_three()]
    pages[0].save(
        OUTPUT,
        "PDF",
        resolution=150.0,
        save_all=True,
        append_images=pages[1:],
    )
    print(OUTPUT)


if __name__ == "__main__":
    main()
