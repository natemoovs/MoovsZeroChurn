#!/usr/bin/env python3
"""
Moovs Walkthrough Capture - Main Orchestration Script

Orchestrates the capture of browser workflows and generation of GIFs.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import yaml

from screenshot_sequence import ScreenshotCapture
from create_gif import GifBuilder


# Default environments
ENVIRONMENTS = {
    "staging": "https://operator-staging.moovs.app",
    "production": "https://operator.moovs.app",
    "local": "http://localhost:3000",
}

# Path to pre-defined workflows
WORKFLOWS_DIR = Path(__file__).parent.parent / "references"


def load_workflow(workflow_name: str) -> dict:
    """Load a workflow definition from YAML file or common-workflows.md."""
    # First check for dedicated YAML file
    yaml_path = WORKFLOWS_DIR / f"{workflow_name}.yaml"
    if yaml_path.exists():
        with open(yaml_path) as f:
            return yaml.safe_load(f)

    # Check common-workflows.md for embedded definitions
    common_path = WORKFLOWS_DIR / "common-workflows.md"
    if common_path.exists():
        workflows = parse_workflows_from_markdown(common_path)
        if workflow_name in workflows:
            return workflows[workflow_name]

    raise ValueError(f"Workflow '{workflow_name}' not found")


def parse_workflows_from_markdown(filepath: Path) -> dict:
    """Extract workflow definitions from markdown code blocks."""
    workflows = {}
    current_name = None
    current_yaml = []
    in_yaml_block = False

    with open(filepath) as f:
        for line in f:
            # Match headings like "### new-trip: Create a New Trip"
            if line.strip().startswith("### ") and ":" in line:
                # Extract the workflow name (e.g., "new-trip" from "### new-trip: Create...")
                heading = line.strip().replace("### ", "")
                current_name = heading.split(":")[0].strip().lower()
            elif line.strip() == "```yaml":
                in_yaml_block = True
                current_yaml = []
            elif line.strip() == "```" and in_yaml_block:
                in_yaml_block = False
                if current_yaml and current_name:
                    try:
                        workflows[current_name] = yaml.safe_load("\n".join(current_yaml))
                    except yaml.YAMLError:
                        pass
                current_name = None
            elif in_yaml_block:
                current_yaml.append(line.rstrip())

    return workflows


def create_workflow_from_steps(steps: list, name: str = "custom") -> dict:
    """Create a workflow dict from a list of step definitions."""
    return {
        "workflow": {
            "name": name,
            "steps": steps
        }
    }


def run_capture(
    workflow: dict,
    environment: str,
    output_path: str,
    credentials: dict = None,
    debug: bool = False,
    viewport: dict = None
) -> dict:
    """
    Execute a workflow capture and generate a GIF.

    Args:
        workflow: Workflow definition dict
        environment: Environment name or base URL
        output_path: Where to save the GIF
        credentials: Login credentials if needed
        debug: Enable verbose logging
        viewport: Override viewport settings

    Returns:
        dict with capture results and metadata
    """
    # Resolve environment URL
    base_url = ENVIRONMENTS.get(environment, environment)

    # Extract workflow config
    wf_config = workflow.get("workflow", workflow)
    name = wf_config.get("name", "capture")
    steps = wf_config.get("steps", [])
    gif_settings = workflow.get("gif_settings", {})

    # Apply viewport override
    wf_viewport = wf_config.get("viewport", {"width": 1280, "height": 800})
    if viewport:
        wf_viewport.update(viewport)

    # Create output directory
    output_path = Path(output_path)
    output_dir = output_path.parent
    output_dir.mkdir(parents=True, exist_ok=True)

    # Create frames directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    frames_dir = output_dir / f"{output_path.stem}-frames-{timestamp}"
    frames_dir.mkdir(exist_ok=True)

    # Initialize capture
    capture = ScreenshotCapture(
        base_url=base_url,
        viewport=wf_viewport,
        debug=debug
    )

    results = {
        "workflow": name,
        "environment": environment,
        "base_url": base_url,
        "timestamp": timestamp,
        "steps": [],
        "frames": [],
        "errors": []
    }

    try:
        # Login if credentials provided
        if credentials:
            capture.login(credentials)

        # Execute each step
        for i, step in enumerate(steps):
            step_num = i + 1
            step_label = step.get("label", f"Step {step_num}")

            if debug:
                print(f"[{step_num}/{len(steps)}] {step_label}")

            try:
                # Execute the step action
                capture.execute_step(step)

                # Take screenshot if requested
                if step.get("screenshot", True):
                    frame_path = frames_dir / f"step_{step_num:03d}_{sanitize_filename(step_label)}.png"
                    capture.screenshot(str(frame_path), label=step_label)
                    results["frames"].append({
                        "path": str(frame_path),
                        "label": step_label,
                        "step": step_num
                    })

                results["steps"].append({
                    "step": step_num,
                    "label": step_label,
                    "action": step.get("action"),
                    "success": True
                })

            except Exception as e:
                error_msg = f"Step {step_num} ({step_label}): {str(e)}"
                results["errors"].append(error_msg)
                results["steps"].append({
                    "step": step_num,
                    "label": step_label,
                    "action": step.get("action"),
                    "success": False,
                    "error": str(e)
                })
                if debug:
                    print(f"  ERROR: {e}")

        # Generate GIF from frames
        if results["frames"]:
            gif_builder = GifBuilder(
                frame_duration=gif_settings.get("frame_duration", 2000),
                max_width=gif_settings.get("max_width", 800),
                quality=gif_settings.get("quality", "high"),
                loop=gif_settings.get("loop", True),
                annotations=gif_settings.get("annotations", True)
            )

            frame_paths = [f["path"] for f in results["frames"]]
            labels = [f["label"] for f in results["frames"]] if gif_settings.get("annotations") else None

            gif_builder.create_gif(frame_paths, str(output_path), labels=labels)
            results["output_gif"] = str(output_path)

            if debug:
                print(f"\nGIF created: {output_path}")

    finally:
        capture.close()

    # Save metadata
    metadata_path = output_dir / f"{output_path.stem}-metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(results, f, indent=2)
    results["metadata_file"] = str(metadata_path)

    return results


def sanitize_filename(name: str) -> str:
    """Convert a label to a safe filename."""
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in name).lower()


def main():
    parser = argparse.ArgumentParser(
        description="Capture Moovs workflow walkthroughs as animated GIFs"
    )
    parser.add_argument(
        "--workflow", "-w",
        required=True,
        help="Workflow name (from common-workflows.md) or path to YAML file"
    )
    parser.add_argument(
        "--env", "-e",
        default="staging",
        help="Environment: staging, production, local, or custom URL"
    )
    parser.add_argument(
        "--output", "-o",
        default="./walkthroughs/output.gif",
        help="Output GIF path"
    )
    parser.add_argument(
        "--width",
        type=int,
        help="Viewport width override"
    )
    parser.add_argument(
        "--height",
        type=int,
        help="Viewport height override"
    )
    parser.add_argument(
        "--debug", "-d",
        action="store_true",
        help="Enable debug logging"
    )
    parser.add_argument(
        "--username", "-u",
        help="Login username"
    )
    parser.add_argument(
        "--password", "-p",
        help="Login password"
    )

    args = parser.parse_args()

    # Load workflow
    if args.workflow.endswith((".yaml", ".yml")):
        with open(args.workflow) as f:
            workflow = yaml.safe_load(f)
    else:
        workflow = load_workflow(args.workflow)

    # Build credentials if provided
    credentials = None
    if args.username and args.password:
        credentials = {"username": args.username, "password": args.password}

    # Build viewport override
    viewport = {}
    if args.width:
        viewport["width"] = args.width
    if args.height:
        viewport["height"] = args.height

    # Run capture
    results = run_capture(
        workflow=workflow,
        environment=args.env,
        output_path=args.output,
        credentials=credentials,
        debug=args.debug,
        viewport=viewport if viewport else None
    )

    # Print summary
    print(f"\nCapture complete!")
    print(f"  Workflow: {results['workflow']}")
    print(f"  Steps: {len(results['steps'])} ({len([s for s in results['steps'] if s['success']])} successful)")
    print(f"  Frames: {len(results['frames'])}")
    if results.get("output_gif"):
        print(f"  Output: {results['output_gif']}")
    if results["errors"]:
        print(f"  Errors: {len(results['errors'])}")
        for err in results["errors"]:
            print(f"    - {err}")

    return 0 if not results["errors"] else 1


if __name__ == "__main__":
    sys.exit(main())
