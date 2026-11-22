#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
particle_wind.py -- Convert any image into high-density glowing particles
with real-time wind gusts, aura turbulence, and mouse dispersion physics.

Usage:
    python scripts/particle_wind.py
    python scripts/particle_wind.py "src/assets/human_avatar.jpg"
    python scripts/particle_wind.py --particles 60000

Controls:
    SPACE       Toggle wind on / off
    R           Reset particles back to home position
    G           Toggle glow / bloom
    B           Trigger cosmic particle burst
    Mouse Move  Disperse particles with wind blast
    ESC / Q     Quit
"""

import argparse
import math
import os
import sys
import time

import numpy as np
from PIL import Image
import pygame

def sample_image_particles(image_path, target_width=420, target_height=680, max_particles=65000):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")

    img = Image.open(image_path).convert("RGBA")
    
    # Calculate aspect ratio fit
    aspect = img.width / img.height
    if aspect > (target_width / target_height):
        w = target_width
        h = int(w / aspect)
    else:
        h = target_height
        w = int(h * aspect)

    img_resized = img.resize((w, h), Image.Resampling.LANCZOS)
    arr = np.array(img_resized)

    # Foreground condition: alpha > 30 and brightness > 25
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    a = arr[:, :, 3]
    brightness = (r.astype(np.float32) + g.astype(np.float32) + b.astype(np.float32)) / 3.0

    mask = (a > 30) & (brightness > 24)
    ys, xs = np.where(mask)

    total_valid = len(xs)
    if total_valid == 0:
        raise ValueError("No visible foreground pixels found in image.")

    # Downsample if exceeds max_particles
    if total_valid > max_particles:
        indices = np.random.choice(total_valid, size=max_particles, replace=False)
        xs = xs[indices]
        ys = ys[indices]

    # Center particles in window
    offset_x = (target_width - w) // 2
    offset_y = (target_height - h) // 2

    home_x = (xs + offset_x).astype(np.float32)
    home_y = (ys + offset_y).astype(np.float32)

    colors = arr[ys, xs, :3] # RGB

    return home_x, home_y, colors

def run_simulation(image_path="src/assets/humanoid_smart.jpg", max_particles=45000):
    pygame.init()
    
    win_w, win_h = 480, 720
    screen = pygame.display.set_mode((win_w, win_h), pygame.DOUBLEBUF)
    pygame.display.set_caption("J.A.R.V.I.S. // Python Particles Engine (Wind & Aura)")
    clock = pygame.time.Clock()

    print(f"[Engine] Ingesting visual asset: {image_path}")
    home_x, home_y, colors = sample_image_particles(image_path, target_width=win_w - 40, target_height=win_h - 60, max_particles=max_particles)
    n = len(home_x)
    print(f"[Engine] Initialized {n:,} dynamic particles.")

    # Particle physics state (NumPy arrays for 60+ FPS vectorized performance)
    pos_x = home_x.copy() + (np.random.rand(n).astype(np.float32) - 0.5) * 8.0
    pos_y = home_y.copy() + (np.random.rand(n).astype(np.float32) - 0.5) * 8.0
    vel_x = np.zeros(n, dtype=np.float32)
    vel_y = np.zeros(n, dtype=np.float32)

    # Particle phase offsets for asynchronous turbulence
    phases = np.random.rand(n).astype(np.float32) * (2.0 * np.pi)

    # Generate 1,800 surrounding energy aura particles
    n_aura = 2200
    aura_theta = np.random.rand(n_aura).astype(np.float32) * (2.0 * np.pi)
    aura_radii = 100.0 + np.random.rand(n_aura).astype(np.float32) * 140.0
    aura_y = np.random.rand(n_aura).astype(np.float32) * (win_h - 100) + 50.0
    aura_speeds = 1.0 + np.random.rand(n_aura).astype(np.float32) * 2.5
    aura_colors = np.zeros((n_aura, 3), dtype=np.uint8)
    # Cyan and gold energy colors
    aura_colors[:, 0] = np.random.choice([0, 56, 255], size=n_aura).astype(np.uint8)
    aura_colors[:, 1] = np.random.choice([210, 189, 215], size=n_aura).astype(np.uint8)
    aura_colors[:, 2] = np.random.choice([255, 248, 0], size=n_aura).astype(np.uint8)

    wind_active = True
    glow_active = True
    spring_k = 0.05
    damping = 0.88

    font = pygame.font.SysFont("Consolas", 13, bold=True)
    running = True
    start_time = time.time()

    # Pre-render surface for blitting
    canvas_surf = pygame.Surface((win_w, win_h))

    while running:
        dt = clock.tick(60) / 1000.0
        t = time.time() - start_time

        # Event handling
        mouse_pos = pygame.mouse.get_pos()
        mouse_pressed = pygame.mouse.get_pressed()[0]

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_ESCAPE, pygame.K_q):
                    running = False
                elif event.key == pygame.K_SPACE:
                    wind_active = not wind_active
                elif event.key == pygame.K_g:
                    glow_active = not glow_active
                elif event.key == pygame.K_r:
                    # Reset positions
                    pos_x[:] = home_x
                    pos_y[:] = home_y
                    vel_x[:] = 0
                    vel_y[:] = 0
                elif event.key == pygame.K_b:
                    # Burst
                    angles = np.random.rand(n).astype(np.float32) * 2.0 * np.pi
                    speeds = 18.0 + np.random.rand(n).astype(np.float32) * 30.0
                    vel_x += np.cos(angles) * speeds
                    vel_y += np.sin(angles) * speeds

        # ---------------------------------------------------------
        # VECTORIZED PHYSICS ENGINE
        # ---------------------------------------------------------
        # 1. Spring force towards image home
        dx = home_x - pos_x
        dy = home_y - pos_y
        vel_x += dx * spring_k
        vel_y += dy * spring_k

        # 2. Wind turbulence & gust
        gust_val = 0.0
        if wind_active:
            # Gust wave
            gust_wave = math.sin(t * 0.9)
            if gust_wave > 0.4:
                gust_val = (gust_wave - 0.4) * 0.12

            wind_x = math.sin(t * 1.8) * 0.65 + math.sin(t * 4.2) * 0.35 + gust_val * 4.0
            wind_y = -0.35 + math.cos(t * 1.4) * 0.25 # upward thermal aura float

            # Individual particle flutter
            flutter = np.sin(t * 3.5 + phases) * 0.45
            vel_x += wind_x + flutter
            vel_y += wind_y

        # 3. Mouse wind blast interaction
        mdx = pos_x - mouse_pos[0]
        mdy = pos_y - mouse_pos[1]
        dist_sq = mdx * mdx + mdy * mdy
        mouse_radius = 80.0
        mouse_mask = dist_sq < (mouse_radius * mouse_radius)
        if np.any(mouse_mask):
            dist = np.sqrt(dist_sq[mouse_mask]) + 0.001
            force = ((mouse_radius - dist) / mouse_radius) * (8.0 if mouse_pressed else 4.2)
            vel_x[mouse_mask] += (mdx[mouse_mask] / dist) * force
            vel_y[mouse_mask] += (mdy[mouse_mask] / dist) * force

        # 4. Integrate velocity & damping
        vel_x *= damping
        vel_y *= damping
        pos_x += vel_x
        pos_y += vel_y

        # 5. Update Aura Ribbon Particles
        aura_theta += aura_speeds * dt * 1.2
        aura_y -= (45.0 + np.sin(t * 2.0) * 20.0) * dt
        # Loop aura vertically
        wrap_mask = aura_y < 20.0
        aura_y[wrap_mask] = win_h - 40.0

        aura_px = (win_w / 2.0) + np.cos(aura_theta) * (aura_radii * (0.6 + 0.4 * (aura_y / win_h)))
        aura_py = aura_y

        # ---------------------------------------------------------
        # RENDERING (High-Speed Pixel Surface Manipulation)
        # ---------------------------------------------------------
        canvas_surf.fill((2, 6, 18))

        # Render Aura swirling ribbons
        int_ax = np.clip(aura_px.astype(np.int32), 0, win_w - 1)
        int_ay = np.clip(aura_py.astype(np.int32), 0, win_h - 1)
        for i in range(n_aura):
            c = aura_colors[i]
            canvas_surf.set_at((int_ax[i], int_ay[i]), (int(c[0]), int(c[1]), int(c[2])))

        # Render Human Core Particles
        int_px = np.clip(pos_x.astype(np.int32), 0, win_w - 1)
        int_py = np.clip(pos_y.astype(np.int32), 0, win_h - 1)

        # Pygame surface pixelarray for instantaneous multi-thousand particle write
        parr = pygame.PixelArray(canvas_surf)
        for i in range(n):
            c = colors[i]
            # Convert RGB to packed 32-bit color
            parr[int_px[i], int_py[i]] = (int(c[0]), int(c[1]), int(c[2]))
        del parr

        screen.blit(canvas_surf, (0, 0))

        # Top HUD Status Bar (like in Farhan's video)
        fps = int(clock.get_fps())
        wind_txt = "ON" if wind_active else "OFF"
        status_line = f"{fps} FPS | wind {wind_txt} | gust: {gust_val:.2f} | particles {n:,}"
        hud_surf = font.render(status_line, True, (0, 240, 255))
        hud_bg = pygame.Surface((hud_surf.get_width() + 10, hud_surf.get_height() + 4))
        hud_bg.fill((3, 10, 26))
        hud_bg.set_alpha(200)
        screen.blit(hud_bg, (10, 10))
        screen.blit(hud_surf, (15, 12))

        pygame.display.flip()

    pygame.quit()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="J.A.R.V.I.S. Python Particle Wind Engine")
    parser.add_argument("image", nargs="?", default="src/assets/humanoid_smart.jpg", help="Path to image file")
    parser.add_argument("--particles", type=int, default=45000, help="Max particle count (e.g. 50000)")
    args = parser.parse_args()

    run_simulation(args.image, max_particles=args.particles)
