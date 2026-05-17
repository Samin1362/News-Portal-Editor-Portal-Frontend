"use client";

import { useCallback, useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { MediaDTO } from "@/lib/types/media";
import { MediaPicker } from "./MediaPicker";

interface Props {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

/**
 * TipTap-based rich text editor — StarterKit + Image + Link extensions.
 * Image button opens the MediaPicker drawer; Link uses prompt() for simplicity.
 */
export function RichTextEditor({ value, onChange, disabled }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({ HTMLAttributes: { class: "rounded-sm" } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
          class: "text-accent underline",
        },
      }),
    ],
    content: value || "<p></p>",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "font-serif text-[16px] leading-[1.7] text-ink min-h-[260px] outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  // Keep external value changes in sync (e.g. resetting after save).
  useEffect(() => {
    if (!editor) return;
    if (value && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  // Track editor selection so toolbar buttons reflect cursor position.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const onSelection = () => forceTick((n) => n + 1);
    editor.on("selectionUpdate", onSelection);
    editor.on("transaction", onSelection);
    return () => {
      editor.off("selectionUpdate", onSelection);
      editor.off("transaction", onSelection);
    };
  }, [editor]);

  const insertImage = useCallback(
    (media: MediaDTO) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .setImage({ src: media.url, alt: media.alt ?? "" })
        .run();
    },
    [editor],
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const next = window.prompt("Link URL", previous ?? "https://");
    if (next === null) return;
    if (next === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: next })
      .run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="border-[1.5px] border-ink rounded-sm bg-paper p-3 min-h-[300px] font-hand text-[12px] text-muted">
        Loading editor…
      </div>
    );
  }

  return (
    <>
      <div className="border-[1.5px] border-ink rounded-sm bg-paper">
        <Toolbar
          editor={editor}
          disabled={disabled}
          onInsertImage={() => setPickerOpen(true)}
          onSetLink={setLink}
        />
        <div className="px-4 py-3">
          <EditorContent editor={editor} />
        </div>
      </div>
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        type="image"
        mode="single"
        title="Insert image"
        onSelect={insertImage}
      />
    </>
  );
}

interface ToolbarProps {
  editor: Editor;
  disabled?: boolean;
  onInsertImage: () => void;
  onSetLink: () => void;
}

function Toolbar({ editor, disabled, onInsertImage, onSetLink }: ToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 px-2 py-1.5 border-b-[1.5px] border-ink/30 bg-paper-2",
        disabled && "opacity-60 pointer-events-none",
      )}
    >
      <ToolBtn
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Bold"
      >
        <Bold size={14} aria-hidden />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Italic"
      >
        <Italic size={14} aria-hidden />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        label="Strikethrough"
      >
        <Strikethrough size={14} aria-hidden />
      </ToolBtn>
      <Divider />
      <ToolBtn
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        label="Heading 2"
      >
        <Heading2 size={14} aria-hidden />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        label="Heading 3"
      >
        <Heading3 size={14} aria-hidden />
      </ToolBtn>
      <Divider />
      <ToolBtn
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Bullet list"
      >
        <List size={14} aria-hidden />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Ordered list"
      >
        <ListOrdered size={14} aria-hidden />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        label="Blockquote"
      >
        <Quote size={14} aria-hidden />
      </ToolBtn>
      <Divider />
      <ToolBtn
        active={editor.isActive("link")}
        onClick={onSetLink}
        label="Insert link"
      >
        <Link2 size={14} aria-hidden />
      </ToolBtn>
      <ToolBtn onClick={onInsertImage} label="Insert image">
        <ImageIcon size={14} aria-hidden />
      </ToolBtn>
      <Divider />
      <ToolBtn
        onClick={() => editor.chain().focus().undo().run()}
        label="Undo"
        disabled={!editor.can().undo()}
      >
        <Undo2 size={14} aria-hidden />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().redo().run()}
        label="Redo"
        disabled={!editor.can().redo()}
      >
        <Redo2 size={14} aria-hidden />
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  children,
  active,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-sm border-[1.5px] border-transparent text-ink",
        "hover:border-ink hover:bg-paper",
        "disabled:opacity-40 disabled:hover:border-transparent",
        active && "bg-ink text-paper border-ink",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-ink/20" />;
}
