from django.apps import AppConfig


class DjangoProseEditorConfig(AppConfig):
    name = "django_prose_editor"

    def ready(self):
        # Import system checks
        from . import checks  # noqa: F401
