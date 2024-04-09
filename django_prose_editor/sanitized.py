from django_prose_editor.fields import ProseEditorField


class SanitizedProseEditorField(ProseEditorField):
    def __init__(self, *args, **kwargs):
        if "sanitize" not in kwargs:
            from nh3 import clean

            kwargs["sanitize"] = clean
        super().__init__(*args, **kwargs)
