import urllib.request
import re
import os
from PIL import Image

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def get_page_pngs(url):
    req = urllib.request.Request(url, headers=headers)
    html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
    matches = re.findall(r'/uploads/[a-zA-Z0-9_]+/[a-zA-Z0-9_]+\.png', html)
    # Filter out "small"
    full_pngs = [m for m in matches if '/small/' not in m]
    return list(set(full_pngs))

def download_and_check(base_url, rel_path, dest_name):
    full_url = f"https://pngimg.com{rel_path}"
    print(f"Downloading {full_url} -> {dest_name}")
    req = urllib.request.Request(full_url, headers=headers)
    with urllib.request.urlopen(req) as resp, open(dest_name, 'wb') as f:
        f.write(resp.read())
    img = Image.open(dest_name)
    print(f"Downloaded {dest_name}: size={img.size}, aspect={img.height/img.width:.2f}")
    return img.size

if __name__ == '__main__':
    iron_pngs = get_page_pngs('https://pngimg.com/images/heroes/ironman')
    print("Iron man total:", len(iron_pngs))
    
    spider_pngs = get_page_pngs('https://pngimg.com/images/heroes/spider_man')
    print("Spider man total:", len(spider_pngs))
    
    # Download first few to find the best full-body vertical renders
    os.makedirs('temp_pngs', exist_ok=True)
    for i, path in enumerate(iron_pngs[:6]):
        try:
            download_and_check('https://pngimg.com', path, f'temp_pngs/iron_{i}.png')
        except Exception as e:
            print("Failed:", e)
            
    for i, path in enumerate(spider_pngs[:6]):
        try:
            download_and_check('https://pngimg.com', path, f'temp_pngs/spider_{i}.png')
        except Exception as e:
            print("Failed:", e)
