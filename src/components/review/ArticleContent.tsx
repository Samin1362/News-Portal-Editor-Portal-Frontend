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

interface Props {
  /** HTML content from the backend. */
  value: string;
  /** Read-only by default; editor toggles to true via the "Quick edit" switch. */
  editable: boolean;
  /** Only invoked while editable. */
  onChange?: (html: string) => void;
}

/**
 * Read-mostly TipTap surface. In editable mode the editor exposes a slim
 * toolbar for inline copy-edits (typo fixes during review). Image insertion
 * is deliberately omitted — heavy edits should bounce back to the author.
 */
export function ArticleContent({ value, editable, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
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
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "serif text-[16px] leading-[1.7] text-ink min-h-[260px] outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (editable) onChange?.(ed.getHTML());
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    if (value && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  // Re-render toolbar on selection changes.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const onSel = () => tick((n) => n + 1);
    editor.on("selectionUpdate", onSel);
    editor.on("transaction", onSel);
    return () => {
      editor.off("selectionUpdate", onSel);
      editor.off("transaction", onSel);
    };
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const next = window.prompt("Link URL", previous ?? "https://");
    if (next === null) return;
    if (next === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: next }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="border-[1.5px] border-ink rounded-sm bg-paper p-3 min-h-[300px] font-hand text-[12px] text-muted">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="border-[1.5px] border-ink rounded-sm bg-paper">
      {editable ? <Toolbar editor={editor} onSetLink={setLink} /> : null}
      <div className="px-5 py-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor, onSetLink }: { editor: Editor; onSetLink: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b-[1.5px] border-ink/30 bg-paper-2 sticky top-0 z-10">
      <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold">
        <Bold size={14} />
      </ToolBtn>
      <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic">
        <Italic size={14} />
      </ToolBtn>
      <ToolBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strikethrough">
        <Strikethrough size={14} />
      </ToolBtn>
      <Divider />
      <ToolBtn
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        label="Heading 2"
      >
        <Heading2 size={14} />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        label="Heading 3"
      >
        <Heading3 size={14} />
      </ToolBtn>
      <Divider />
      <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list">
        <List size={14} />
      </ToolBtn>
      <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Ordered list">
        <ListOrdered size={14} />
      </ToolBtn>
      <ToolBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Blockquote">
        <Quote size={14} />
      </ToolBtn>
      <Divider />
      <ToolBtn active={editor.isActive("link")} onClick={onSetLink} label="Insert link">
        <Link2 size={14} />
      </ToolBtn>
      <Divider />
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} label="Undo" disabled={!editor.can().undo()}>
        <Undo2 size={14} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} label="Redo" disabled={!editor.can().redo()}>
        <Redo2 size={14} />
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
