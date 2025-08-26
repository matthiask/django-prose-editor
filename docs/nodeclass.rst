NodeClass Extension
===================

The NodeClass extension allows you to apply arbitrary CSS classes to block-level nodes (paragraphs, tables, table cells, etc.) using global attributes. This provides a clean, semantic way to style entire elements without requiring individual node type extensions.

Unlike TextClass which applies to inline text using ``<span>`` tags, NodeClass works with block-level elements by adding CSS classes directly to their HTML tags (e.g., ``<p class="highlight">``, ``<table class="bordered">``).

Basic Usage
-----------

To use the NodeClass extension, configure it with CSS classes organized by node type. Each class can be specified as:

- A string (class name and display title will be the same)
- An object with ``className`` and ``title`` properties for custom display names

.. code-block:: python

    from django_prose_editor.fields import ProseEditorField

    class Article(models.Model):
        content = ProseEditorField(
            extensions={
                "Bold": True,
                "Italic": True,
                "Table": True,
                "NodeClass": {
                    "cssClasses": {
                        "paragraph": [
                            "highlight",
                            "callout",
                            {"className": "centered", "title": "Centered Text"}
                        ],
                        "table": [
                            "bordered",
                            "striped",
                            {"className": "compact", "title": "Compact Table"}
                        ],
                        "tableCell": [
                            "centered",
                            "right-aligned",
                            {"className": "numeric", "title": "Numeric Cell"}
                        ],
                        "heading": [
                            "section-title",
                            {"className": "accent", "title": "Accent Heading"}
                        ]
                    }
                }
            }
        )

JavaScript Configuration
------------------------

When creating custom presets, you can configure the NodeClass extension in JavaScript:

.. code-block:: javascript

    import { NodeClass } from "django-prose-editor/editor"

    // Per-node configuration
    NodeClass.configure({
        cssClasses: {
            paragraph: ["highlight", "callout", "centered"],
            table: ["bordered", "striped", "compact"],
            tableCell: ["centered", "right-aligned", "numeric"],
            heading: ["section-title", "accent"]
        }
    })

    // Mixed configuration with custom titles
    NodeClass.configure({
        cssClasses: {
            paragraph: [
                "highlight",
                { className: "callout", title: "Callout Box" }
            ],
            table: [
                { className: "bordered", title: "Bordered Table" },
                { className: "striped", title: "Striped Rows" }
            ]
        }
    })

Supported Node Types
--------------------

The following node types are supported for CSS class application:

- **paragraph**: Paragraph elements (``<p>``)
- **table**: Table elements (``<table>``)
- **tableCell**: Table cells (``<td>``, ``<th>``)
- **tableRow**: Table rows (``<tr>``)
- **heading**: Heading elements (``<h1>``-``<h6>``)
- **listItem**: List items (``<li>``)
- **blockquote**: Blockquote elements (``<blockquote>``)
- **codeBlock**: Code block elements (``<pre>``)

Menu Integration
----------------

When configured with CSS classes, NodeClass automatically adds context-sensitive dropdown menus to the editor. The menu options change based on the currently selected node type:

- When a paragraph is selected, only paragraph classes are shown
- When a table is selected, only table classes are shown
- When a table cell is selected, only table cell classes are shown

Each dropdown includes:

- **default**: Removes any applied node class (returns to normal styling)
- Each configured CSS class for that node type as a selectable option

The menu items appear in the ``nodeClass`` group and are contextually filtered.

Commands
--------

The NodeClass extension provides these commands:

.. code-block:: javascript

    // Apply a CSS class to the current node
    editor.commands.setNodeClass("highlight")

    // Remove node class from the current node
    editor.commands.unsetNodeClass()

    // Check if current node has a specific class applied
    editor.isActive("nodeClass", { class: "highlight" })

HTML Output
-----------

The extension adds CSS classes directly to block-level elements:

.. code-block:: html

    <p class="highlight">This paragraph has highlighting applied.</p>

    <table class="bordered striped">
        <tr>
            <th class="centered">Header</th>
            <td class="numeric">123.45</td>
        </tr>
    </table>

    <h2 class="section-title">Section Heading</h2>

    <blockquote class="callout">
        <p>Important quote or callout text.</p>
    </blockquote>

Sanitization
------------

When using server-side sanitization, the NodeClass extension automatically configures the sanitizer to allow ``class`` attributes on all supported block-level elements.

Styling Examples
----------------

Define CSS rules in your stylesheet to style the configured classes:

.. code-block:: css

    /* Paragraph classes */
    .ProseMirror p.highlight {
        background-color: #fff3cd;
        padding: 1rem;
        border-radius: 4px;
        border-left: 4px solid #ffc107;
    }

    .ProseMirror p.callout {
        background-color: #e3f2fd;
        padding: 1rem;
        border-radius: 4px;
        border-left: 4px solid #2196f3;
        font-weight: 500;
    }

    .ProseMirror p.centered {
        text-align: center;
    }

    /* Table classes */
    .ProseMirror table.bordered {
        border: 2px solid #dee2e6;
        border-collapse: collapse;
    }

    .ProseMirror table.bordered td,
    .ProseMirror table.bordered th {
        border: 1px solid #dee2e6;
    }

    .ProseMirror table.striped tr:nth-child(even) {
        background-color: #f8f9fa;
    }

    .ProseMirror table.compact {
        font-size: 0.875rem;
    }

    .ProseMirror table.compact td,
    .ProseMirror table.compact th {
        padding: 0.25rem 0.5rem;
    }

    /* Table cell classes */
    .ProseMirror td.centered,
    .ProseMirror th.centered {
        text-align: center;
    }

    .ProseMirror td.right-aligned {
        text-align: right;
    }

    .ProseMirror td.numeric,
    .ProseMirror th.numeric {
        text-align: right;
        font-family: 'Monaco', 'Menlo', monospace;
    }

    /* Heading classes */
    .ProseMirror h1.section-title,
    .ProseMirror h2.section-title {
        border-bottom: 2px solid #e9ecef;
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
    }

    .ProseMirror .accent {
        color: #6f42c1;
        border-left: 4px solid #6f42c1;
        padding-left: 1rem;
    }

Example Use Cases
-----------------

**Table Styling**
    Apply consistent styling to tables with node-specific classes:

    - Tables: ``bordered``, ``striped``, ``compact``
    - Cells: ``centered``, ``right-aligned``, ``numeric``

**Content Organization**
    Use different classes for different content types:

    - Paragraphs: ``highlight``, ``callout``, ``summary``
    - Headings: ``section-title``, ``chapter-heading``

**Layout Control**
    Apply layout modifications per node type:

    - Paragraphs: ``centered``, ``justified``
    - Tables: ``full-width``, ``auto-width``

**Semantic Styling**
    Use semantic classes that make sense for specific elements:

    - Code blocks: ``language-python``, ``terminal``
    - Blockquotes: ``testimonial``, ``definition``

Best Practices
--------------

1. **Node-Specific Classes**: Define classes that make sense for each node type rather than applying all classes globally
2. **Semantic Naming**: Use class names that describe purpose (``numeric-cell``) rather than appearance (``right-aligned``)
3. **Consistent Patterns**: Use consistent naming patterns across node types (``table-compact``, ``paragraph-compact``)
4. **Limit Options**: Don't overwhelm users with too many class options per node type
5. **Test Combinations**: Verify that multiple classes work well together on the same node
6. **Document Usage**: Provide clear guidelines on when to use each class

Configuration Patterns
-----------------------

**Content-Focused Pattern**
    Organize classes by content purpose:

.. code-block:: python

    "cssClasses": {
        "paragraph": ["intro", "summary", "highlight", "note"],
        "heading": ["chapter", "section", "subsection"],
        "table": ["data", "comparison", "summary"]
    }

**Layout-Focused Pattern**
    Organize classes by visual layout:

.. code-block:: python

    "cssClasses": {
        "paragraph": ["centered", "justified", "indented"],
        "table": ["full-width", "compact", "bordered"],
        "tableCell": ["centered", "right", "nowrap"]
    }

**Mixed Pattern**
    Combine content and layout classes:

.. code-block:: python

    "cssClasses": {
        "paragraph": [
            # Content classes
            "highlight", "note", "warning",
            # Layout classes
            "centered", "indented"
        ],
        "table": [
            # Style classes
            "bordered", "striped",
            # Layout classes
            "compact", "full-width"
        ]
    }

Comparison with TextClass
-------------------------

NodeClass complements TextClass by targeting different content levels:

- **TextClass**: Applies to inline text spans within content (``<span class="...">``)
- **NodeClass**: Applies to entire block-level elements (``<p class="...">``, ``<table class="...">``)

Use TextClass for styling words or phrases within paragraphs, and NodeClass for styling entire structural elements. They can be used together for comprehensive styling control.
