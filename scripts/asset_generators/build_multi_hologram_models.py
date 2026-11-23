import os
import json
import numpy as np
from PIL import Image

def sample_particles(image_path, target_particles=32000, min_alpha=30):
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

    mask = (a > min_alpha) & (brightness > 10)
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

def main():
    target_count = 32000

    # 1. Read existing models from current preset to keep spiderman and mecha and navi
    curr_preset_path = "src/assets/human_particles_preset.js"
    with open(curr_preset_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Extract json string
    prefix = "window.NAVI_HOLOGRAM_MODELS = "
    suffix = ";\nwindow.NAVI_HUMAN_PARTICLE_DATA"
    start_idx = content.find(prefix) + len(prefix)
    end_idx = content.find(suffix)
    existing_models = json.loads(content[start_idx:end_idx])
    
    navi_model = existing_models.get("ultron", existing_models.get("navi", {}))
    navi_model["name"] = "Ultron"
    navi_model["tag"] = "ULTRON TACTICAL MATRIX"
    spiderman_model = existing_models["spiderman"]
    mecha_model = existing_models["mecha"]

    # 2. Sample Optimus Prime from user reference
    p_opt = r"C:/Users/Chowdary/.gemini/antigravity/brain/0b34fd2c-f198-49f5-88ff-99cda27d0342/.user_uploaded/media_1795371462795_1253446c.png"
    print("[1/2] Sampling Optimus Prime from reference image...")
    opt_raw = sample_particles(p_opt, target_particles=target_count)
    optimus_model = {
        "name": "Optimus Prime",
        "tag": "AUTOBOT COMMANDER MATRIX",
        "color": "red_blue",
        **opt_raw
    }

    # 3. Sample Bumblebee from user reference
    p_bee = r"C:/Users/Chowdary/.gemini/antigravity/brain/0b34fd2c-f198-49f5-88ff-99cda27d0342/.user_uploaded/media_1795371514572_cd72ab89.png"
    print("[2/2] Sampling Bumblebee from reference image...")
    bee_raw = sample_particles(p_bee, target_particles=target_count)
    bumblebee_model = {
        "name": "Bumblebee",
        "tag": "CYBERTRONIAN SCOUT MATRIX",
        "color": "yellow",
        **bee_raw
    }

    # Bundle all models (first model is Ultron)
    models_bundle = {
        "ultron": navi_model,
        "navi": navi_model,
        "optimus": optimus_model,
        "bumblebee": bumblebee_model,
        "spiderman": spiderman_model,
        "mecha": mecha_model
    }

    dest_js = "src/assets/human_particles_preset.js"
    js_content = f"window.NAVI_HOLOGRAM_MODELS = {json.dumps(models_bundle)};\n"
    js_content += "window.NAVI_HUMAN_PARTICLE_DATA = window.NAVI_HOLOGRAM_MODELS.ultron || window.NAVI_HOLOGRAM_MODELS.navi;\n"

    with open(dest_js, "w", encoding="utf-8") as f:
        f.write(js_content)
    print(f"[Done] Replaced Iron Man with Optimus Prime & added Bumblebee! Total models: {list(models_bundle.keys())}")

if __name__ == "__main__":
    main()
