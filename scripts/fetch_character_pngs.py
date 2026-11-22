import urllib.request
import re
import os
import json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def find_pngs(url, pattern):
    req = urllib.request.Request(url, headers=headers)
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
        matches = re.findall(pattern, html)
        return list(set(matches))
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return []

if __name__ == '__main__':
    req = urllib.request.Request('https://pngimg.com/images/heroes/ironman', headers=headers)
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
        matches = re.findall(r'/uploads/[^"\'\s>]+\.png', html)
        print("Found uploads:", len(matches), matches[:10])
    except Exception as e:
        print("Error:", e)
