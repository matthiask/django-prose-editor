import os

import pytest
from playwright.sync_api import expect

from testapp.models import ProseEditorModel


# Set Django async unsafe to allow database operations in tests
os.environ.setdefault("DJANGO_ALLOW_ASYNC_UNSAFE", "true")


@pytest.mark.django_db
@pytest.mark.e2e
def test_prose_editor_admin_form(page, live_server):
    """Test that the prose editor loads and works in the admin."""
    # Login first
    from django.contrib.auth.models import User

    User.objects.create_superuser("admin", "admin@example.com", "password")

    # Visit the login page
    page.goto(f"{live_server.url}/admin/login/")

    # Fill in the login form
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")

    # Submit the form
    page.click("input[type=submit]")

    # Wait for the admin index page to load
    page.wait_for_url(f"{live_server.url}/admin/")

    # Go to the add page
    page.goto(f"{live_server.url}/admin/testapp/proseeditormodel/add/")

    # Check that the prose editor is loaded
    editor_container = page.locator(".prose-editor")
    expect(editor_container).to_be_visible()

    # Check that the toolbar is visible
    toolbar = page.locator(".prose-menubar")
    expect(toolbar).to_be_visible()

    # Type some content into the editor
    editor = page.locator(".ProseMirror")
    editor.click()
    editor.type("Hello, Playwright!")

    # Save the form
    page.click("input[name='_save']")

    # Check that we've been redirected to the changelist page
    expect(page).to_have_url(f"{live_server.url}/admin/testapp/proseeditormodel/")

    # Check that the model was created
    model = ProseEditorModel.objects.first()
    assert model is not None
    assert "Hello, Playwright!" in model.description


@pytest.mark.django_db
@pytest.mark.e2e
def test_prose_editor_formatting(page, live_server):
    """Test formatting functionality in the prose editor."""
    # Login first
    from django.contrib.auth.models import User

    User.objects.create_superuser("admin", "admin@example.com", "password")

    # Visit the login page
    page.goto(f"{live_server.url}/admin/login/")

    # Fill in the login form
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")

    # Submit the form
    page.click("input[type=submit]")

    # Go to the add page
    page.goto(f"{live_server.url}/admin/testapp/proseeditormodel/add/")

    # Click in the editor
    editor = page.locator(".ProseMirror")
    editor.click()
    editor.type("Format this text")

    # Select the text
    editor.press("Control+a")

    # Make it bold
    bold_button = page.locator(".prose-menubar__button[title='bold']")
    bold_button.click()

    # Save the form
    page.click("input[name='_save']")

    # Check the model content contains bold formatting
    model = ProseEditorModel.objects.first()
    assert model is not None
    assert "<strong>Format this text</strong>" in model.description
