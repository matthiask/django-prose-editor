import os

import pytest
from playwright.sync_api import expect


# Set async unsafe for database operations
os.environ.setdefault("DJANGO_ALLOW_ASYNC_UNSAFE", "true")


@pytest.mark.django_db
@pytest.mark.e2e
def test_destroy_editor_direct_js(page, live_server):
    """Test editor destruction using the actual editor code."""

    # Load the file using the file:// protocol
    page.goto(f"{live_server.url}/editor/")

    # Wait to ensure the page and scripts are loaded
    page.wait_for_load_state("networkidle")

    # Give additional time for ES modules to load
    page.wait_for_timeout(1000)

    # Check initial state - textarea should be visible
    expect(page.locator("#test-textarea")).to_have_count(1)

    # Try to call the setup function to initialize the editor
    page.evaluate("window.setupEditor()")

    # If setupEditor succeeded, check that the editor exists
    page.wait_for_selector(".prose-editor")
    editor_container = page.locator(".prose-editor")
    expect(editor_container).to_be_visible()

    # Check that textarea is inside the editor container
    textarea_in_editor = page.evaluate("""
    () => {
        const textarea = document.getElementById('test-textarea');
        const editorDiv = document.querySelector('.prose-editor');
        return textarea && editorDiv && textarea.closest('.prose-editor') === editorDiv;
    }
    """)
    assert textarea_in_editor, "Textarea should be inside editor container"

    # Now call destroyEditor to test the destruction
    destroy_result = page.evaluate("window.destroyEditor()")
    assert destroy_result, "Editor destruction should succeed"

    # Check that the editor container is gone
    expect(page.locator(".prose-editor")).to_have_count(0)

    # Check that the textarea still exists and is back in the test-container
    expect(page.locator("#test-textarea")).to_have_count(1)

    # Check that the textarea is back in its original container
    textarea_in_container = page.evaluate("""
    () => {
        const textarea = document.getElementById('test-textarea');
        const container = document.getElementById('test-container');
        return textarea.parentElement === container;
    }
    """)
    assert textarea_in_container, "Textarea should be back in original container"
