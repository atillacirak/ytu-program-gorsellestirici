import os
from PIL import Image, ImageDraw, ImageFont

public_dir = r'C:\Projeler\Ytü Görselleştir\frontend\public'

def draw_logo(size=512):
    scale = 4
    img_size = size * scale
    img = Image.new('RGBA', (img_size, img_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background squircle
    radius = int(img_size * 0.25)
    navy_top = (12, 63, 121, 255) # #0c3f79
    
    # Base rounded rect
    draw.rounded_rectangle(
        [(0, 0), (img_size - 1, img_size - 1)],
        radius=radius,
        fill=navy_top
    )
    
    # Gold color & line width (bold & crisp)
    gold = (231, 162, 64, 255) # #e7a240
    line_w = int(img_size * 0.065)
    
    cx, cy = img_size / 2, img_size / 2
    
    # Cap diamond: Enlarged to fill 76% of width
    top_p = (cx, cy - img_size * 0.25)
    right_p = (cx + img_size * 0.36, cy - img_size * 0.06)
    bottom_p = (cx, cy + img_size * 0.13)
    left_p = (cx - img_size * 0.36, cy - img_size * 0.06)
    
    # Draw rhombus cap
    draw.line([top_p, right_p, bottom_p, left_p, top_p], fill=gold, width=line_w, joint="round")
    
    # Draw tassel on the right side
    tassel_x = cx + img_size * 0.37
    tassel_y1 = cy - img_size * 0.06
    tassel_y2 = cy + img_size * 0.20
    draw.line([(tassel_x, tassel_y1), (tassel_x, tassel_y2)], fill=gold, width=line_w, joint="round")
    
    # Draw arc / curve under the cap (skullcap headband)
    p1_x, p1_y = cx - img_size * 0.24, cy + img_size * 0.04
    p2_x, p2_y = cx + img_size * 0.24, cy + img_size * 0.04
    
    steps = 40
    arc_points = []
    for i in range(steps + 1):
        t = i / steps
        ctrl_x, ctrl_y = cx, cy + img_size * 0.33
        x = (1-t)**2 * p1_x + 2*(1-t)*t * ctrl_x + t**2 * p2_x
        y = (1-t)**2 * p1_y + 2*(1-t)*t * ctrl_y + t**2 * p2_y
        arc_points.append((x, y))
        
    draw.line(arc_points, fill=gold, width=line_w, joint="round")
    
    # Resize down with Lanczos anti-aliasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

# Save PNG icons
draw_logo(512).save(os.path.join(public_dir, 'icon.png'), 'PNG')
draw_logo(180).save(os.path.join(public_dir, 'apple-touch-icon.png'), 'PNG')
draw_logo(64).save(os.path.join(public_dir, 'favicon.png'), 'PNG')

# --- Generate High-Res OpenGraph Preview Image (1200x630) ---
def generate_og_image():
    W, H = 1200, 630
    
    # Create background gradient from #0c3f79 (navy) to #001f4d (dark navy)
    bg = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    draw = ImageDraw.Draw(bg)
    
    for y in range(H):
        t = y / H
        r = int(12 * (1 - t) + 0 * t)
        g = int(63 * (1 - t) + 25 * t)
        b = int(121 * (1 - t) + 70 * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b, 255))
        
    # Subtle radial glow behind the logo
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    cx, cy = 200, H // 2
    for r in range(350, 0, -10):
        alpha = int(35 * (1 - r / 350))
        glow_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(231, 162, 64, alpha))
    
    bg = Image.alpha_composite(bg, glow)
    draw = ImageDraw.Draw(bg)
    
    # Gold accent frame on all 4 sides (top, bottom, left, right)
    draw.rectangle([(0, 0), (W, 6)], fill=(231, 162, 64, 255))
    draw.rectangle([(0, H - 6), (W, H)], fill=(231, 162, 64, 255))
    draw.rectangle([(0, 0), (6, H)], fill=(231, 162, 64, 255))
    draw.rectangle([(W - 6, 0), (W, H)], fill=(231, 162, 64, 255))

    # Place Logo (size 220x220)
    logo_size = 220
    logo_img = draw_logo(logo_size)
    logo_x = 90
    logo_y = (H - logo_size) // 2
    bg.paste(logo_img, (logo_x, logo_y), logo_img)

    # Fonts
    font_title = ImageFont.truetype("arialbd.ttf", 72)
    font_v2 = ImageFont.truetype("arialbd.ttf", 22)
    font_subtitle = ImageFont.truetype("arial.ttf", 32)
    font_pill = ImageFont.truetype("arialbd.ttf", 21)

    text_x = 350
    title_y = 165

    # Title "YTÜ Dostun"
    draw.text((text_x, title_y), "YTÜ Dostun", fill=(255, 255, 255, 255), font=font_title)

    # Version Badge "v2"
    title_bbox = font_title.getbbox("YTÜ Dostun")
    title_width = title_bbox[2] - title_bbox[0]
    
    badge_x = text_x + title_width + 25
    badge_y = title_y + 24
    draw.rounded_rectangle(
        [(badge_x, badge_y), (badge_x + 52, badge_y + 36)],
        radius=8,
        fill=(231, 162, 64, 40),
        outline=(231, 162, 64, 255),
        width=2
    )
    draw.text((badge_x + 14, badge_y + 6), "v2", fill=(231, 162, 64, 255), font=font_v2)

    # Subtitle
    sub_y = title_y + 95
    draw.text((text_x, sub_y), "YTÜ'lülerin yeni nesil ders ve not yönetim portalı.", fill=(203, 213, 225, 255), font=font_subtitle)

    # Feature Pills
    pills = [
        "Haftalık Ders Çizelgesi",
        "AGNO & YANO Hesaplama",
        "Ortak Boş Saatler"
    ]

    px = text_x
    py = sub_y + 80

    for item in pills:
        bbox = font_pill.getbbox(item)
        t_w = bbox[2] - bbox[0]
        pill_w = t_w + 36
        pill_h = 44
        
        # Pill Background (solid dark blue with gold border for high contrast)
        draw.rounded_rectangle(
            [(px, py), (px + pill_w, py + pill_h)],
            radius=12,
            fill=(5, 35, 75, 220),
            outline=(231, 162, 64, 200),
            width=2
        )
        draw.text((px + 18, py + 10), item, fill=(255, 255, 255, 255), font=font_pill)
        px += pill_w + 16

    bg.save(os.path.join(public_dir, 'og-image.png'), 'PNG')
    print("og-image.png generated successfully!")

generate_og_image()
