(()=>{var i="data-django-prose-editor-default";function O(t){if(t.closest(".prose-editor"))return;let o=JSON.parse(t.getAttribute(i)),{Document:n,Dropcursor:l,Gapcursor:s,Paragraph:a,HardBreak:c,Text:u,Blockquote:d,Bold:g,BulletList:p,Heading:k,HorizontalRule:b,Italic:f,ListItem:h,OrderedList:m,Strike:E,Subscript:I,Superscript:T,Underline:B,Link:S,Menu:_,menuItemsFromConfig:D,NoSpellCheck:L,Typographic:j,createTextareaEditor:z}=DjangoProseEditor,e=(r=>H=>r!=null&&r.length?r.includes(H):!0)(o.types),C=[n,l,s,a,c,u,_.configure({menuItems:D(o)}),L,o.typographic&&j,e("blockquote")&&d,e("strong")&&g,e("bullet_list")&&p,e("heading")&&k,e("horizontal_rule")&&b,e("em")&&f,e("link")&&S.configure({openOnClick:!1}),(e("bullet_list")||e("ordered_list"))&&h,e("ordered_list")&&m,e("strikethrough")&&E,e("sub")&&I,e("sup")&&T,e("underline")&&B].filter(Boolean);return z(t,C)}DjangoProseEditor.initializeEditors(O,`[${i}]`);})();
