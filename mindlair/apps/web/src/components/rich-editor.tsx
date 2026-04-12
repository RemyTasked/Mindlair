"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useCallback, useEffect } from "react";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Heading2,
  Heading3,
  List,
  Quote,
  Code,
  X,
} from "lucide-react";

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
};

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: isActive ? `${C.accent}30` : "transparent",
        border: `1px solid ${isActive ? C.accent : C.border}`,
        borderRadius: 6,
        padding: "6px 8px",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: isActive ? C.accent : C.textSoft,
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function LinkModal({
  isOpen,
  onClose,
  onSubmit,
  initialUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  initialUrl: string;
}) {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 24,
          width: "100%",
          maxWidth: 400,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: 0 }}>Insert Link</h3>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}
          >
            <X size={18} style={{ color: C.muted }} />
          </button>
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          autoFocus
          style={{
            width: "100%",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 12px",
            color: C.text,
            fontSize: 14,
            outline: "none",
            marginBottom: 16,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url) {
              onSubmit(url);
            }
          }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "8px 16px",
              color: C.textSoft,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => url && onSubmit(url)}
            disabled={!url}
            style={{
              background: C.accent,
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              color: "#fff",
              fontSize: 14,
              cursor: url ? "pointer" : "not-allowed",
              opacity: url ? 1 : 0.5,
            }}
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const [showLinkModal, setShowLinkModal] = useState(false);

  const setLink = useCallback((url: string) => {
    if (!editor) return;
    
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setShowLinkModal(false);
  }, [editor]);

  if (!editor) return null;

  const currentLink = editor.getAttributes("link").href || "";

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          padding: "8px 12px",
          borderBottom: `1px solid ${C.border}`,
          background: C.bg,
          borderRadius: "12px 12px 0 0",
        }}
      >
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => setShowLinkModal(true)}
          isActive={editor.isActive("link")}
          title="Link (Ctrl+K)"
        >
          <LinkIcon size={16} />
        </ToolbarButton>

        <div style={{ width: 1, background: C.border, margin: "0 4px" }} />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </ToolbarButton>

        <div style={{ width: 1, background: C.border, margin: "0 4px" }} />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List size={16} />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Quote"
        >
          <Quote size={16} />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <Code size={16} />
        </ToolbarButton>
      </div>

      <LinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSubmit={setLink}
        initialUrl={currentLink}
      />
    </>
  );
}

export function RichEditor({ content, onChange, placeholder }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          style: `color: ${C.accent}; text-decoration: underline;`,
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Write your argument...",
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: `
          min-height: 300px;
          padding: 16px;
          outline: none;
          color: ${C.text};
          font-size: 16px;
          line-height: 1.7;
        `,
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
      }}
    >
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <style jsx global>{`
        .tiptap {
          outline: none;
        }
        .tiptap p {
          margin: 0 0 1em 0;
        }
        .tiptap p:last-child {
          margin-bottom: 0;
        }
        .tiptap h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 1.5em 0 0.5em 0;
          color: ${C.text};
        }
        .tiptap h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 1.25em 0 0.5em 0;
          color: ${C.text};
        }
        .tiptap ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .tiptap li {
          margin: 0.25em 0;
        }
        .tiptap blockquote {
          border-left: 3px solid ${C.accent};
          padding-left: 1em;
          margin: 1em 0;
          color: ${C.textSoft};
          font-style: italic;
        }
        .tiptap pre {
          background: ${C.bg};
          border: 1px solid ${C.border};
          border-radius: 8px;
          padding: 1em;
          margin: 1em 0;
          overflow-x: auto;
        }
        .tiptap code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.9em;
        }
        .tiptap a {
          color: ${C.accent};
          text-decoration: underline;
        }
        .tiptap p.is-editor-empty:first-child::before {
          color: ${C.muted};
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

export function getPlainTextFromHtml(html: string): string {
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

export function getWordCount(html: string): number {
  const text = getPlainTextFromHtml(html);
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}
