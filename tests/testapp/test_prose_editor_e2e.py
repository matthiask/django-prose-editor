import json
import os

import pytest
from django.contrib.auth.models import User
from playwright.sync_api import expect

from testapp.models import (
    ConfigurableProseEditorModel,
    ProseEditorModel,
    TableProseEditorModel,
)


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


@pytest.mark.django_db
@pytest.mark.e2e
def test_prose_editor_table_creation(page, live_server):
    """Test table insertion in a TableProseEditorModel."""
    # Login first
    from django.contrib.auth.models import User

    from testapp.models import TableProseEditorModel

    User.objects.create_superuser("admin", "admin@example.com", "password")

    # Visit the login page
    page.goto(f"{live_server.url}/admin/login/")
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")
    page.click("input[type=submit]")

    # Go to the add page for the TableProseEditorModel
    page.goto(f"{live_server.url}/admin/testapp/tableproseeditormodel/add/")

    # Click in the editor to focus it
    editor = page.locator(".ProseMirror")
    editor.click()
    editor.type("Test content before table")
    editor.press("Enter")
    editor.press("Enter")

    # Verify that the table button is present (this verifies the Table extension is loaded)
    table_button = page.locator(".prose-menubar__button[title='Insert table']")
    expect(table_button).to_be_visible()

    # Click the table button to open the dialog
    table_button.click()

    # Check that the dialog appears
    dialog = page.locator(".prose-editor-dialog")
    expect(dialog).to_be_visible()

    # Fill in the dialog form with specific values
    page.fill("input[name='rows']", "4")
    page.fill("input[name='cols']", "5")
    page.locator("select[name='withHeaderRow']").select_option("Yes")

    # Submit the dialog
    dialog.locator("button[type='submit']").click()

    # Wait for the table to be visible
    table = editor.locator("table")
    table.wait_for(state="visible", timeout=5000)

    # Verify table structure
    expect(editor.locator("tr")).to_have_count(4)  # 1 header + 3 data rows
    expect(editor.locator("th")).to_have_count(5)  # 5 header cells

    # Verify that table manipulation buttons exist (they may be hidden until table is activated)
    # This confirms that table extensions are properly loaded
    add_column_button = page.locator(".prose-menubar__button[title='Add column']")
    expect(add_column_button).to_have_count(1)

    delete_column_button = page.locator(".prose-menubar__button[title='Delete column']")
    expect(delete_column_button).to_have_count(1)

    # Save the form
    page.click("input[name='_save']")

    # Check the model content contains a table structure
    model = TableProseEditorModel.objects.first()
    assert model is not None
    html_content = model.description.lower()

    # Verify saved content has table components with the structure we defined
    assert "table" in html_content
    assert "tbody" in html_content  # Table uses tbody
    assert "tr" in html_content  # Has rows
    assert "th" in html_content  # Has header cells (th) in the first row
    assert "td" in html_content  # Has data cells (td) in subsequent rows

    # Also verify the correct number of rows and header cells
    assert html_content.count("<tr>") == 4  # 4 rows total
    assert html_content.count("<th") == 5  # 5 header cells


@pytest.mark.django_db
@pytest.mark.e2e
def test_prose_editor_ordered_list_attributes(page, live_server):
    """Test ordered list creation and attribute modification."""
    # Login first
    User.objects.create_superuser("admin", "admin@example.com", "password")

    # Visit the login page and log in
    page.goto(f"{live_server.url}/admin/login/")
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")
    page.click("input[type=submit]")

    # Go to the add page for the TableProseEditorModel (which has OrderedList extension)
    page.goto(f"{live_server.url}/admin/testapp/tableproseeditormodel/add/")

    # Click in the editor to focus it
    editor = page.locator(".ProseMirror")
    editor.click()
    editor.type("Test content before list")
    editor.press("Enter")
    editor.press("Enter")

    # Verify that the ordered list button is present
    ordered_list_button = page.locator(".prose-menubar__button[title='ordered list']")
    expect(ordered_list_button).to_be_visible()

    # Click the ordered list button to create a list
    ordered_list_button.click()

    # Type list items
    editor.type("First item")
    editor.press("Enter")
    editor.type("Second item")
    editor.press("Enter")
    editor.type("Third item")

    # Verify the list was created
    ol_element = editor.locator("ol")
    expect(ol_element).to_be_visible()

    # Look for the List properties button in the toolbar
    list_properties_button = page.locator(
        ".prose-menubar__button[title='List properties']"
    )

    # It should be visible now that we have an active ordered list
    expect(list_properties_button).to_be_visible()

    # Click the list properties button
    list_properties_button.click()

    # Check that the list properties dialog appears
    dialog = page.locator(".prose-editor-dialog")
    expect(dialog).to_be_visible()

    # Change list type to uppercase letters
    page.locator("select[name='listType']").select_option("A, B, C, ...")

    # Change start value to 5
    page.fill("input[name='start']", "5")

    # Submit the dialog
    dialog.locator("button[type='submit']").click()

    # Verify the list has been updated with the new attributes
    updated_ol = editor.locator("ol")
    expect(updated_ol).to_have_attribute("type", "A")
    expect(updated_ol).to_have_attribute("start", "5")

    # Save the form
    page.click("input[name='_save']")

    # Check the model content contains the ordered list with correct attributes
    model = TableProseEditorModel.objects.first()
    assert model is not None
    html_content = model.description

    # Verify the saved content has the ordered list with the attributes we set
    assert "<ol" in html_content
    assert 'type="A"' in html_content
    assert 'start="5"' in html_content
    assert "<li>" in html_content
    assert "First item" in html_content
    assert "Second item" in html_content
    assert "Third item" in html_content


@pytest.mark.django_db
@pytest.mark.e2e
def test_configurable_prose_editor_admin(page, live_server):
    """Test that the configurable prose editor loads in the admin with the BlueBold extension."""
    # Create superuser for admin access
    User.objects.create_superuser("admin", "admin@example.com", "password")

    # Log in to the admin
    page.goto(f"{live_server.url}/admin/login/")
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")
    page.click("input[type=submit]")

    # Go to the add page for ConfigurableProseEditorModel
    page.goto(f"{live_server.url}/admin/testapp/configurableproseeditormodel/add/")

    # Check that the prose editor is loaded
    editor_container = page.locator(".prose-editor")
    expect(editor_container).to_be_visible()

    # The data attribute is on the textarea element inside the prose editor, not on the div
    # The textarea is hidden by the editor UI, so we don't check if it's visible
    textarea = page.locator(".prose-editor textarea")

    # Get the configurable data attribute from the textarea
    configurable_attr = textarea.get_attribute("data-django-prose-editor-configurable")
    assert configurable_attr is not None

    # Parse the configuration JSON
    config = json.loads(configurable_attr)

    # Verify BlueBold extension is present in the configuration
    assert "BlueBold" in config

    # Check the <head> for the blue-bold.js script in the import map or as a script tag
    page_content = page.content()
    assert "blue-bold.js" in page_content, (
        "BlueBold JS file reference not found in page content"
    )

    # Verify other expected extensions are present
    assert "Bold" in config
    assert "Italic" in config
    assert "Table" in config
    assert "Heading" in config

    # Verify Heading is configured with correct levels
    assert "levels" in config["Heading"]
    assert config["Heading"]["levels"] == [1, 2, 3]

    # Verify the BlueBold JS module is included in the configuration
    assert "_js_modules" in config
    assert any("blue-bold.js" in js_path for js_path in config["_js_modules"])

    # Add some content using the editor
    editor = page.locator(".ProseMirror")
    editor.click()
    editor.type("Testing the configurable editor")

    # Save the form
    page.click("input[name='_save']")

    # Verify the model was created with the content
    model = ConfigurableProseEditorModel.objects.first()
    assert model is not None
    assert "Testing the configurable editor" in model.description
