from django.db import models

from django_prose_editor.configurable import ConfigurableProseEditorField
from django_prose_editor.fields import ProseEditorField
from django_prose_editor.sanitized import SanitizedProseEditorField


class ProseEditorModel(models.Model):
    description = ProseEditorField()

    def __str__(self):
        return self.description


class SanitizedProseEditorModel(models.Model):
    description = SanitizedProseEditorField()

    def __str__(self):
        return self.description


class TableProseEditorModel(models.Model):
    description = ProseEditorField(
        config={
            "types": [
                "blockquote",
                "bold",
                "bulletList",
                "heading",
                "horizontalRule",
                "italic",
                "link",
                "orderedList",
                "strike",
                "subscript",
                "superscript",
                "underline",
                "table",
            ],
            "history": True,
            "html": True,
            "typographic": True,
        }
    )

    def __str__(self):
        return self.description


class ConfigurableProseEditorModel(models.Model):
    description = ConfigurableProseEditorField(
        features={
            "bold": True,
            "italic": True,
            "table": True,  # This should automatically include tableRow, tableHeader, tableCell
            "heading": {"levels": [1, 2, 3]},  # Limit to h1, h2, h3
        },
        sanitize=True,
    )

    def __str__(self):
        return self.description
