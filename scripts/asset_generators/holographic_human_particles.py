#!/usr/bin/env python3
"""
=============================================================================
J.A.R.V.I.S. // STARK BIOMETRIC HOLOGRAPHIC HUMAN PARTICLE ENGINE
=============================================================================
Architecture: Python Particles Technique for 3D Anatomical Point Cloud
Generates ~2,280 anatomical 3D points forming an athletic human silhouette,
simulates real-time Hooke's-law spring damping, harmonic respiration,
cardiac Arc pulse, laser plane elevation scans, and dynamic particle bursts.

Run directly in terminal:
    python scripts/holographic_human_particles.py
Options:
    python scripts/holographic_human_particles.py --export obj   (Exports human.obj)
    python scripts/holographic_human_particles.py --export json  (Exports human_particles.json)
    python scripts/holographic_human_particles.py --ascii        (Renders live terminal hologram)
=============================================================================
"""

import math
import random
import time
import json
import sys
import os

class Particle3D:
    def __init__(self, x, y, z, layer="body", color_type="cyan", base_size=1.8):
        # Resting anatomical anchor
        self.tx = float(x)
        self.ty = float(y)
        self.tz = float(z)

        # Current dynamic simulation coordinates (with initial quantum jitter)
        self.x = self.tx + (random.random() - 0.5) * 6.0
        self.y = self.ty + (random.random() - 0.5) * 6.0
        self.z = self.tz + (random.random() - 0.5) * 6.0

        # Velocities
        self.vx = (random.random() - 0.5) * 0.4
        self.vy = (random.random() - 0.5) * 0.4
        self.vz = (random.random() - 0.5) * 0.4

        self.layer = layer
        self.color_type = color_type
        self.base_size = base_size
        self.phase = random.random() * math.pi * 2
        self.speed = 0.8 + random.random() * 1.5

    def update_physics(self, t, is_cardiac_pulse=False, scan_y=0.0):
        # 1. Biological respiratory expansion
        breath = math.sin(t * 1.6)
        target_x = self.tx
        target_y = self.ty
        target_z = self.tz

        if self.layer in ("ribs", "sternum"):
            target_x *= (1.0 + breath * 0.04)
            target_z *= (1.0 + breath * 0.05)
        elif self.layer == "core" and is_cardiac_pulse:
            target_x *= 1.08
            target_z *= 1.10

        # 2. Hooke's Law Spring Force towards target anchor
        dx = target_x - self.x
        dy = target_y - self.y
        dz = target_z - self.z

        self.vx = self.vx * 0.88 + dx * 0.08
        self.vy = self.vy * 0.88 + dy * 0.08
        self.vz = self.vz * 0.88 + dz * 0.08

        # 3. Quantum floating jitter
        self.vx += math.sin(t * self.speed + self.phase) * 0.035
        self.vy += math.cos(t * self.speed + self.phase) * 0.035

        self.x += self.vx
        self.y += self.vy
        self.z += self.vz

    def burst(self, magnitude=28.0):
        """Flings particle outward along random 3D unit sphere."""
        theta = random.random() * math.pi * 2
        phi = math.acos(2.0 * random.random() - 1.0)
        speed = magnitude * (0.7 + random.random() * 0.6)
        self.vx = speed * math.sin(phi) * math.cos(theta)
        self.vy = speed * math.cos(phi)
        self.vz = speed * math.sin(phi) * math.sin(theta)


class HumanParticleSystem:
    def __init__(self):
        self.particles = []
        self._generate_anatomy()

    def _add_pt(self, x, y, z, layer, color_type="cyan", size=1.8):
        self.particles.append(Particle3D(x, y, z, layer, color_type, size))

    def _generate_anatomy(self):
        """Mathematically generates ~2,280 anatomical 3D points forming a human body."""
        # 1. Cranium & Face (Y: 82 to 108)
        for lat in range(-70, 81, 14):
            phi = math.radians(90 - lat)
            y_val = 94.0 + 13.0 * math.cos(phi)
            r_ring = 11.0 * math.sin(phi)
            count = max(6, int(r_ring * 1.8))
            for i in range(count):
                theta = (i / count) * math.pi * 2
                self._add_pt(r_ring * math.cos(theta), y_val, r_ring * 0.92 * math.sin(theta), "head", "cyan", 1.6)

        # Jaw & Chin taper
        for y in range(84, 95, 2):
            t = (y - 84) / 10.0
            r = 4.0 + 6.0 * t
            for a_idx in range(-7, 8, 2):
                a = (a_idx / 10.0) * math.pi
                self._add_pt(r * math.sin(a), y, 8.0 + 4.0 * math.cos(a), "head", "cyan", 1.5)

        # Optic Nodes (Eyes)
        self._add_pt(-4.2, 94.0, 11.0, "head", "white", 2.8)
        self._add_pt(4.2, 94.0, 11.0, "head", "white", 2.8)

        # Synaptic Neural Core (interior cranium cloud)
        for _ in range(70):
            theta = random.random() * math.pi * 2
            phi = math.acos(2.0 * random.random() - 1.0)
            r = (random.random() ** (1.0 / 3.0)) * 7.5
            x = r * math.sin(phi) * math.cos(theta)
            y = 95.0 + r * 0.85 * math.cos(phi)
            z = r * 0.80 * math.sin(phi) * math.sin(theta)
            self._add_pt(x, y, z, "brain", "synapse", 1.5)

        # 2. Cervical Spine & Neck (Y: 68 to 82)
        y = 70.0
        while y <= 82.0:
            for step in range(9):
                a = (step / 9.0) * math.pi * 2
                self._add_pt(5.2 * math.cos(a), y, 5.0 * math.sin(a), "neck", "cyan", 1.5)
            self._add_pt(0.0, y, -4.5, "spine", "white", 2.2)
            y += 2.5

        # 3. Clavicles & Shoulders (Y: 62 to 66)
        for x_step in range(-28, 29, 2):
            arch_y = 64.0 + math.sin((abs(x_step) / 28.0) * math.pi) * 1.5
            arch_z = math.cos((abs(x_step) / 28.0) * math.pi * 0.5) * 4.0
            self._add_pt(float(x_step), arch_y, arch_z, "clavicle", "white", 2.0)

        for s in (-1, 1):
            for step in range(11):
                a = (step / 11.0) * math.pi * 2
                for dy in (-3, -1, 1, 3):
                    self._add_pt(s * (28.0 + 4.0 * math.cos(a)), 62.0 + dy, 4.0 * math.sin(a), "shoulder", "cyan", 1.6)

        # 4. Thoracic Cage & Ribs (Y: 24 to 62)
        rib_levels = [60, 56, 52, 48, 44, 40, 36, 32, 28]
        for y_rib in rib_levels:
            prog = (y_rib - 24) / 38.0
            rx = 13.0 + 8.0 * math.sin(prog * math.pi)
            rz = 9.0 + 4.5 * math.sin(prog * math.pi)
            steps = 22
            for i in range(steps):
                th = (i / steps) * math.pi * 2
                self._add_pt(rx * math.cos(th), float(y_rib), rz * math.sin(th), "ribs", "cyan", 1.6)
            self._add_pt(0.0, float(y_rib), -rz * 0.9, "spine", "white", 2.2)
            self._add_pt(0.0, float(y_rib), rz * 0.95, "sternum", "white", 2.0)

        # 5. Arc Reactor / Cardiac Core (X: 0, Y: 46, Z: 6.5)
        for r_step in range(1, 7):
            r = float(r_step)
            cnt = int(r * 4.5)
            for i in range(cnt):
                th = (i / cnt) * math.pi * 2
                self._add_pt(r * math.cos(th), 46.0 + r * math.sin(th), 6.5, "core", "core", 2.2)
        self._add_pt(0.0, 46.0, 7.2, "core", "white", 3.6)

        # 6. Abdomen & Lumbar Spine (Y: 12 to 26)
        y = 14.0
        while y <= 26.0:
            t = (y - 12.0) / 14.0
            rx = 14.0 - 2.0 * math.sin(t * math.pi)
            rz = 9.5
            for i in range(18):
                th = (i / 18.0) * math.pi * 2
                self._add_pt(rx * math.cos(th), y, rz * math.sin(th), "abdomen", "cyan", 1.5)
            self._add_pt(0.0, y, -rz * 0.85, "spine", "white", 2.0)
            y += 3.0

        # 7. Pelvis & Hips (Y: 0 to 14)
        for y_pelvis in range(0, 13, 3):
            rx = 18.0 - y_pelvis * 0.2
            rz = 12.0
            for i in range(20):
                th = (i / 20.0) * math.pi * 2
                self._add_pt(rx * math.cos(th), float(y_pelvis), rz * math.sin(th), "pelvis", "cyan", 1.6)
        self._add_pt(0.0, 4.0, -9.0, "pelvis", "white", 2.2)

        # 8. Arms & Hands
        for s in (-1, 1):
            # Upper arm
            y_arm = 37.0
            while y_arm <= 60.0:
                arm_x = s * (29.0 + (60.0 - y_arm) * 0.12)
                for step in range(7):
                    a = (step / 7.0) * math.pi * 2
                    self._add_pt(arm_x + 4.0 * math.cos(a), y_arm, 4.0 * math.sin(a), "arm", "cyan", 1.5)
                y_arm += 2.5

            # Elbow
            for step in range(10):
                a = (step / 10.0) * math.pi * 2
                self._add_pt(s * 32.0 + 4.5 * math.cos(a), 35.0, 4.5 * math.sin(a), "arm", "white", 1.9)

            # Forearm
            y_fore = 11.0
            while y_fore <= 33.0:
                arm_x = s * (32.0 + (33.0 - y_fore) * 0.08)
                for step in range(7):
                    a = (step / 7.0) * math.pi * 2
                    self._add_pt(arm_x + 3.2 * math.cos(a), y_fore, 3.2 * math.sin(a), "arm", "cyan", 1.5)
                y_fore += 2.5

            # Wrist
            for step in range(9):
                a = (step / 9.0) * math.pi * 2
                self._add_pt(s * 34.0 + 3.0 * math.cos(a), 9.0, 3.0 * math.sin(a), "hand", "white", 1.8)

            # Hand palm
            for y_palm in range(1, 8, 2):
                for w_idx in (-2, 0, 2):
                    self._add_pt(s * (34.0 + w_idx * 0.7), float(y_palm), w_idx * 0.8, "hand", "cyan", 1.4)

            # 5 Fingers
            for f in range(5):
                fx = s * (32.2 + f * 1.0)
                fz = (f - 2) * 1.3
                for seg in (1, 2, 3):
                    fy = 0.0 - seg * 2.2
                    self._add_pt(fx, fy, fz, "hand", "white" if seg == 3 else "cyan", 1.7 if seg == 3 else 1.3)

        # 9. Legs & Feet
        for s in (-1, 1):
            hip_x = s * 10.0
            # Thigh
            y_thigh = -46.0
            while y_thigh <= 0.0:
                thigh_x = hip_x - s * (y_thigh / -48.0) * 1.5
                r = 6.2 - (abs(y_thigh) / 48.0) * 1.2
                for step in range(8):
                    a = (step / 8.0) * math.pi * 2
                    self._add_pt(thigh_x + r * math.cos(a), y_thigh, r * math.sin(a), "thigh", "cyan", 1.5)
                y_thigh += 2.8

            # Knee
            for step in range(12):
                a = (step / 12.0) * math.pi * 2
                self._add_pt(s * 8.5 + 4.8 * math.cos(a), -50.0, 4.8 * math.sin(a), "knee", "white", 1.9)
            self._add_pt(s * 8.5, -50.0, 5.8, "knee", "white", 2.6)

            # Shin
            y_shin = -94.0
            while y_shin <= -52.0:
                r = 4.8 - ((y_shin + 52.0) / -44.0) * 1.5
                for step in range(8):
                    a = (step / 8.0) * math.pi * 2
                    self._add_pt(s * 8.2 + r * math.cos(a), y_shin, r * math.sin(a), "shin", "cyan", 1.5)
                y_shin += 2.8

            # Ankle
            for step in range(10):
                a = (step / 10.0) * math.pi * 2
                self._add_pt(s * 8.0 + 3.4 * math.cos(a), -98.0, 3.4 * math.sin(a), "ankle", "white", 1.8)

            # Foot / Sole
            for z_step in range(-6, 15, 3):
                z = float(z_step)
                w = 3.5 if z > 8 else 2.8
                self._add_pt(s * 8.0 - w * 0.5, -108.0, z, "foot", "cyan", 1.5)
                self._add_pt(s * 8.0 + w * 0.5, -108.0, z, "foot", "cyan", 1.5)
                self._add_pt(s * 8.0, -108.0, z, "foot", "white", 1.7)

        # 10. Ground Radar Pedestal (Y: -110)
        for radius in (26.0, 42.0, 58.0):
            steps = int(radius * 1.5)
            for i in range(steps):
                th = (i / steps) * math.pi * 2
                self._add_pt(radius * math.cos(th), -110.0, radius * math.sin(th), "pedestal", "cyan", 1.3)

    def step(self, t):
        is_pulse = ((t * 1.25) % 1.0) < 0.22
        scan_y = math.sin(t * 1.1) * 114.0
        for p in self.particles:
            p.update_physics(t, is_pulse, scan_y)

    def burst_all(self):
        for p in self.particles:
            p.burst(magnitude=32.0)

    def export_obj(self, filename="human.obj"):
        """Exports vertices to wavefront .obj file format."""
        with open(filename, "w", encoding="utf-8") as f:
            f.write("# J.A.R.V.I.S. Biometric Human Particle Point Cloud\n")
            f.write(f"# Vertices count: {len(self.particles)}\n")
            for p in self.particles:
                f.write(f"v {p.tx:.4f} {p.ty:.4f} {p.tz:.4f}\n")
        print(f"[Export] Saved {len(self.particles)} vertices to {filename}")

    def export_json(self, filename="human_particles.json"):
        """Exports full particle point cloud metadata to JSON."""
        data = [{
            "x": round(p.tx, 2), "y": round(p.ty, 2), "z": round(p.tz, 2),
            "layer": p.layer, "color": p.color_type, "size": p.base_size
        } for p in self.particles]
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"[Export] Saved {len(self.particles)} particle descriptors to {filename}")

    def render_ascii_view(self, width=64, height=36, rot_y=0.5):
        """Renders 3D orthographic projection into terminal ASCII matrix."""
        grid = [[" " for _ in range(width)] for _ in range(height)]
        cos_y = math.cos(rot_y)
        sin_y = math.sin(rot_y)

        for p in self.particles:
            # 3D Rotate Y
            rx = p.x * cos_y - p.z * sin_y
            rz = p.z * cos_y + p.x * sin_y
            ry = p.y

            # Project to screen
            col = int(width / 2 + rx * (width / 95.0))
            row = int(height / 2 - ry * (height / 240.0))

            if 0 <= row < height and 0 <= col < width:
                if p.layer == "core":
                    char = "@"
                elif rz > 5:
                    char = "#"
                elif rz > -5:
                    char = "+"
                else:
                    char = "."
                grid[row][col] = char

        lines = ["".join(r) for r in grid]
        return "\n".join(lines)


def main():
    system = HumanParticleSystem()
    print("=" * 65)
    print("  J.A.R.V.I.S. // STARK BIOMETRIC HOLOGRAPHIC HUMAN PARTICLES")
    print("=" * 65)
    print(f"Total Anatomical Particles: {len(system.particles):,}")

    if "--export" in sys.argv:
        idx = sys.argv.index("--export")
        fmt = sys.argv[idx + 1].lower() if idx + 1 < len(sys.argv) else "json"
        if fmt == "obj":
            system.export_obj("human.obj")
        else:
            system.export_json("human_particles.json")
        return

    if "--ascii" in sys.argv or len(sys.argv) == 1:
        print("\nRendering 3D Holographic ASCII Projection (Frontal 3/4 View):\n")
        ascii_frame = system.render_ascii_view(width=68, height=34, rot_y=0.45)
        print(ascii_frame)
        print("-" * 65)
        print("  Legend: '@' Arc Reactor  '#' Foreground  '+' Mid  '.' Background")
        print("=" * 65)

if __name__ == "__main__":
    main()
