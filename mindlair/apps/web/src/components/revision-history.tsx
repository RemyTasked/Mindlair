"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet } from "./ui/sheet";
import { 
  History, 
  Loader2, 
  X, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
} from "lucide-react";

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
  green: "#a3c47a",
  rose: "#e57373",
  blue: "#4a9eff",
};

const changeTypeLabels: Record<string, { label: string; color: string }> = {
  edit: { label: "Edit", color: C.accent },
  qualification: { label: "Qualification", color: C.blue },
  retraction: { label: "Retraction", color: C.rose },
  reversal: { label: "Reversal", color: C.rose },
};

interface Revision {
  id: string;
  version: number;
  title: string;
  headlineClaim: string;
  body: string;
  authorStance: string;
  topicTags: string[];
  changeType?: string;
  changeNote?: string;
  editedAt?: string;
  isCurrent: boolean;
}

interface RevisionHistoryProps {
  postId: string;
  open: boolean;
  onClose: () => void;
  variant?: "side" | "bottom" | "modal";
}

export function RevisionHistory({ postId, open, onClose, variant = "side" }: RevisionHistoryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Revision | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    
    (async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/revisions`);
        const data = await res.json();
        
        if (!res.ok) {
          if (!cancelled) {
            setError(data.message || "Failed to load revisions");
          }
          return;
        }
        
        if (!cancelled) {
          setCurrent(data.current);
          setRevisions(data.revisions);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load revisions");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [postId, open]);

  const toggleExpand = (version: number) => {
    setExpandedVersion(expandedVersion === version ? null : version);
  };

  const renderRevisionItem = (revision: Revision, index: number) => {
    const isExpanded = expandedVersion === revision.version;
    const changeInfo = revision.changeType ? changeTypeLabels[revision.changeType] : null;
    
    return (
      <div
        key={revision.isCurrent ? "current" : revision.id}
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          marginBottom: index < revisions.length ? 12 : 0,
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => toggleExpand(revision.version)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 16,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ 
                color: revision.isCurrent ? C.green : C.textSoft, 
                fontSize: 14, 
                fontWeight: 600 
              }}>
                {revision.isCurrent ? "Current Version" : `Version ${revision.version}`}
              </span>
              {changeInfo && (
                <span style={{
                  padding: "2px 8px",
                  background: `${changeInfo.color}20`,
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 500,
                  color: changeInfo.color,
                }}>
                  {changeInfo.label}
                </span>
              )}
            </div>
            {revision.editedAt && (
              <span style={{ color: C.muted, fontSize: 12 }}>
                {new Date(revision.editedAt).toLocaleString()}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp size={18} style={{ color: C.muted }} />
          ) : (
            <ChevronDown size={18} style={{ color: C.muted }} />
          )}
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ 
                padding: "0 16px 16px",
                borderTop: `1px solid ${C.border}`,
                paddingTop: 16,
              }}>
                {revision.changeNote && (
                  <div style={{
                    background: `${C.accent}10`,
                    border: `1px solid ${C.accent}25`,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                  }}>
                    <span style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>
                      Change Note
                    </span>
                    <p style={{ color: C.textSoft, fontSize: 13, margin: "4px 0 0" }}>
                      {revision.changeNote}
                    </p>
                  </div>
                )}
                
                <div style={{ marginBottom: 12 }}>
                  <span style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>
                    Title
                  </span>
                  <p style={{ color: C.text, fontSize: 14, fontWeight: 500, margin: "4px 0 0" }}>
                    {revision.title}
                  </p>
                </div>
                
                <div style={{ marginBottom: 12 }}>
                  <span style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>
                    Claim
                  </span>
                  <p style={{ color: C.textSoft, fontSize: 14, fontStyle: "italic", margin: "4px 0 0" }}>
                    {revision.headlineClaim}
                  </p>
                </div>
                
                {revision.topicTags.length > 0 && (
                  <div>
                    <span style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" }}>
                      Tags
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {revision.topicTags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: "3px 8px",
                            background: C.surface,
                            borderRadius: 6,
                            fontSize: 12,
                            color: C.muted,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant={variant}
      snapPoints={variant === "bottom" ? [0.85] : undefined}
      header={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <History size={18} style={{ color: C.accent }} />
            <span style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>Revision History</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={18} style={{ color: C.muted }} />
          </button>
        </div>
      }
    >
      {isLoading ? (
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          padding: 48 
        }}>
          <Loader2 size={24} className="animate-spin" style={{ color: C.accent }} />
        </div>
      ) : error ? (
        <div style={{ 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center", 
          justifyContent: "center", 
          padding: 48,
          textAlign: "center",
        }}>
          <AlertCircle size={32} style={{ color: C.rose, marginBottom: 12 }} />
          <p style={{ color: C.rose, fontSize: 14 }}>{error}</p>
        </div>
      ) : (
        <div>
          {revisions.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: 32,
              color: C.muted,
            }}>
              <History size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>No revisions yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Edit history will appear here after the first edit
              </p>
            </div>
          ) : (
            <>
              {current && renderRevisionItem(current, -1)}
              {revisions.map((revision, index) => renderRevisionItem(revision, index))}
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
