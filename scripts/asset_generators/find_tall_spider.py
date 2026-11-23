import urllib.request
import re
import os
from PIL import Image

headers = {'User-Agent': 'Mozilla/5.0'}

req = urllib.request.Request('https://pngimg.com/images/heroes/spider_man', headers=headers)
html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
matches = list(set([m for m in re.findall(r'/uploads/[a-zA-Z0-9_]+/[a-zA-Z0-9_]+\.png', html) if '/small/' not in m]))

print(f"Total spider matches: {len(matches)}")
tall_spiders = []

for m in matches:
    url = f"https://pngimg.com{m}"
    try:
        # Just download header or first 100kb, or full if needed
        local_path = os.path.join('temp_pngs', os.path.basename(m))
        if not os.path.exists(local_path):
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as resp, open(local_path, 'wb') as f:
                f.write(resp.read())
        im = Image.open(local_path)
        aspect = im.height / im.width
        if aspect >= 1.7:
            print(f"Found tall standing spider: {m}, size={im.size}, aspect={aspect:.2f}")
            tall_spiders.append((local_path, aspect, im.size))
            if len(tall_spiders) >= 3:
                break
    except Exception as e:
        pass
