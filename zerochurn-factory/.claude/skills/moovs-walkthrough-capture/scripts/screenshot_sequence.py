#!/usr/bin/env python3
"""
Moovs Walkthrough Capture - Screenshot Sequence

Handles browser automation and screenshot capture using Playwright.
"""

from playwright.sync_api import sync_playwright, Page, Browser
from typing import Optional
import time


class ScreenshotCapture:
    """
    Browser automation for capturing workflow screenshots.

    Uses Playwright to navigate through Moovs application,
    execute user actions, and capture screenshots.
    """

    def __init__(
        self,
        base_url: str,
        viewport: dict = None,
        debug: bool = False,
        headless: bool = True
    ):
        """
        Initialize the screenshot capture.

        Args:
            base_url: Base URL of the Moovs environment
            viewport: Viewport dimensions {"width": int, "height": int}
            debug: Enable debug output
            headless: Run browser in headless mode
        """
        self.base_url = base_url.rstrip("/")
        self.viewport = viewport or {"width": 1280, "height": 800}
        self.debug = debug
        self.headless = headless

        self._playwright = None
        self._browser: Optional[Browser] = None
        self._page: Optional[Page] = None
        self._screenshot_count = 0

        self._init_browser()

    def _init_browser(self):
        """Initialize Playwright browser."""
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(
            headless=self.headless,
            args=["--disable-gpu", "--no-sandbox"]
        )
        self._page = self._browser.new_page(
            viewport=self.viewport,
            device_scale_factor=2  # Retina quality screenshots
        )

        if self.debug:
            print(f"Browser initialized: {self.viewport}")

    def close(self):
        """Clean up browser resources."""
        if self._page:
            self._page.close()
        if self._browser:
            self._browser.close()
        if self._playwright:
            self._playwright.stop()

    def login(self, credentials: dict):
        """
        Perform login to Moovs.

        Args:
            credentials: {"username": str, "password": str}
        """
        login_url = f"{self.base_url}/login"
        self._page.goto(login_url)
        self._page.wait_for_load_state("networkidle")

        # Fill login form - Moovs uses MUI inputs with name attributes
        self._page.fill("input[name='email']", credentials["username"])
        self._page.fill("input[name='password']", credentials["password"])

        # Submit - MUI LoadingButton with "Login" text
        self._page.click("button.MuiLoadingButton-root:has-text('Login')")

        # Wait for redirect away from login
        self._page.wait_for_url(lambda url: "/login" not in url, timeout=30000)
        self._page.wait_for_load_state("networkidle")

        if self.debug:
            print(f"Logged in as {credentials['username']}")

    def execute_step(self, step: dict):
        """
        Execute a single workflow step.

        Args:
            step: Step definition with action and parameters
        """
        action = step.get("action", "").lower()

        if action == "navigate":
            self._action_navigate(step)
        elif action == "click":
            self._action_click(step)
        elif action == "fill":
            self._action_fill(step)
        elif action == "select":
            self._action_select(step)
        elif action == "wait":
            self._action_wait(step)
        elif action == "scroll":
            self._action_scroll(step)
        elif action == "hover":
            self._action_hover(step)
        elif action == "press":
            self._action_press(step)
        elif action == "screenshot":
            pass  # Screenshot is handled by the orchestrator
        else:
            raise ValueError(f"Unknown action: {action}")

        # Handle wait_for if specified
        if "wait_for" in step:
            self._wait_for_element(step["wait_for"])

        # Small delay for visual stability
        time.sleep(0.3)

    def _action_navigate(self, step: dict):
        """Navigate to a URL."""
        url = step["url"]
        if url.startswith("/"):
            url = f"{self.base_url}{url}"

        # Use domcontentloaded instead of networkidle (React apps often have persistent connections)
        self._page.goto(url, wait_until="domcontentloaded")
        # Give React time to render
        time.sleep(2)

        if self.debug:
            print(f"  Navigate: {url}")

    def _action_click(self, step: dict):
        """Click an element."""
        selector = step["selector"]
        self._wait_for_element(selector)
        self._page.click(selector)

        if self.debug:
            print(f"  Click: {selector}")

    def _action_fill(self, step: dict):
        """Fill a text input."""
        selector = step["selector"]
        value = step["value"]

        self._wait_for_element(selector)
        self._page.fill(selector, value)

        if self.debug:
            print(f"  Fill: {selector} = '{value}'")

    def _action_select(self, step: dict):
        """Select an option from dropdown."""
        selector = step["selector"]
        value = step["value"]

        self._wait_for_element(selector)
        self._page.select_option(selector, value)

        if self.debug:
            print(f"  Select: {selector} = '{value}'")

    def _action_wait(self, step: dict):
        """Wait for specified duration."""
        duration = step.get("duration", 1000)
        time.sleep(duration / 1000)

        if self.debug:
            print(f"  Wait: {duration}ms")

    def _action_scroll(self, step: dict):
        """Scroll to element."""
        selector = step["selector"]
        self._wait_for_element(selector)
        self._page.locator(selector).scroll_into_view_if_needed()

        if self.debug:
            print(f"  Scroll: {selector}")

    def _action_hover(self, step: dict):
        """Hover over element."""
        selector = step["selector"]
        self._wait_for_element(selector)
        self._page.hover(selector)

        if self.debug:
            print(f"  Hover: {selector}")

    def _action_press(self, step: dict):
        """Press a key."""
        key = step["key"]
        self._page.keyboard.press(key)

        if self.debug:
            print(f"  Press: {key}")

    def _wait_for_element(self, selector: str, timeout: int = 10000):
        """Wait for element to be visible."""
        try:
            self._page.wait_for_selector(selector, state="visible", timeout=timeout)
        except Exception:
            # Try waiting for any state
            self._page.wait_for_selector(selector, timeout=timeout)

    def screenshot(self, path: str, label: str = None, full_page: bool = False):
        """
        Capture a screenshot.

        Args:
            path: File path to save screenshot
            label: Optional label for the screenshot
            full_page: Capture full scrollable page
        """
        self._screenshot_count += 1

        # Ensure page is stable
        self._page.wait_for_load_state("domcontentloaded")
        time.sleep(0.2)  # Brief pause for animations

        self._page.screenshot(path=path, full_page=full_page)

        if self.debug:
            label_str = f" ({label})" if label else ""
            print(f"  Screenshot #{self._screenshot_count}: {path}{label_str}")

    def highlight_element(self, selector: str, color: str = "red"):
        """
        Temporarily highlight an element for screenshot.

        Args:
            selector: Element selector
            color: Highlight color
        """
        self._page.evaluate(f"""
            (selector) => {{
                const el = document.querySelector(selector);
                if (el) {{
                    el.style.outline = '3px solid {color}';
                    el.style.outlineOffset = '2px';
                }}
            }}
        """, selector)

    def remove_highlight(self, selector: str):
        """Remove highlight from element."""
        self._page.evaluate("""
            (selector) => {
                const el = document.querySelector(selector);
                if (el) {
                    el.style.outline = '';
                    el.style.outlineOffset = '';
                }
            }
        """, selector)

    def add_annotation(self, text: str, position: dict):
        """
        Add a text annotation to the page.

        Args:
            text: Annotation text
            position: {"x": int, "y": int}
        """
        self._page.evaluate(f"""
            (config) => {{
                const div = document.createElement('div');
                div.textContent = config.text;
                div.style.cssText = `
                    position: fixed;
                    left: ${{config.x}}px;
                    top: ${{config.y}}px;
                    background: #333;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-family: system-ui, sans-serif;
                    font-size: 14px;
                    z-index: 99999;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                `;
                div.className = 'walkthrough-annotation';
                document.body.appendChild(div);
            }}
        """, {"text": text, "x": position.get("x", 20), "y": position.get("y", 20)})

    def clear_annotations(self):
        """Remove all annotations from page."""
        self._page.evaluate("""
            () => {
                document.querySelectorAll('.walkthrough-annotation').forEach(el => el.remove());
            }
        """)

    @property
    def page(self) -> Page:
        """Get the Playwright page object for advanced operations."""
        return self._page


# Example usage
if __name__ == "__main__":
    capture = ScreenshotCapture(
        base_url="http://localhost:3000",
        debug=True,
        headless=False
    )

    try:
        # Example workflow
        capture.execute_step({"action": "navigate", "url": "/"})
        capture.screenshot("./test_home.png", label="Home Page")

    finally:
        capture.close()
