// All these classes and utilities are available when importing the editor.js
// ESM module.

import { Editor, Extension } from "@tiptap/core"
import { Document } from "@tiptap/extension-document"
import { Dropcursor } from "@tiptap/extension-dropcursor"
import { Gapcursor } from "@tiptap/extension-gapcursor"
import { History } from "@tiptap/extension-history"
import { Paragraph } from "@tiptap/extension-paragraph"
import { HardBreak } from "@tiptap/extension-hard-break"
import { Text } from "@tiptap/extension-text"

import { Blockquote } from "@tiptap/extension-blockquote"
import { Bold } from "@tiptap/extension-bold"
import { BulletList } from "@tiptap/extension-bullet-list"
import { Heading } from "@tiptap/extension-heading"
import { HorizontalRule } from "@tiptap/extension-horizontal-rule"
import { Italic } from "@tiptap/extension-italic"
import { ListItem } from "@tiptap/extension-list-item"
import { OrderedList } from "@tiptap/extension-ordered-list"
import { Strike } from "@tiptap/extension-strike"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Underline } from "@tiptap/extension-underline"

import { Link } from "./link.js"
import { Menu } from "./menu.js"
import { NoSpellCheck } from "./nospellcheck.js"
import { Typographic } from "./typographic.js"
import { crel } from "./utils.js"

import { Plugin } from "@tiptap/pm/state"

const extensions = {
  base: [Document, Dropcursor, Gapcursor, Paragraph, HardBreak, Text],
  // lists: [BulletList, OrderedList, ListItem],
}

export {
  Editor,
  Extension,
  Plugin,
  crel,
  extensions,
  /* base extensions */
  Document,
  Dropcursor,
  Gapcursor,
  History,
  Paragraph,
  Text,
  /* nodes and marks */
  Blockquote,
  Bold,
  BulletList,
  Heading,
  HorizontalRule,
  Italic,
  ListItem,
  OrderedList,
  Strike,
  Subscript,
  Superscript,
  Underline,
  Link,
  /* others */
  Menu,
  NoSpellCheck,
  Typographic,
}
