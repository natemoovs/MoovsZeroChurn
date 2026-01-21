#!/usr/bin/env python3
"""
Moovs Walkthrough Capture - GIF Builder

Stitches screenshots into animated GIFs with optional annotations.
"""

import imageio
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from typing import List, Optional
import os


class GifBuilder:
    """
    Builds animated GIFs from a sequence of screenshots.

    Supports annotations, timing control, and quality optimization.
    """

    # Quality presets
    QUALITY_PRESETS = {
        "low": {"colors": 64, "optimize": True},
        "medium": {"colors": 128, "optimize": True},
        "high": {"colors": 256, "optimize": False},
    }

    def __init__(
        self,
        frame_duration: int = 2000,
        max_width: int = 800,
        quality: str = "high",
        loop: bool = True,
        annotations: bool = True,
        annotation_height: int = 40,
        annotation_bg: str = "#333333",
        annotation_fg: str = "#FFFFFF"
    ):
        """
        Initialize the GIF builder.

        Args:
            frame_duration: Duration per frame in milliseconds
            max_width: Maximum width for the output GIF
            quality: Quality preset (low, medium, high)
            loop: Whether to loop the GIF
            annotations: Whether to add step labels
            annotation_height: Height of annotation bar
            annotation_bg: Background color for annotations
            annotation_fg: Text color for annotations
        """
        self.frame_duration = frame_duration
        self.max_width = max_width
        self.quality = quality
        self.loop = loop
        self.annotations = annotations
        self.annotation_height = annotation_height
        self.annotation_bg = annotation_bg
        self.annotation_fg = annotation_fg

    def create_gif(
        self,
        frame_paths: List[str],
        output_path: str,
        labels: Optional[List[str]] = None,
        durations: Optional[List[int]] = None
    ) -> str:
        """
        Create an animated GIF from screenshot frames.

        Args:
            frame_paths: List of paths to screenshot images
            output_path: Output path for the GIF
            labels: Optional labels for each frame (for annotations)
            durations: Optional per-frame durations in ms (overrides frame_duration)

        Returns:
            Path to the created GIF
        """
        if not frame_paths:
            raise ValueError("No frames provided")

        # Process frames
        processed_frames = []
        for i, path in enumerate(frame_paths):
            label = labels[i] if labels and i < len(labels) else None
            frame = self._process_frame(path, label)
            processed_frames.append(frame)

        # Calculate durations
        if durations:
            frame_durations = [d / 1000 for d in durations]  # Convert to seconds
        else:
            frame_durations = [self.frame_duration / 1000] * len(processed_frames)

        # Ensure output directory exists
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        # Get quality settings
        quality_settings = self.QUALITY_PRESETS.get(self.quality, self.QUALITY_PRESETS["high"])

        # Convert to palette mode for GIF
        palette_frames = []
        for frame in processed_frames:
            # Convert to P mode (palette) with dithering for better quality
            p_frame = frame.convert('P', palette=Image.Palette.ADAPTIVE, colors=quality_settings.get("colors", 256))
            palette_frames.append(p_frame)

        # Save using PIL directly - handles per-frame durations correctly
        # Duration is in milliseconds for PIL
        durations_ms = [int(d * 1000) for d in frame_durations]

        palette_frames[0].save(
            output_path,
            save_all=True,
            append_images=palette_frames[1:] if len(palette_frames) > 1 else [],
            duration=durations_ms,
            loop=0 if self.loop else 1,
            optimize=quality_settings.get("optimize", False)
        )

        return output_path

    def _process_frame(self, path: str, label: Optional[str] = None) -> "Image":
        """
        Process a single frame: resize, add annotation.

        Args:
            path: Path to the image
            label: Optional label to add

        Returns:
            Processed PIL Image
        """
        img = Image.open(path)

        # Convert to RGB (GIFs don't support alpha well)
        if img.mode == "RGBA":
            # Create white background
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Resize if needed
        if img.width > self.max_width:
            ratio = self.max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((self.max_width, new_height), Image.Resampling.LANCZOS)

        # Add annotation bar if label provided
        if label and self.annotations:
            img = self._add_annotation(img, label)

        return img

    def _add_annotation(self, img: "Image", label: str) -> "Image":
        """
        Add an annotation bar to the bottom of the image.

        Args:
            img: PIL Image
            label: Annotation text

        Returns:
            Image with annotation
        """
        # Create new image with extra height for annotation
        new_height = img.height + self.annotation_height
        annotated = Image.new("RGB", (img.width, new_height), self.annotation_bg)

        # Paste original image
        annotated.paste(img, (0, 0))

        # Draw annotation text
        draw = ImageDraw.Draw(annotated)

        # Try to get a nice font, fall back to default
        font = self._get_font(size=16)

        # Calculate text position (centered)
        bbox = draw.textbbox((0, 0), label, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        x = (img.width - text_width) // 2
        y = img.height + (self.annotation_height - text_height) // 2

        draw.text((x, y), label, fill=self.annotation_fg, font=font)

        return annotated

    def _get_font(self, size: int = 16):
        """Get a font for annotations, with fallbacks."""
        font_paths = [
            # macOS
            "/System/Library/Fonts/SFNSMono.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/Library/Fonts/Arial.ttf",
            # Linux
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/TTF/DejaVuSans.ttf",
            # Windows
            "C:/Windows/Fonts/arial.ttf",
        ]

        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    return ImageFont.truetype(font_path, size)
                except Exception:
                    continue

        # Fall back to default
        return ImageFont.load_default()

    def _optimize_gif(self, path: str):
        """
        Optimize GIF file size using gifsicle if available.

        Args:
            path: Path to GIF file
        """
        try:
            import subprocess
            subprocess.run(
                ["gifsicle", "-O3", "--batch", path],
                capture_output=True,
                check=False
            )
        except (FileNotFoundError, subprocess.SubprocessError):
            pass  # gifsicle not available, skip optimization

    def create_gif_with_transitions(
        self,
        frame_paths: List[str],
        output_path: str,
        labels: Optional[List[str]] = None,
        transition_type: str = "fade",
        transition_frames: int = 5
    ) -> str:
        """
        Create GIF with transitions between frames.

        Args:
            frame_paths: List of paths to screenshots
            output_path: Output path for GIF
            labels: Optional labels for frames
            transition_type: Type of transition (fade, slide, none)
            transition_frames: Number of intermediate frames for transitions

        Returns:
            Path to created GIF
        """
        if transition_type == "none":
            return self.create_gif(frame_paths, output_path, labels)

        # Process frames
        all_frames = []
        all_labels = []
        all_durations = []

        for i, path in enumerate(frame_paths):
            label = labels[i] if labels and i < len(labels) else None
            frame = self._process_frame(path, label)
            all_frames.append(frame)
            all_labels.append(label)
            all_durations.append(self.frame_duration)

            # Add transition to next frame
            if i < len(frame_paths) - 1:
                next_frame = self._process_frame(frame_paths[i + 1], labels[i + 1] if labels else None)
                transition_duration = 100  # ms per transition frame

                if transition_type == "fade":
                    transition = self._create_fade_transition(frame, next_frame, transition_frames)
                elif transition_type == "slide":
                    transition = self._create_slide_transition(frame, next_frame, transition_frames)
                else:
                    transition = []

                for t_frame in transition:
                    all_frames.append(t_frame)
                    all_labels.append(None)
                    all_durations.append(transition_duration)

        # Create GIF with variable durations
        return self._create_gif_from_frames(all_frames, output_path, all_durations)

    def _create_fade_transition(self, frame1: "Image", frame2: "Image", steps: int) -> List["Image"]:
        """Create fade transition frames."""
        transitions = []
        for i in range(1, steps):
            alpha = i / steps
            blended = Image.blend(frame1, frame2, alpha)
            transitions.append(blended)
        return transitions

    def _create_slide_transition(self, frame1: "Image", frame2: "Image", steps: int) -> List["Image"]:
        """Create slide transition frames."""
        transitions = []
        width = frame1.width

        for i in range(1, steps):
            offset = int((width * i) / steps)
            combined = Image.new("RGB", frame1.size, (255, 255, 255))
            combined.paste(frame1, (-offset, 0))
            combined.paste(frame2, (width - offset, 0))
            transitions.append(combined)

        return transitions

    def _create_gif_from_frames(
        self,
        frames: List["Image"],
        output_path: str,
        durations: List[int]
    ) -> str:
        """Create GIF from pre-processed frames."""
        quality_settings = self.QUALITY_PRESETS.get(self.quality, self.QUALITY_PRESETS["high"])
        frame_durations = [d / 1000 for d in durations]

        imageio.mimsave(
            output_path,
            frames,
            duration=frame_durations,
            loop=0 if self.loop else 1,
            **quality_settings
        )

        return output_path


# Example usage
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python create_gif.py output.gif frame1.png frame2.png ...")
        sys.exit(1)

    output = sys.argv[1]
    frames = sys.argv[2:]

    builder = GifBuilder(frame_duration=2000, max_width=800)
    builder.create_gif(frames, output)
    print(f"Created: {output}")
