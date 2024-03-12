from functools import cached_property

from html_sanitizer import Sanitizer

from django_prose_editor.fields import ProseEditorField


SETTINGS = {
    "tags": {
        "a",
        "h1",
        "h2",
        "h3",
        "strong",
        "em",
        "p",
        "ul",
        "ol",
        "li",
        "br",
        "sub",
        "sup",
        "hr",
        "blockquote",
    },
}


class SanitizedProseEditorField(ProseEditorField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("sanitize", self.sanitizer.sanitize)
        super().__init__(*args, **kwargs)

    @cached_property
    def sanitizer(self):
        return Sanitizer(SETTINGS)
