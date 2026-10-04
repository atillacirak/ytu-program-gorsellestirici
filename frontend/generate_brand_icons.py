import os
import math
from PIL import Image, ImageDraw, ImageFont

public_dir = r'C:\Projeler\Ytü Görselleştir\frontend\public'

# --- 1. Generate favicon.svg with larger, bolder graduation cap ---
# 64x64 box, scaling Lucide icon (24x24) to scale 1.9 (45.6px) and translating to center
svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c3f79"/>
      <stop offset="100%" stop-color="#00306a"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#bgGrad)"/>
  <g transform="translate(8.5, 8.5) scale(1.95)" fill="none" stroke="#e7a240" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
    <path d="M22 10v6"/>
    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
  </g>
</svg>'''

with open(os.path.join(public_dir, 'favicon.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_content)
print("favicon.svg generated!")

# --- Helper: Draw Squircle Logo with Larger Graduation Cap ---
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

# --- 2. Generate PNG icons ---
icon_512 = draw_logo(512)
icon_512.save(os.path.join(public_dir, 'icon.png'), 'PNG')
print("icon.png (512x512) generated!")

icon_180 = draw_logo(180)
icon_180.save(os.path.join(public_dir, 'apple-touch-icon.png'), 'PNG')
print("apple-touch-icon.png (180x180) generated!")

icon_64 = draw_logo(64)
icon_64.save(os.path.join(public_dir, 'favicon.png'), 'PNG')
print("favicon.png (64x64) generated!")

# --- 3. Generate High-Res OpenGraph Preview Image (1200x630) ---
def generate_og_image():
    W, H = 1200, 630
    bg = Image.new('RGBA', (W, H), (7, 27, 52, 255)) # Rich dark navy background #071b34
    draw = ImageDraw.Draw(bg)
    
    # Subtle glowing circles/gradient accents in background
    for r in range(400, 0, -20):
        alpha = int(25 * (1 - r/400))
        draw.ellipse([W - 300 - r, H/2 - r, W - 300 + r, H/2 + r], fill=(12, 63, 121, alpha))
        
    # Place Logo (size 220x220)
    logo_img = draw_logo(220)
    bg.paste(logo_img, (100, (H - 220) // 2), logo_img)
    
    # Typography
    try:
        font_title = ImageFont.truetype("arial.ttf", 68)
        font_v2 = ImageFont.truetype("arialbd.ttf", 24)
        font_subtitle = ImageFont.truetype("arial.ttf", 34)
        font_pill = ImageFont.truetype("arialbd.ttf", 22)
    except:
        font_title = ImageFont.load_default()
        font_v2 = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_pill = ImageFont.load_default()
        
    text_x = 360
    title_y = 175
    
    # Title "YTÜ Dostun"
    draw.text((text_x, title_y), "YTÜ Dostun", fill=(255, 255, 255, 255), font=font_title)
    
    # Badge "v2"
    badge_x = text_x + 400
    draw.rounded_rectangle([(badge_x, title_y + 15), (badge_x + 55, title_y + 55)], radius=8, fill=(231, 162, 64, 40), outline=(231, 162, 64, 180), width=2)
    draw.text((badge_x + 14, title_y + 22), "v2", fill=(231, 162, 64, 255), font=font_v2)
    
    # Tagline
    draw.text((text_x, title_y + 90), "YTÜ'lülerin yeni nesil ders ve not yönetim portalı.", fill=(203, 213, 225, 255), font=font_subtitle)
    
    # Feature Pills
    pills = [
        ("📅 Haftalık Ders Çizelgesi", 220),
        ("🧮 AGNO & YANO Hesaplama", 230),
        ("⚡ Otomatik OBS Analizi", 210)
    ]
    
    px = text_x
    py = title_y + 185
    for text, pw in pills:
        draw.rounded_rectangle([(px, py), (px + pw, py + 48)], radius=12, fill=(12, 63, 121, 180), outline=(231, 162, 64, 100), width=1)
        draw.text((px + 16, py + 12), text, fill=(255, 255, 255, 240), font=font_pill)
        px += pw + 18
        
    bg.save(os.path.join(public_dir, 'og-image.png'), 'PNG')
    print("og-image.png (1200x630) generated!")

generate_og_image()
print("All resized logo icons and favicons generated successfully!")
