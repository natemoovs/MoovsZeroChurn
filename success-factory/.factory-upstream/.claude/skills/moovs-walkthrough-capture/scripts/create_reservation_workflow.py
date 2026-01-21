#!/usr/bin/env python3
"""
Moovs Walkthrough Capture - Create Reservation Workflow

Captures a complete reservation creation flow with GIF generation.
"""

import argparse
import random
import time
from pathlib import Path
from datetime import datetime, timedelta

from playwright.sync_api import sync_playwright
from create_gif import GifBuilder


def run_create_reservation_workflow(
    base_url: str,
    username: str,
    password: str,
    output_dir: str = "./walkthroughs",
    output_name: str = "create-reservation",
    headless: bool = True,
    debug: bool = False,
    actually_save: bool = False
):
    """
    Execute the create reservation workflow and capture screenshots.

    Args:
        base_url: Moovs operator URL
        username: Login email
        password: Login password
        output_dir: Directory to save outputs
        output_name: Base name for output files
        headless: Run browser in headless mode
        debug: Print debug info
        actually_save: Actually click save (creates real reservation)
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    frames_dir = output_path / f"{output_name}-frames-{timestamp}"
    frames_dir.mkdir(exist_ok=True)

    frames = []
    labels = []

    def screenshot(name: str, label: str):
        path = frames_dir / f"{len(frames)+1:02d}_{name}.png"
        page.screenshot(path=str(path))
        frames.append(str(path))
        labels.append(label)
        if debug:
            print(f"  [{len(frames)}] {label}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        page = browser.new_page(viewport={"width": 1280, "height": 800}, device_scale_factor=2)

        if debug:
            print("Browser initialized")

        # Login
        page.goto(f"{base_url}/login", wait_until="domcontentloaded")
        time.sleep(2)
        page.fill("input[name='email']", username)
        page.fill("input[name='password']", password)
        page.click("button.MuiLoadingButton-root:has-text('Login')")
        page.wait_for_url(lambda url: "/login" not in url, timeout=30000)
        time.sleep(2)
        if debug:
            print("Logged in")

        # Step 1: Navigate to Reservations
        page.goto(f"{base_url}/reservations", wait_until="domcontentloaded")
        time.sleep(2)
        screenshot("reservations", "Reservations List")

        # Step 2: Click Create
        page.click("button:has-text('Create')")
        time.sleep(2)
        screenshot("create_form", "Create New Reservation")

        # Step 3: Search for contact
        page.fill("#transactions-from-contact", "NewCustomer")
        time.sleep(1.5)
        screenshot("contact_search", "Search for Contact")

        # Step 4: Click Create New Contact
        page.click("text=Create New Contact")
        time.sleep(1)
        screenshot("new_contact_modal", "Add New Contact")

        # Step 5: Fill contact details
        rand_id = random.randint(1000, 9999)
        first_name = "Demo"
        last_name = f"Customer{rand_id}"
        email = f"demo{rand_id}@example.com"
        phone = "5551234567"

        page.fill("input[name='firstName']", first_name)
        page.fill("input[name='lastName']", last_name)
        page.fill("input[name='email']", email)
        phone_input = page.locator("input[placeholder='1 (702) 123-4567']")
        if phone_input.count() > 0:
            phone_input.fill(phone)
        time.sleep(0.5)
        screenshot("contact_filled", "Enter Contact Details")

        # Step 6: Save contact
        page.click("button:has-text('Add New Contact')")
        # Wait for modal to close
        page.wait_for_selector(".MuiDialog-root", state="hidden", timeout=10000)
        time.sleep(1)
        screenshot("contact_added", "Contact Added")

        # Step 7: Set date/time
        pickup_date = (datetime.now() + timedelta(days=7)).strftime("%m/%d/%Y")
        datetime_field = page.locator("input[name='pickupDateTime']")
        if datetime_field.count() > 0 and datetime_field.is_visible():
            datetime_field.click()
            time.sleep(0.3)
            page.keyboard.type(f"{pickup_date} 10:00 AM")
            page.keyboard.press("Escape")
            time.sleep(0.5)
            screenshot("datetime_set", "Set Pickup Date & Time")

        # Get the create reservation drawer for scrolling
        drawer = page.locator(".MuiDrawer-paper:has-text('Create New Reservation')")

        # Step 8: Fill pickup address
        drawer.evaluate("el => el.scrollTop = 300")
        time.sleep(0.5)

        pickup = page.locator("[role='combobox']:has-text('Address')").first
        pickup.click()
        time.sleep(0.3)
        page.keyboard.type("JFK Airport, New York")
        time.sleep(2)
        screenshot("pickup_search", "Search Pickup Location")

        options = page.locator("[role='option']")
        if options.count() > 0:
            options.first.click()
            time.sleep(1)
        screenshot("pickup_selected", "Pickup: JFK Airport")

        # Step 9: Fill dropoff address
        drawer.evaluate("el => el.scrollTop = 500")
        time.sleep(0.5)

        all_addr = page.locator("[role='combobox']:has-text('Address')")
        if all_addr.count() > 1:
            all_addr.nth(1).click()
            time.sleep(0.3)
            page.keyboard.type("Times Square, New York")
            time.sleep(2)
            screenshot("dropoff_search", "Search Dropoff Location")

            options = page.locator("[role='option']")
            if options.count() > 0:
                options.first.click()
                time.sleep(1)
        screenshot("dropoff_selected", "Dropoff: Times Square")

        # Step 10: Scroll to bottom to show save button
        drawer.evaluate("el => el.scrollTop = el.scrollHeight")
        time.sleep(0.5)
        screenshot("ready_to_save", "Ready to Save")

        # Step 11: Save reservation (optional)
        if actually_save:
            save_btn = page.locator("button:has-text('Save reservation')")
            if save_btn.is_visible():
                save_btn.click()
                time.sleep(3)
                screenshot("saved", "Reservation Created!")
                if debug:
                    print("Reservation saved!")

        browser.close()

    # Generate GIF
    if frames:
        gif_path = output_path / f"{output_name}.gif"
        builder = GifBuilder(
            frame_duration=2500,
            max_width=800,
            quality="high",
            annotations=True
        )
        builder.create_gif(frames, str(gif_path), labels=labels)
        if debug:
            print(f"\nGIF created: {gif_path}")
            print(f"Frames: {len(frames)}")

    return {
        "frames": frames,
        "labels": labels,
        "gif": str(gif_path) if frames else None,
        "frames_dir": str(frames_dir)
    }


def main():
    parser = argparse.ArgumentParser(description="Capture Create Reservation workflow")
    parser.add_argument("--env", "-e", default="staging", help="Environment or URL")
    parser.add_argument("--username", "-u", required=True, help="Login email")
    parser.add_argument("--password", "-p", required=True, help="Login password")
    parser.add_argument("--output", "-o", default="./walkthroughs", help="Output directory")
    parser.add_argument("--name", "-n", default="create-reservation", help="Output name")
    parser.add_argument("--debug", "-d", action="store_true", help="Debug mode")
    parser.add_argument("--show-browser", action="store_true", help="Show browser window")
    parser.add_argument("--save", action="store_true", help="Actually save the reservation")

    args = parser.parse_args()

    # Resolve environment
    envs = {
        "staging": "https://operator-staging.moovs.app",
        "production": "https://operator.moovs.app",
        "local": "http://localhost:3000"
    }
    base_url = envs.get(args.env, args.env)

    result = run_create_reservation_workflow(
        base_url=base_url,
        username=args.username,
        password=args.password,
        output_dir=args.output,
        output_name=args.name,
        headless=not args.show_browser,
        debug=args.debug,
        actually_save=args.save
    )

    print(f"\nCapture complete!")
    print(f"  Frames: {len(result['frames'])}")
    print(f"  GIF: {result['gif']}")


if __name__ == "__main__":
    main()
