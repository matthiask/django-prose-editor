import os

import pytest
from django.conf import settings


def pytest_configure(config):
    """Set up Django settings for tests."""
    # Allow database operations in async contexts during testing
    # This is needed because Playwright operates in an async context internally
    # even though the test code is synchronous
    os.environ.setdefault("DJANGO_ALLOW_ASYNC_UNSAFE", "true")

    # Speed up password hashing for tests
    settings.PASSWORD_HASHERS = [
        "django.contrib.auth.hashers.MD5PasswordHasher",
    ]

    # Use in-memory database for faster tests
    settings.DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
            "TEST": {
                "NAME": ":memory:",
            },
        },
    }

    # Create a pytest marker for tests that require Playwright
    config.addinivalue_line(
        "markers",
        "browser: mark tests that require a browser (use --browser to specify which)",
    )


# Customize browser fixture for better error handling
@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Customize browser context."""
    return {
        **browser_context_args,
        "ignore_https_errors": True,
        "viewport": {
            "width": 1280,
            "height": 720,
        },
    }


@pytest.fixture(scope="session")
def browser_type_launch_args(pytestconfig):
    """Configure browser launch arguments."""
    # Configure browser launch arguments with headless mode by default
    browser = pytestconfig.getoption("--browser")
    launch_options = {}

    # Always run in headless mode unless --headed is specified
    if not pytestconfig.getoption("--headed"):
        launch_options["headless"] = True

    # Set additional options for specific browsers
    if browser == "chromium":
        launch_options["args"] = ["--no-sandbox", "--disable-gpu"]

    return launch_options
