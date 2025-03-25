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
