from django import forms


class ProseEditorWidget(forms.Textarea):
    class Media:
        css = {
            "screen": [
                "django_prose_editor/material-icons.css",
                "django_prose_editor/editor.css",
            ]
        }
        js = [
            "django_prose_editor/editor.js",
            "admin/js/jquery.init.js",
            "django_prose_editor/init.js",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.attrs["data-django-prose-editor"] = True
