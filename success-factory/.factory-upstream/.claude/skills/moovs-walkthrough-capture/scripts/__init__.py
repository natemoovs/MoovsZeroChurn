# Moovs Walkthrough Capture Scripts
"""
Browser automation and GIF generation scripts for capturing
Moovs application walkthroughs.
"""

from .screenshot_sequence import ScreenshotCapture
from .create_gif import GifBuilder

__all__ = ["ScreenshotCapture", "GifBuilder"]
