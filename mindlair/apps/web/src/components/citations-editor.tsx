"use client";

import { useState } from "react";
import { Plus, X, Link as LinkIcon, FileText, Video, Mic, BookOpen, FileQuestion, Loader2 } from "lucide-react";

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
  rose: "#e57373",
};

export interface CitationDraft {
  url: string;
  title?: string | null;
  author?: string | null;
  outlet?: string | null;
  excerpt?: string | null;
  contentType: string;
}

interface CitationsEditorProps {
  citations: CitationDraft[];
  onChange: (citations: CitationDraft[]) => void;
  maxCitations?: number;
}

const CONTENT_TYPES = [
  { id: "article", label: "Article", icon: FileText },
  { id: "video", label: "Video", icon: Video },
  { id: "podcast", label: "Podcast", icon: Mic },
  { id: "paper", label: "Paper", icon: FileText },
  { id: "book", label: "Book", icon: BookOpen },
  { id: "other", label: "Other", icon: FileQuestion },
];

export function CitationsEditor({
  citations,
  onChange,
  maxCitations = 20,
}: CitationsEditorProps) {
  const [newUrl, setNewUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const isValidUrl = (url: string): boolean => {
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleAdd = async () => {
    setError(null);
    const url = newUrl.trim();
    if (!url) {
      setError("Enter a URL");
      return;
    }
    if (!isValidUrl(url)) {
      setError("Invalid URL");
      return;
    }
    if (citations.length >= maxCitations) {
      setError(`Maximum ${maxCitations} citations`);
      return;
    }

    let preview: { title?: string; outlet?: string; author?: string } = {};
    try {
      setIsFetching(true);
      const res = await fetch(`/api/og-preview?url=${encodeURIComponent(url)}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        preview = {
          title: data.title || undefined,
          outlet: data.siteName || undefined,
          author: data.author || undefined,
        };
      }
    } catch {
      // ignore preview errors; user can edit manually
    } finally {
      setIsFetching(false);
    }

    onChange([
      ...citations,
      {
        url,
        title: preview.title ?? null,
        author: preview.author ?? null,
        outlet: preview.outlet ?? null,
        excerpt: null,
        contentType: "article",
      },
    ]);
    setNewUrl("");
    setIsAdding(false);
  };

  const handleRemove = (index: number) => {
    onChange(citations.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, patch: Partial<CitationDraft>) => {
    onChange(
      citations.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  };

  return (
    <div>
      {citations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
          {citations.map((citation, index) => (
            <CitationRow
              key={index}
              citation={citation}
              onRemove={() => handleRemove(index)}
              onUpdate={(patch) => handleUpdate(index, patch)}
            />
          ))}
        </div>
      )}

      {isAdding ? (
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <LinkIcon size={14} style={{ color: C.muted, flexShrink: 0 }} />
            <input
              autoFocus
              type="url"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="https://example.com/article"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: C.text,
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>
          {error && (
            <p style={{ color: C.rose, fontSize: 12, marginBottom: 8 }}>{error}</p>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isFetching || !newUrl.trim()}
              style={{
                background: C.accent,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 500,
                cursor: isFetching ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isFetching ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Fetching...
                </>
              ) : (
                "Add"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewUrl("");
                setError(null);
              }}
              style={{
                background: "transparent",
                color: C.muted,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          disabled={citations.length >= maxCitations}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: `1px dashed ${C.border}`,
            borderRadius: 10,
            padding: "10px 14px",
            color: C.textSoft,
            fontSize: 13,
            cursor: citations.length >= maxCitations ? "not-allowed" : "pointer",
            width: "100%",
            justifyContent: "center",
            opacity: citations.length >= maxCitations ? 0.5 : 1,
          }}
        >
          <Plus size={14} />
          Add citation {citations.length > 0 && `(${citations.length}/${maxCitations})`}
        </button>
      )}
    </div>
  );
}

function CitationRow({
  citation,
  onRemove,
  onUpdate,
}: {
  citation: CitationDraft;
  onRemove: () => void;
  onUpdate: (patch: Partial<CitationDraft>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const TypeIcon =
    CONTENT_TYPES.find((t) => t.id === citation.contentType)?.icon || FileText;

  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${C.accent}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <TypeIcon size={14} style={{ color: C.accent }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            type="text"
            value={citation.title ?? ""}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Title"
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              color: C.text,
              fontSize: 14,
              fontWeight: 500,
              outline: "none",
              padding: 0,
              marginBottom: 4,
            }}
          />
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: C.muted,
              fontSize: 12,
              textDecoration: "none",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {citation.url}
          </a>

          {expanded && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={citation.author ?? ""}
                  onChange={(e) => onUpdate({ author: e.target.value })}
                  placeholder="Author (optional)"
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={citation.outlet ?? ""}
                  onChange={(e) => onUpdate({ outlet: e.target.value })}
                  placeholder="Outlet (optional)"
                  style={inputStyle}
                />
              </div>

              <textarea
                value={citation.excerpt ?? ""}
                onChange={(e) => onUpdate({ excerpt: e.target.value })}
                placeholder="Quote or excerpt (optional)"
                rows={2}
                style={{
                  ...inputStyle,
                  resize: "none",
                }}
              />

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {CONTENT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onUpdate({ contentType: t.id })}
                    style={{
                      padding: "4px 10px",
                      background:
                        citation.contentType === t.id
                          ? `${C.accent}25`
                          : "transparent",
                      border: `1px solid ${
                        citation.contentType === t.id ? C.accent : C.border
                      }`,
                      borderRadius: 6,
                      color:
                        citation.contentType === t.id ? C.accent : C.textSoft,
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: citation.contentType === t.id ? 600 : 400,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: "transparent",
              border: "none",
              color: C.muted,
              fontSize: 11,
              cursor: "pointer",
              padding: 0,
              marginTop: 6,
              textDecoration: "underline",
            }}
          >
            {expanded ? "Less" : "Edit details"}
          </button>
        </div>

        <button
          type="button"
          onClick={onRemove}
          style={{
            background: "transparent",
            border: "none",
            color: C.muted,
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Remove citation"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  flex: 1,
  width: "100%",
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "6px 8px",
  color: C.text,
  fontSize: 12,
  outline: "none",
} as React.CSSProperties;
