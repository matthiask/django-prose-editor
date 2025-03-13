import pytest
from django.contrib.auth.models import User
from playwright.sync_api import expect


@pytest.fixture(scope="function")
def admin_user(db):
    """Create an admin user for testing."""
    # Using a more explicit way to create user to avoid potential async issues
    user = User(
        username="admin",
        email="admin@example.com",
        is_staff=True,
        is_active=True,
        is_superuser=True,
    )
    user.set_password("password")
    user.save()
    return user


@pytest.fixture(scope="function")
def auth_page(page, live_server, admin_user):
    """Create a page instance that's logged into the Django admin."""
    try:
        # Go to admin login page
        page.goto(f"{live_server.url}/admin/login/")

        # Fill in login form
        page.locator("input[name='username']").fill("admin")
        page.locator("input[name='password']").fill("password")

        # Submit the form
        page.locator("input[type='submit']").click()

        # Wait for redirect to admin index with a short timeout
        expect(page).to_have_url(f"{live_server.url}/admin/", timeout=5000)

        yield page
    finally:
        # Make sure we reset any state
        page.context.clear_cookies()

        try:
            # Try to go to a blank page to reset state
            page.goto("about:blank")
        except:
            pass


@pytest.mark.browser
class TestProseEditor:
    """Basic tests for the prose editor."""

    def test_editor_loads(self, auth_page, live_server):
        """Test that the editor loads correctly in the admin."""
        # Navigate to add form
        auth_page.goto(f"{live_server.url}/admin/testapp/proseeditormodel/add/")

        # Check that editor is loaded
        editor = auth_page.locator(".prose-editor")
        expect(editor).to_be_visible()

        # Check that menubar is loaded
        menubar = auth_page.locator(".prose-menubar")
        expect(menubar).to_be_visible()

        # Check that some basic formatting buttons exist
        for button_title in ["bold", "italic", "blockquote"]:
            button = auth_page.locator(
                f".prose-menubar__button[title='{button_title}']"
            )
            expect(button).to_be_visible()

    def test_basic_text_input(self, auth_page, live_server):
        """Test basic text input functionality."""
        # Navigate to add form
        auth_page.goto(f"{live_server.url}/admin/testapp/proseeditormodel/add/")

        # Find the ProseMirror editor content area and type
        content_area = auth_page.locator(".ProseMirror")
        content_area.click()
        content_area.type("This is a test")

        # Verify the text is in the editor
        expect(content_area).to_contain_text("This is a test")

        # Submit the form
        auth_page.locator("input[name='_save']").click()

        # Check for success message
        success_message = auth_page.locator(".messagelist .success")
        expect(success_message).to_be_visible()
        expect(success_message).to_contain_text("added successfully")


@pytest.mark.browser
class TestFigureExtension:
    """Tests for the Figure extension."""

    def test_figure_button_exists(self, auth_page, live_server):
        """Test that the figure button exists in the toolbar."""
        # Navigate to add form
        auth_page.goto(f"{live_server.url}/admin/testapp/proseeditormodel/add/")

        # Check that the figure button exists
        figure_button = auth_page.locator(".prose-menubar__button[title='figure']")
        expect(figure_button).to_be_visible()

    def test_figure_insertion(self, auth_page, live_server):
        """Test inserting a figure via the toolbar button."""
        # Navigate to add form
        auth_page.goto(f"{live_server.url}/admin/testapp/proseeditormodel/add/")

        # Click figure button to open dialog
        figure_button = auth_page.locator(".prose-menubar__button[title='figure']")
        figure_button.click()

        # Wait for dialog
        dialog = auth_page.locator(".prose-editor-dialog")
        expect(dialog).to_be_visible()

        # Verify dialog title
        expect(dialog.locator(".prose-editor-dialog-title")).to_have_text(
            "Insert Figure"
        )

        # Fill in form fields
        dialog.locator("input[name='imageUrl']").fill(
            "https://example.com/test-image.jpg"
        )
        dialog.locator("input[name='caption']").fill("Test Caption")

        # Submit form
        dialog.locator("button[type='submit']").click()

        # Wait for dialog to close
        expect(dialog).to_be_hidden()

        # Verify figure was inserted
        figure = auth_page.locator(".ProseMirror figure")
        expect(figure).to_be_visible()

        # Check image src
        image = figure.locator("img")
        expect(image).to_have_attribute("src", "https://example.com/test-image.jpg")

        # Check caption text
        caption = figure.locator("figcaption")
        expect(caption).to_have_text("Test Caption")

    def __test_figure_editing(self, auth_page, live_server):
        """Test editing an existing figure."""
        # Navigate to add form
        auth_page.goto(f"{live_server.url}/admin/testapp/proseeditormodel/add/")

        # Insert a figure first
        figure_button = auth_page.locator(".prose-menubar__button[title='figure']")
        figure_button.click()

        dialog = auth_page.locator(".prose-editor-dialog")
        dialog.locator("input[name='imageUrl']").fill(
            "https://example.com/initial-image.jpg"
        )
        dialog.locator("input[name='caption']").fill("Initial Caption")
        dialog.locator("button[type='submit']").click()

        # Wait for dialog to close
        expect(dialog).to_be_hidden()

        # Select the figure
        figure = auth_page.locator(".ProseMirror figure")
        figure.click()

        # Check that figure button is active
        figure_button = auth_page.locator(".prose-menubar__button[title='figure']")
        expect(figure_button).to_have_class("active")

        # Open edit dialog
        figure_button.click()

        # Check that dialog shows "Edit Figure"
        dialog = auth_page.locator(".prose-editor-dialog")
        expect(dialog.locator(".prose-editor-dialog-title")).to_have_text("Edit Figure")

        # Verify pre-filled values
        expect(dialog.locator("input[name='imageUrl']")).to_have_value(
            "https://example.com/initial-image.jpg"
        )
        expect(dialog.locator("input[name='caption']")).to_have_value("Initial Caption")

        # Update values
        dialog.locator("input[name='imageUrl']").fill("")  # Clear first
        dialog.locator("input[name='imageUrl']").fill(
            "https://example.com/updated-image.jpg"
        )

        dialog.locator("input[name='caption']").fill("")  # Clear first
        dialog.locator("input[name='caption']").fill("Updated Caption")

        # Check that submit button says "Update"
        update_button = dialog.locator("button[type='submit']")
        expect(update_button).to_have_text("Update")

        # Submit form
        update_button.click()

        # Verify updated figure
        figure = auth_page.locator(".ProseMirror figure")
        image = figure.locator("img")
        expect(image).to_have_attribute("src", "https://example.com/updated-image.jpg")

        caption = figure.locator("figcaption")
        expect(caption).to_have_text("Updated Caption")

    def __test_alignment_change(self, auth_page, live_server):
        """Test changing figure alignment."""
        # Navigate to add form
        auth_page.goto(f"{live_server.url}/admin/testapp/proseeditormodel/add/")

        # Insert a figure
        figure_button = auth_page.locator(".prose-menubar__button[title='figure']")
        figure_button.click()

        dialog = auth_page.locator(".prose-editor-dialog")
        dialog.locator("input[name='imageUrl']").fill(
            "https://example.com/test-image.jpg"
        )
        dialog.locator("input[name='caption']").fill("Test Caption")

        # Change alignment to left
        dialog.locator("select[name='alignment']").select_option("Left")

        # Submit form
        dialog.locator("button[type='submit']").click()

        # Verify figure has left alignment class
        figure = auth_page.locator(".ProseMirror figure")
        expect(figure).to_have_class("figure--left")

        # Now edit the figure
        figure.click()
        figure_button.click()

        # Change alignment to right
        dialog = auth_page.locator(".prose-editor-dialog")
        dialog.locator("select[name='alignment']").select_option("Right")

        # Submit form
        dialog.locator("button[type='submit']").click()

        # Verify figure now has right alignment class
        figure = auth_page.locator(".ProseMirror figure")
        expect(figure).to_have_class("figure--right")
