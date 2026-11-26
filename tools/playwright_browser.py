import asyncio
import os
import sys
from aiohttp import web
from playwright.async_api import async_playwright

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5006
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROFILE_DIR = os.path.join(PROJECT_ROOT, "data", "browser_profile")


class PlaywrightController:
    def __init__(self):
        self._pw = None
        self._context = None
        self._pages = []
        self._active_idx = 0
        self._lock = asyncio.Lock()

    async def ensure_browser(self):
        if self._context is not None:
            # Prune closed pages
            self._pages = [p for p in self._pages if not p.is_closed()]
            if self._pages:
                self._active_idx = min(self._active_idx, len(self._pages) - 1)
                return

        os.makedirs(PROFILE_DIR, exist_ok=True)
        if self._pw is None:
            self._pw = await async_playwright().start()
        if self._context is None:
            self._context = await self._pw.chromium.launch_persistent_context(
                user_data_dir=PROFILE_DIR,
                headless=False,
                viewport={"width": 1280, "height": 800},
            )
        self._pages = [p for p in self._context.pages if not p.is_closed()]
        if not self._pages:
            page = await self._context.new_page()
            self._pages = [page]
        self._active_idx = 0

    def _active_page(self):
        if not self._pages:
            return None
        self._active_idx = max(0, min(self._active_idx, len(self._pages) - 1))
        return self._pages[self._active_idx]

    async def execute(self, data: dict) -> dict:
        async with self._lock:
            await self.ensure_browser()
            action = str(data.get("action", "")).strip().lower()
            target = str(data.get("target", "")).strip()
            selector = str(data.get("selector", "")).strip()
            text = str(data.get("text", "")).strip()
            page = self._active_page()

            if action in ("navigate", "open_url", "goto"):
                url = target or text
                if not url:
                    return {"ok": False, "error": "Missing URL"}
                if not url.startswith(("http://", "https://")):
                    url = f"https://{url}"
                await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                await page.bring_to_front()
                return {"ok": True, "message": f"Navigated to {page.url}", "url": page.url, "title": await page.title()}

            if action == "new_tab":
                new_page = await self._context.new_page()
                self._pages.append(new_page)
                self._active_idx = len(self._pages) - 1
                if target:
                    url = target if target.startswith(("http://", "https://")) else f"https://{target}"
                    await new_page.goto(url, wait_until="domcontentloaded", timeout=20000)
                await new_page.bring_to_front()
                return {"ok": True, "message": "Opened new Playwright tab.", "url": new_page.url}

            if action == "close_tab":
                if len(self._pages) > 1:
                    await page.close()
                    self._pages.pop(self._active_idx)
                    self._active_idx = max(0, self._active_idx - 1)
                    await self._active_page().bring_to_front()
                else:
                    await page.goto("about:blank")
                return {"ok": True, "message": "Closed active tab."}

            if action == "next_tab":
                if len(self._pages) > 1:
                    self._active_idx = (self._active_idx + 1) % len(self._pages)
                    await self._active_page().bring_to_front()
                return {"ok": True, "message": "Switched to next tab."}

            if action in ("prev_tab", "previous_tab"):
                if len(self._pages) > 1:
                    self._active_idx = (self._active_idx - 1) % len(self._pages)
                    await self._active_page().bring_to_front()
                return {"ok": True, "message": "Switched to previous tab."}

            if action in ("refresh", "refresh_page"):
                await page.reload(wait_until="domcontentloaded", timeout=15000)
                return {"ok": True, "message": "Refreshed page."}

            if action in ("browser_back", "go_back", "back"):
                await page.go_back(wait_until="domcontentloaded", timeout=15000)
                return {"ok": True, "message": "Navigated back."}

            if action in ("browser_forward", "go_forward", "forward"):
                await page.go_forward(wait_until="domcontentloaded", timeout=15000)
                return {"ok": True, "message": "Navigated forward."}

            if action in ("browser_click", "click"):
                sel = selector or target
                if not sel:
                    return {"ok": False, "error": "Missing selector or text"}
                try:
                    await page.locator(sel).first.click(timeout=5000)
                except Exception:
                    await page.get_by_text(sel, exact=False).first.click(timeout=5000)
                return {"ok": True, "message": f"Clicked '{sel}'."}

            if action in ("browser_type", "type"):
                sel = selector
                val = text or target
                if sel:
                    await page.locator(sel).first.fill(val, timeout=5000)
                else:
                    await page.keyboard.type(val)
                return {"ok": True, "message": f"Typed into '{sel or 'focused element'}'."}

            if action in ("browser_read", "read", "get_content"):
                title = await page.title()
                body_text = await page.evaluate("() => document.body ? document.body.innerText.slice(0, 2000) : ''")
                return {"ok": True, "url": page.url, "title": title, "content": body_text}

            return {"ok": False, "error": f"Unknown browser action: {action}"}

    async def shutdown(self):
        if self._context:
            await self._context.close()
        if self._pw:
            await self._pw.stop()


controller = PlaywrightController()


async def handle_health(_request):
    return web.json_response({"status": "ok", "engine": "playwright"})


async def handle_action(request):
    try:
        data = await request.json()
        res = await controller.execute(data)
        status = 200 if res.get("ok") else 400
        return web.json_response(res, status=status)
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=500)


async def on_cleanup(_app):
    await controller.shutdown()


def main():
    app = web.Application()
    app.router.add_get("/health", handle_health)
    app.router.add_post("/action", handle_action)
    app.on_cleanup.append(on_cleanup)
    print(f"[Playwright] Browser automation service listening on http://127.0.0.1:{PORT}", flush=True)
    web.run_app(app, host="127.0.0.1", port=PORT, print=None)


if __name__ == "__main__":
    main()
