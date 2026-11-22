import os
import json
import numpy as np
from PIL import Image

def sample_particles(image_path, target_particles=32000, min_alpha=40):
    img = Image.open(image_path).convert("RGBA")
    
    # Crop to non-transparent bounding box first to maximize resolution
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    aspect = img.width / img.height
    target_h = 760
    target_w = int(target_h * aspect)
    img_resized = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    arr = np.array(img_resized)

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    a = arr[:, :, 3]
    brightness = (r.astype(np.float32) + g.astype(np.float32) + b.astype(np.float32)) / 3.0

    mask = (a > min_alpha) & (brightness > 12)
    ys, xs = np.where(mask)
    total = len(xs)
    print(f"[{image_path}] Valid foreground pixels: {total:,}")

    if total == 0:
        raise ValueError(f"No valid pixels in {image_path}")

    if total >= target_particles:
        indices = np.random.choice(total, size=target_particles, replace=False)
        xs = xs[indices]
        ys = ys[indices]
    else:
        extra = target_particles - total
        rand_idx = np.random.choice(total, size=extra, replace=True)
        xs = np.concatenate([xs, xs[rand_idx]])
        ys = np.concatenate([ys, ys[rand_idx]])

    center_x = target_w / 2.0
    center_y = target_h / 2.0

    # Normalize relative to target_h
    norm_x = ((xs - center_x) / float(target_h)).round(4).tolist()
    norm_y = ((ys - center_y) / float(target_h)).round(4).tolist()

    colors_r = arr[ys, xs, 0].tolist()
    colors_g = arr[ys, xs, 1].tolist()
    colors_b = arr[ys, xs, 2].tolist()

    return {
        "count": len(norm_x),
        "x": norm_x,
        "y": norm_y,
        "r": colors_r,
        "g": colors_g,
        "b": colors_b
    }

def render_preview(data, out_path, w=400, h=600):
    img = Image.new("RGB", (w, h), (2, 6, 18))
    arr = np.array(img)
    scale = h * 0.88
    cx = w * 0.5
    cy = h * 0.5

    for i in range(data["count"]):
        px = int(round(cx + data["x"][i] * scale))
        py = int(round(cy + data["y"][i] * scale))
        if 0 <= px < w and 0 <= py < h:
            arr[py, px] = [data["r"][i], data["g"][i], data["b"][i]]

    Image.fromarray(arr).save(out_path)
    print(f"Saved preview: {out_path}")

if __name__ == "__main__":
    iron_data = sample_particles("temp_pngs/iron_2.png", 32000)
    render_preview(iron_data, "temp_pngs/iron_preview.png")

    spider_data = sample_particles("temp_pngs/spider_man_PNG20.png", 32000)
    render_preview(spider_data, "temp_pngs/spider_preview.png")

    mecha_img = r"C:\Users\Chowdary\.gemini\antigravity\brain\0b34fd2c-f198-49f5-88ff-99cda27d0342\futuristic_mecha_robot_fullbody_1795368936757.jpg"
    mecha_data = sample_particles(mecha_img, 32000)
    render_preview(mecha_data, "temp_pngs/mecha_preview.png")
