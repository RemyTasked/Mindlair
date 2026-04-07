"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  HelpCircle,
  MessageSquare,
  Eye,
  Lightbulb,
  Info,
  Smile,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const EMOJI_CATEGORIES = {
  "Smileys": ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥"],
  "Gestures": ["👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💪", "🦾", "🖐️", "✋", "🖖", "👋", "🤚", "🖐", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👀", "👁️", "🗣️", "👤", "👥"],
  "Objects": ["💡", "📚", "📖", "📝", "✏️", "📌", "📍", "🔍", "🔎", "💻", "🖥️", "📱", "⌨️", "🖱️", "💾", "💿", "📀", "🎬", "📷", "📹", "🎥", "📺", "📻", "🎙️", "🎧", "🎤", "🎵", "🎶", "🎼", "🎹", "🥁", "🎸", "🎺", "🎻", "🪕", "🎯", "🏆", "🥇", "🥈", "🥉"],
  "Symbols": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "⭐", "🌟", "✨", "⚡", "🔥", "💥", "💫", "💯", "✅", "❌", "❓", "❗", "⚠️", "🚫", "♻️", "✳️", "❇️", "🔰", "⚜️", "🔱", "📛", "🔴"],
  "Nature": ["🌸", "💮", "🏵️", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🪴", "🌲", "🌳", "🌴", "🌵", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🌾", "🌎", "🌍", "🌏", "🌙", "⭐", "🌟", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌧️", "⛈️", "🌩️", "🌈", "❄️", "💧", "🌊"],
};

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

type AuthorStance = "arguing" | "exploring" | "steelmanning";

const stanceInfo = {
  arguing: {
    label: "Arguing",
    description: "I believe this claim and am making the case for it",
    icon: MessageSquare,
    color: C.green,
  },
  exploring: {
    label: "Exploring",
    description: "I'm genuinely uncertain and exploring this idea",
    icon: Eye,
    color: C.accent,
  },
  steelmanning: {
    label: "Steelmanning",
    description: "I'm presenting the strongest version of a position I may not hold",
    icon: Lightbulb,
    color: C.blue,
  },
};

function PublishPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [referencedPostId, setReferencedPostId] = useState<string | null>(null);
  const [refPreview, setRefPreview] = useState<{
    id: string;
    headlineClaim: string;
    author: { id: string; name: string | null; avatarUrl: string | null };
  } | null>(null);
  const [refLoadError, setRefLoadError] = useState<string | null>(null);

  const [headlineClaim, setHeadlineClaim] = useState("");
  const [body, setBody] = useState("");
  const [authorStance, setAuthorStance] = useState<AuthorStance>("arguing");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showStanceHelp, setShowStanceHelp] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>("Smileys");
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref || !ref.trim()) {
      setReferencedPostId(null);
      setRefPreview(null);
      setRefLoadError(null);
      return;
    }
    const id = ref.trim();
    let cancelled = false;
    (async () => {
      setRefLoadError(null);
      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(id)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            setRefLoadError(typeof data.message === "string" ? data.message : "Could not load referenced post");
            setReferencedPostId(null);
            setRefPreview(null);
          }
          return;
        }
        if (!cancelled && data.post) {
          setReferencedPostId(data.post.id);
          setRefPreview({
            id: data.post.id,
            headlineClaim: data.post.headlineClaim,
            author: data.post.author,
          });
        }
      } catch {
        if (!cancelled) {
          setRefLoadError("Could not load referenced post");
          setReferencedPostId(null);
          setRefPreview(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const clearReferencedPost = () => {
    setReferencedPostId(null);
    setRefPreview(null);
    setRefLoadError(null);
    router.replace("/publish");
  };

  const insertEmoji = (emoji: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;
    
    const start = cursorPositionRef.current;
    const newBody = body.slice(0, start) + emoji + body.slice(start);
    setBody(newBody);
    
    setTimeout(() => {
      const newPosition = start + emoji.length;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
      cursorPositionRef.current = newPosition;
    }, 0);
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);
    cursorPositionRef.current = e.target.selectionStart;
  };

  const handleBodySelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    cursorPositionRef.current = (e.target as HTMLTextAreaElement).selectionStart;
  };

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const charCount = headlineClaim.length;
  
  const isValidClaim = charCount >= 10 && charCount <= 280;
  const isValidBody = wordCount >= 100 && wordCount <= 2000;
  const canPublish = isValidClaim && isValidBody && !isSubmitting && !isPublishing;

  const saveDraft = async () => {
    if (!headlineClaim.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (draftId) {
        // Update existing draft
        const response = await fetch(`/api/posts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headlineClaim,
            postBody: body,
            authorStance,
            referencedPostId,
          }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to save draft");
        }
      } else {
        // Create new draft
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headlineClaim,
            postBody: body,
            authorStance,
            ...(referencedPostId ? { referencedPostId } : {}),
          }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to save draft");
        }
        
        const data = await response.json();
        setDraftId(data.post.id);
      }
      
      setLastSaved(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setIsSubmitting(false);
    }
  };

  const publish = async () => {
    if (!canPublish) return;
    
    setIsPublishing(true);
    setError(null);
    
    try {
      // Save draft first if needed
      let postId = draftId;
      if (!postId) {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headlineClaim,
            postBody: body,
            authorStance,
            ...(referencedPostId ? { referencedPostId } : {}),
          }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to create post");
        }
        
        const data = await response.json();
        postId = data.post.id;
        setDraftId(postId);
      }
      
      // Publish the post
      const publishResponse = await fetch(`/api/posts/${postId}/publish`, {
        method: "POST",
      });
      
      if (!publishResponse.ok) {
        const data = await publishResponse.json();
        throw new Error(data.message || "Failed to publish post");
      }
      
      // Redirect to feed on success
      router.push("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  // Auto-save draft after inactivity
  useEffect(() => {
    if (!headlineClaim.trim() || body.trim().length < 50) return;
    
    const timer = setTimeout(() => {
      saveDraft();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [headlineClaim, body, authorStance, referencedPostId]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 16px 100px" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 720, margin: "0 auto" }}
      >
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ 
            fontSize: 28, 
            fontWeight: 600, 
            color: C.text,
            marginBottom: 8,
          }}>
            Publish
          </h1>
          <p style={{ color: C.textSoft, fontSize: 15 }}>
            Share your thinking. Every post you publish shapes your belief map.
          </p>
        </div>

        {/* Referenced post preview */}
        {refPreview && (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>In response to</div>
              <Link
                href={`/post/${refPreview.id}`}
                style={{ color: C.accent, fontSize: 15, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                {refPreview.headlineClaim}
              </Link>
              <div style={{ color: C.textSoft, fontSize: 13, marginTop: 6 }}>
                {refPreview.author?.name || "Anonymous"}
              </div>
            </div>
            <button
              type="button"
              onClick={clearReferencedPost}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "8px 12px",
                color: C.textSoft,
                fontSize: 13,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Remove
            </button>
          </div>
        )}

        {refLoadError && (
          <div
            style={{
              background: `${C.rose}12`,
              border: `1px solid ${C.rose}35`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              color: C.rose,
              fontSize: 13,
            }}
          >
            {refLoadError}
          </div>
        )}

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: `${C.rose}15`,
                border: `1px solid ${C.rose}40`,
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <AlertCircle size={20} style={{ color: C.rose, flexShrink: 0 }} />
              <p style={{ color: C.rose, fontSize: 14 }}>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Author Stance Selector */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 8, 
            marginBottom: 12 
          }}>
            <span style={{ color: C.textSoft, fontSize: 14, fontWeight: 500 }}>
              Your stance
            </span>
            <button
              onClick={() => setShowStanceHelp(!showStanceHelp)}
              style={{ 
                background: "none", 
                border: "none", 
                cursor: "pointer",
                padding: 4,
              }}
            >
              <HelpCircle size={16} style={{ color: C.muted }} />
            </button>
          </div>
          
          <AnimatePresence>
            {showStanceHelp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <Info size={18} style={{ color: C.accent, marginTop: 2 }} />
                  <p style={{ color: C.textSoft, fontSize: 14, lineHeight: 1.6 }}>
                    Your stance helps readers understand your relationship to the claim. 
                    This context changes how they interpret your argument — and how it 
                    updates both your map and theirs.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: "flex", gap: 8 }}>
            {(Object.keys(stanceInfo) as AuthorStance[]).map((stance) => {
              const info = stanceInfo[stance];
              const Icon = info.icon;
              const isSelected = authorStance === stance;
              
              return (
                <motion.button
                  key={stance}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAuthorStance(stance)}
                  style={{
                    flex: 1,
                    background: isSelected ? `${info.color}20` : C.surface,
                    border: `1px solid ${isSelected ? info.color : C.border}`,
                    borderRadius: 12,
                    padding: "12px 16px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Icon size={16} style={{ color: isSelected ? info.color : C.muted }} />
                    <span style={{ 
                      color: isSelected ? C.text : C.textSoft, 
                      fontWeight: 500,
                      fontSize: 14,
                    }}>
                      {info.label}
                    </span>
                  </div>
                  <p style={{ 
                    color: C.muted, 
                    fontSize: 12, 
                    textAlign: "left",
                    lineHeight: 1.4,
                  }}>
                    {info.description}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Headline Claim Input */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: 8,
          }}>
            <label style={{ color: C.textSoft, fontSize: 14, fontWeight: 500 }}>
              Headline Claim
            </label>
            <span style={{ 
              color: isValidClaim ? C.muted : C.rose, 
              fontSize: 12 
            }}>
              {charCount}/280
            </span>
          </div>
          
          <textarea
            value={headlineClaim}
            onChange={(e) => setHeadlineClaim(e.target.value)}
            placeholder="State a specific, falsifiable position — not a topic."
            style={{
              width: "100%",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 16,
              color: C.text,
              fontSize: 18,
              fontWeight: 500,
              lineHeight: 1.4,
              resize: "none",
              minHeight: 80,
              outline: "none",
            }}
          />
          
          <p style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
            Example: &quot;Remote work permanently reduced urban commercial real estate value&quot; 
            — not &quot;Remote work is interesting&quot;
          </p>
        </div>

        {/* Body Editor */}
        <div style={{ marginBottom: 24, position: "relative" }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ color: C.textSoft, fontSize: 14, fontWeight: 500 }}>
                Your Argument
              </label>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  background: showEmojiPicker ? `${C.accent}20` : "transparent",
                  border: `1px solid ${showEmojiPicker ? C.accent : C.border}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: showEmojiPicker ? C.accent : C.muted,
                  fontSize: 13,
                }}
              >
                <Smile size={16} />
                <span>Emoji</span>
              </button>
            </div>
            <span style={{ 
              color: isValidBody ? C.muted : wordCount > 2000 ? C.rose : C.accent, 
              fontSize: 12 
            }}>
              {wordCount} / 100-2000 words
            </span>
          </div>

          {/* Emoji Picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  position: "absolute",
                  top: 40,
                  left: 0,
                  zIndex: 50,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 12,
                  width: 320,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ color: C.textSoft, fontSize: 13, fontWeight: 500 }}>Pick an emoji</span>
                  <button
                    onClick={() => setShowEmojiPicker(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                  >
                    <X size={16} style={{ color: C.muted }} />
                  </button>
                </div>
                
                {/* Category Tabs */}
                <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
                  {(Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setEmojiCategory(cat)}
                      style={{
                        background: emojiCategory === cat ? `${C.accent}20` : "transparent",
                        border: `1px solid ${emojiCategory === cat ? C.accent : C.border}`,
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 11,
                        color: emojiCategory === cat ? C.accent : C.muted,
                        cursor: "pointer",
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Emoji Grid */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(8, 1fr)", 
                  gap: 4,
                  maxHeight: 200,
                  overflowY: "auto",
                }}>
                  {EMOJI_CATEGORIES[emojiCategory].map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        insertEmoji(emoji);
                        setShowEmojiPicker(false);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        fontSize: 20,
                        padding: 4,
                        cursor: "pointer",
                        borderRadius: 4,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.border)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <textarea
            ref={bodyTextareaRef}
            value={body}
            onChange={handleBodyChange}
            onSelect={handleBodySelect}
            onClick={handleBodySelect}
            placeholder="Make your case. Focus on the argument, not the formatting. Use emojis to express yourself! 😊"
            style={{
              width: "100%",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 16,
              color: C.text,
              fontSize: 15,
              lineHeight: 1.7,
              resize: "vertical",
              minHeight: 300,
              outline: "none",
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ 
          display: "flex", 
          gap: 12, 
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            {lastSaved && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle size={14} style={{ color: C.green }} />
                <span style={{ color: C.muted, fontSize: 12 }}>
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
          
          <div style={{ display: "flex", gap: 12 }}>
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={isSubmitting || !headlineClaim.trim()}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.textSoft,
              }}
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span style={{ marginLeft: 8 }}>Save Draft</span>
            </Button>
            
            <Button
              onClick={publish}
              disabled={!canPublish}
              style={{
                background: canPublish ? C.accent : C.border,
                color: canPublish ? "#fff" : C.muted,
                border: "none",
              }}
            >
              {isPublishing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              <span style={{ marginLeft: 8 }}>Publish</span>
            </Button>
          </div>
        </div>

        {/* Publishing Note */}
        <div style={{
          marginTop: 32,
          padding: 16,
          background: `${C.accent}10`,
          border: `1px solid ${C.accent}30`,
          borderRadius: 12,
        }}>
          <p style={{ color: C.textSoft, fontSize: 13, lineHeight: 1.6 }}>
            <strong style={{ color: C.accent }}>What happens when you publish:</strong>{" "}
            Your post goes through AI screening, then claim extraction. The claims 
            become part of your belief map — publishing is the strongest signal of 
            what you actually think.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "#0f0e0c", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "#d4915a" }} />
        </div>
      }
    >
      <PublishPageContent />
    </Suspense>
  );
}
