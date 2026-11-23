import os
import sys
import json
import numpy as np
from PIL import Image

def sample_particles(image_path, target_particles=30000):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Missing: {image_path}")

    img = Image.open(image_path).convert("RGBA")
    aspect = img.width / img.height
    target_h = 720
    target_w = int(target_h * aspect)
    img_resized = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    arr = np.array(img_resized)

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    a = arr[:, :, 3]
    brightness = (r.astype(np.float32) + g.astype(np.float32) + b.astype(np.float32)) / 3.0

    # Mask foreground from pure black background
    mask = (a > 25) & (brightness > 22)
    ys, xs = np.where(mask)
    total = len(xs)
    print(f"[{image_path}] Found {total} valid foreground pixels")

    if total == 0:
        raise ValueError("No foreground pixels")

    if total > target_particles:
        indices = np.random.choice(total, size=target_particles, replace=False)
        xs = xs[indices]
        ys = ys[indices]
    elif total < target_particles:
        extra_needed = target_particles - total
        rand_idx = np.random.choice(total, size=extra_needed, replace=True)
        xs = np.concatenate([xs, xs[rand_idx]])
        ys = np.concatenate([ys, ys[rand_idx]])

    center_x = target_w / 2.0
    center_y = target_h / 2.0

    # Normalize to -0.5 .. 0.5 relative to height
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

if __name__ == "__main__":
    test_path = r"C:\Users\Chowdary\.gemini\antigravity\brain\0b34fd2c-f198-49f5-88ff-99cda27d0342\futuristic_mecha_robot_fullbody_1795368936757.jpg"
    data = sample_particles(test_path, 30000)
    print(f"Sampled {data['count']} particles successfully.")
