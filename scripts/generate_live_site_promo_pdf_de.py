from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
OUTPUT = DOCS / "energy-travel-live-promo-de.pdf"

PAGE_W = 1240
PAGE_H = 1754
MARGIN = 70
TEXT = "#111827"
MUTED = "#4b5563"
ACCENT = "#e11d48"
CARD = "#f8fafc"

FONT_TITLE = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 48)
FONT_H2 = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 30)
FONT_BODY = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 22)


def fit_image(path: Path, width: int, height: int) -> Image.Image:
    img = Image.open(path).convert("RGB")
    ratio = min(width / img.width, height / img.height)
    resized = img.resize((int(img.width * ratio), int(img.height * ratio)))
    canvas = Image.new("RGB", (width, height), "white")
    offset = ((width - resized.width) // 2, (height - resized.height) // 2)
    canvas.paste(resized, offset)
    return canvas


def wrapped(draw, text, font, x, y, max_width, fill, gap=10):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        box = draw.textbbox((0, 0), candidate, font=font)
        if box[2] - box[0] <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        box = draw.textbbox((x, y), line, font=font)
        y += (box[3] - box[1]) + gap
    return y


def make_page(title: str, subtitle: str, image_name: str, note: str) -> Image.Image:
    page = Image.new("RGB", (PAGE_W, PAGE_H), "white")
    draw = ImageDraw.Draw(page)

    draw.text((MARGIN, 55), title, font=FONT_TITLE, fill=TEXT)
    y = wrapped(draw, subtitle, FONT_BODY, MARGIN, 120, PAGE_W - 2 * MARGIN, MUTED, 10)

    shot = fit_image(DOCS / image_name, PAGE_W - 2 * MARGIN, 1180)
    top = y + 30
    page.paste(shot, (MARGIN, top))

    draw.rounded_rectangle((MARGIN, top + 1210, PAGE_W - MARGIN, top + 1445), 28, fill=CARD)
    draw.text((MARGIN + 25, top + 1240), "Was man hier sieht", font=FONT_H2, fill=TEXT)
    wrapped(draw, note, FONT_BODY, MARGIN + 25, top + 1295, PAGE_W - 2 * MARGIN - 50, MUTED, 10)

    draw.text((MARGIN, PAGE_H - 70), "Live-Screenshots von https://bus-booking-app-xi.vercel.app/de", font=FONT_BODY, fill=ACCENT)
    return page


def main():
    pages = [
        make_page(
            "Energy Travel: Live-Prasentation",
            "Diese PDF basiert direkt auf Screenshots der live erreichbaren Website und zeigt den tatsachlichen visuellen Eindruck der Plattform.",
            "promo-home-de.png",
            "Die Startseite prasentiert das Projekt mit starkem Hero-Bereich, klaren Einstiegen, markanter Bildsprache und direktem Zugang zu Reisen und Programmen.",
        ),
        make_page(
            "Angebote im Uberblick",
            "Die Listenansicht zeigt, wie Reisen oder Programme fur Besucher dargestellt werden: kompakt, bildstark und sofort buchbar.",
            "promo-travels-de.png",
            "Auf dieser Seite werden verfugbare Angebote gesammelt angezeigt. Nutzer konnen schnell vergleichen und in die Detailansicht wechseln.",
        ),
        make_page(
            "Detailseite eines Angebots",
            "Die Detailansicht kombiniert Bild, Beschreibung, organisatorische Angaben und den Einstieg in den Buchungsfluss.",
            "promo-detail-de.png",
            "Hier sieht man die konkrete Prasentation eines einzelnen Angebots. Von hier startet der Nutzer direkt in die Sitzplatzwahl und Reservierung.",
        ),
        make_page(
            "Login und Fortsetzung des Prozesses",
            "Die Plattform verbindet Offentlichkeit und Buchung: Besucher konnen erst entdecken und spater sicher in den Login- oder Zahlungsprozess wechseln.",
            "promo-login-de.png",
            "Die Login-Seite ist bewusst klar gehalten und bietet einen schnellen Einstieg per Google oder Magic Link.",
        ),
    ]

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
