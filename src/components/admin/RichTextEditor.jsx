import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Undo2,
  Redo2,
  Minus,
  Code,
} from "lucide-react";

function ToolButton({ active, onClick, disabled, label, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
        active
          ? "bg-red-600 text-white shadow-sm"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange, disabled, onRequestImage }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Image.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({
        placeholder: "Start writing your story. Use the toolbar to format headings, quotes, links, and images…",
      }),
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "blog-editor-content focus:outline-none",
      },
    },
    onUpdate: ({ editor: next }) => {
      onChange?.(next.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href || "";
    const url = window.prompt("Link URL", previous);
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const setImage = () => {
    if (!editor) return;
    if (onRequestImage) {
      onRequestImage((url) => {
        if (url) editor.chain().focus().setImage({ src: url }).run();
      });
      return;
    }
    const url = window.prompt("Image URL");
    if (!url?.trim()) return;
    editor.chain().focus().setImage({ src: url.trim() }).run();
  };

  if (!editor) {
    return (
      <div className="min-h-[420px] rounded-2xl border border-gray-200 bg-white animate-pulse" />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 focus-within:shadow-lg focus-within:border-red-200">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-white/95 px-2 py-2 backdrop-blur">
        <ToolButton label="Undo" disabled={disabled} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </ToolButton>
        <ToolButton label="Redo" disabled={disabled} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolButton label="Heading 2" disabled={disabled} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={15} />
        </ToolButton>
        <ToolButton label="Heading 3" disabled={disabled} active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={15} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolButton label="Bold" disabled={disabled} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolButton>
        <ToolButton label="Italic" disabled={disabled} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolButton>
        <ToolButton label="Underline" disabled={disabled} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={15} />
        </ToolButton>
        <ToolButton label="Strikethrough" disabled={disabled} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={15} />
        </ToolButton>
        <ToolButton label="Highlight" disabled={disabled} active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter size={15} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolButton label="Bulleted list" disabled={disabled} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </ToolButton>
        <ToolButton label="Numbered list" disabled={disabled} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </ToolButton>
        <ToolButton label="Quote" disabled={disabled} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={15} />
        </ToolButton>
        <ToolButton label="Code block" disabled={disabled} active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code size={15} />
        </ToolButton>
        <ToolButton label="Divider" disabled={disabled} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={15} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolButton label="Align left" disabled={disabled} active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft size={15} />
        </ToolButton>
        <ToolButton label="Align center" disabled={disabled} active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter size={15} />
        </ToolButton>
        <ToolButton label="Align right" disabled={disabled} active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight size={15} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <ToolButton label="Link" disabled={disabled} active={editor.isActive("link")} onClick={setLink}>
          <Link2 size={15} />
        </ToolButton>
        <ToolButton label="Insert image" disabled={disabled} onClick={setImage}>
          <ImageIcon size={15} />
        </ToolButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
