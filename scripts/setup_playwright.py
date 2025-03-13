#!/usr/bin/env python
"""Script to download and install Playwright browsers."""

import subprocess
import sys


try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Playwright not installed. Please install it first:")
    print("pip install playwright")
    sys.exit(1)


def main():
    """Install all browsers."""
    print("Installing Playwright browsers...")
    subprocess.run(["playwright", "install"], check=True)
    print("Playwright browsers installed successfully.")


if __name__ == "__main__":
    main()
