from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math
import random

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "video" / "frames"
OUT.mkdir(parents=True, exist_ok=True)

W, H, FPS, SECONDS = 1080, 1920, 24, 8
INK = "#101116"
CREAM = "#F4EFE3"
ORANGE = "#F26A2E"
YELLOW = "#FFD84D"
MINT = "#78DFA7"
LILAC = "#E7D8FF"
BLUE = "#635BFF"
PINK = "#FF78D1"

FONT_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_SERIF = "/System/Library/Fonts/Supplemental/Georgia Bold Italic.ttf"
FONT_MONO = "/System/Library/Fonts/SFNSMono.ttf"

def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.truetype(FONT_BOLD, size)

F_HUGE = font(FONT_BLACK, 218)
F_BIG = font(FONT_BLACK, 122)
F_MED = font(FONT_BLACK, 78)
F_CARD = font(FONT_BLACK, 54)
F_SERIF_BIG = font(FONT_SERIF, 116)
F_SMALL = font(FONT_BOLD, 32)
F_TINY = font(FONT_MONO, 22)

def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))

def ease_out(v):
    v = clamp(v)
    return 1 - (1 - v) ** 3

def ease_back(v):
    v = clamp(v)
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (v - 1) ** 3 + c1 * (v - 1) ** 2

def ease_in_out(v):
    v = clamp(v)
    return -(math.cos(math.pi * v) - 1) / 2

def centered(draw, text, y, fnt, fill, stroke=0, stroke_fill=None):
    box = draw.textbbox((0, 0), text, font=fnt, stroke_width=stroke)
    x = (W - (box[2] - box[0])) / 2
    draw.text((x, y), text, font=fnt, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)

def rounded(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def pop_text(canvas, text, y, fnt, fill, progress, rotation=0):
    progress = ease_back(progress)
    if progress <= 0:
        return
    box = fnt.getbbox(text)
    tw, th = box[2] - box[0], box[3] - box[1]
    layer = Image.new("RGBA", (tw + 80, th + 90), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.text((40, 30 - box[1]), text, font=fnt, fill=fill)
    scale = max(.02, progress)
    layer = layer.resize((max(1, int(layer.width * scale)), max(1, int(layer.height * scale))), Image.Resampling.LANCZOS)
    if rotation:
        layer = layer.rotate(rotation * (1 - clamp(progress)), expand=True, resample=Image.Resampling.BICUBIC)
    canvas.alpha_composite(layer, (int((W - layer.width) / 2), int(y + (1 - clamp(progress)) * 80)))

def draw_scribble(draw, cx, cy, radius, progress, color=INK, width=10):
    pts = []
    count = 80
    visible = int(count * clamp(progress))
    for i in range(visible):
        a = i / (count - 1) * math.pi * 2.1
        wobble = math.sin(i * 1.7) * 5
        r = radius + wobble
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r * .72))
    if len(pts) > 1:
        draw.line(pts, fill=color, width=width, joint="curve")

hero = Image.open(ROOT / "src/assets/pg-hub/pg-hub-motion-hero.png").convert("RGB")
hero_scale = 1540 / hero.height
hero_large = hero.resize((int(hero.width * hero_scale), 1540), Image.Resampling.LANCZOS)
hero_crop = hero_large.crop((450, 0, 1530, 1540))

logo = Image.open(ROOT / "src/assets/pg-hub/pg-hub-logo.png").convert("RGBA")

for frame in range(FPS * SECONDS):
    t = frame / FPS
    canvas = Image.new("RGBA", (W, H), CREAM)
    d = ImageDraw.Draw(canvas)

    # Beat 1 — hand-drawn brand reveal
    if t < 1.65:
        d.rectangle((0, 0, W, H), fill=CREAM)
        p = ease_out(t / 1.1)
        draw_scribble(d, 540, 850, 410, p, ORANGE, 16)
        d.ellipse((70, 190, 230, 350), fill=PINK, outline=INK, width=7)
        d.ellipse((840, 1400, 1090, 1650), fill=MINT, outline=INK, width=7)
        d.rounded_rectangle((770, 240, 1010, 480), radius=55, fill=YELLOW, outline=INK, width=7)
        pop_text(canvas, "PG", 590, F_HUGE, INK, (t - .12) / .48, -7)
        pop_text(canvas, "HUB", 830, F_HUGE, BLUE, (t - .42) / .48, 6)
        if t > .75:
            centered(d, "YOUR WHOLE PROPERTY. ONE PLACE.", 1190, F_TINY, INK)
        reveal = clamp((t - 1.15) / .5)
        if reveal:
            y = int(H * (1 - ease_in_out(reveal)))
            d.rectangle((0, y, W, H), fill=ORANGE)

    # Beat 2 — illustrated PG owner reveal
    elif t < 3.75:
        local = t - 1.65
        d.rectangle((0, 0, W, H), fill=ORANGE)
        zoom = 1.08 - .08 * ease_out(local / 1.8)
        im = hero_crop.resize((int(W * zoom), int(1540 * zoom)), Image.Resampling.LANCZOS)
        x = int((W - im.width) / 2 + math.sin(local * 2.2) * 8)
        y = int(205 - (im.height - 1540) / 2)
        canvas.alpha_composite(im.convert("RGBA"), (x, y))
        d.rectangle((0, 0, W, 205), fill=CREAM)
        d.rectangle((0, 1695, W, H), fill=CREAM)
        p1 = ease_back((local - .18) / .55)
        if p1 > 0:
            w = int(900 * min(1, p1))
            rounded(d, (70, 75, 70 + w, 175), 50, INK)
            if p1 > .75:
                centered(d, "RUN YOUR PG. WITHOUT THE RUNAROUND.", 106, F_SMALL, CREAM)
        if local > .8:
            badge_y = int(1575 + (1 - ease_back((local - .8) / .5)) * 120)
            rounded(d, (650, badge_y, 1010, badge_y + 90), 45, YELLOW, INK, 6)
            d.text((720, badge_y + 24), "PG SORTED", font=F_SMALL, fill=INK)
        draw_scribble(d, 915, 390, 92, (local - .3) / .9, CREAM, 9)

    # Beat 3 — operational wins
    elif t < 5.8:
        local = t - 3.75
        d.rectangle((0, 0, W, H), fill=YELLOW)
        centered(d, "THE DAILY WINS", 145, F_TINY, INK)
        centered(d, "ALL IN", 230, F_BIG, INK)
        centered(d, "ONE HUB.", 350, F_SERIF_BIG, BLUE)
        cards = [
            ("R", "RENT PAID", "RS. 1,84,200", MINT, -3),
            ("B", "BEDS FULL", "92% OCCUPIED", LILAC, 2),
            ("+", "REPORTS CLEAR", "+12% THIS MONTH", ORANGE, -2),
        ]
        for i, (icon, title, value, color, rot) in enumerate(cards):
            p = ease_back((local - .25 - i * .22) / .55)
            if p <= 0:
                continue
            card = Image.new("RGBA", (890, 300), (0, 0, 0, 0))
            cd = ImageDraw.Draw(card)
            rounded(cd, (10, 10, 870, 280), 48, color, INK, 7)
            cd.ellipse((55, 65, 205, 215), fill=CREAM, outline=INK, width=5)
            cd.text((105, 99), icon, font=F_MED, fill=INK, anchor="mm")
            cd.text((245, 65), title, font=F_SMALL, fill=INK)
            cd.text((245, 126), value, font=F_CARD, fill=INK)
            card = card.rotate(rot, expand=True, resample=Image.Resampling.BICUBIC)
            yy = int(620 + i * 345 + (1 - p) * 250)
            canvas.alpha_composite(card, (int((W - card.width) / 2), yy))

    # Beat 4 — kinetic payoff and CTA
    else:
        local = t - 5.8
        bg = CREAM if local < 1.2 else ORANGE
        d.rectangle((0, 0, W, H), fill=bg)
        if local < 1.2:
            pop_text(canvas, "LESS", 470, F_BIG, INK, local / .4, -3)
            pop_text(canvas, "CHASING.", 610, F_BIG, INK, (local - .18) / .45, 2)
            pop_text(canvas, "MORE", 860, F_SERIF_BIG, BLUE, (local - .42) / .45, -2)
            pop_text(canvas, "GROWING.", 1000, F_SERIF_BIG, ORANGE, (local - .6) / .45, 3)
            draw_scribble(d, 535, 1290, 310, (local - .45) / .7, PINK, 14)
        else:
            enter = ease_out((local - 1.2) / .35)
            logo_size = int(84 * enter)
            if logo_size > 0:
                gap = int(14 * enter)
                mark_w = logo_size * 2 + gap
                mark_x = (W - mark_w) // 2
                mark_y = 300
                for dx, dy, color in [(0, 0, BLUE), (logo_size + gap, 0, YELLOW), (0, logo_size + gap, MINT), (logo_size + gap, logo_size + gap, PINK)]:
                    rounded(d, (mark_x + dx, mark_y + dy, mark_x + dx + logo_size, mark_y + dy + logo_size), int(20 * enter), color, INK, max(1, int(5 * enter)))
            pop_text(canvas, "PG HUB", 565, F_BIG, INK, (local - 1.3) / .4)
            centered(d, "RUN THE PROPERTY. GROW THE BUSINESS.", 765, F_TINY, INK)
            btn_p = ease_back((local - 1.52) / .42)
            if btn_p > 0:
                bw = int(760 * min(1, btn_p))
                x1 = (W - bw) // 2
                rounded(d, (x1, 900, x1 + bw, 1030), 65, YELLOW, INK, 7)
                if btn_p > .75:
                    centered(d, "START 7 DAYS FREE  →", 940, F_SMALL, INK)
            centered(d, "pgmanager.app", 1110, F_TINY, INK)
            draw_scribble(d, 540, 780, 430, (local - 1.35) / .75, CREAM, 12)
            d.ellipse((70, 1490, 270, 1690), fill=MINT, outline=INK, width=7)
            d.ellipse((810, 1430, 1090, 1710), fill=LILAC, outline=INK, width=7)

    # Light handmade paper grain, deterministic per frame.
    random.seed(frame // 2)
    grain = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grain)
    for _ in range(260):
        x, y = random.randrange(W), random.randrange(H)
        a = random.randrange(4, 13)
        gd.point((x, y), fill=(12, 12, 12, a))
    canvas = Image.alpha_composite(canvas, grain).convert("RGB")
    canvas.save(OUT / f"frame-{frame:04d}.jpg", quality=91, optimize=True)

print(f"Generated {FPS * SECONDS} frames in {OUT}")
