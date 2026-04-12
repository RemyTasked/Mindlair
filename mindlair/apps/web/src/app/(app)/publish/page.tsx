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
  ImagePlus,
  Trash2,
  ArrowLeft,
  ChevronDown,
  Link as LinkIcon,
  Search,
  Quote,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RichEditor, getWordCount } from "@/components/rich-editor";


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
  
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;
  
  const [referencedPostId, setReferencedPostId] = useState<string | null>(null);
  const [referencedAnnotationId, setReferencedAnnotationId] = useState<string | null>(null);
  const [refPreview, setRefPreview] = useState<{
    id: string;
    headlineClaim: string;
    author: { id: string; name: string | null; avatarUrl: string | null };
  } | null>(null);
  const [annotationPreview, setAnnotationPreview] = useState<{
    id: string;
    selectedText: string;
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
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [showSeoSettings, setShowSeoSettings] = useState(false);
  const [slug, setSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editId) return;
    
    let cancelled = false;
    setIsLoadingPost(true);
    setError(null);
    
    (async () => {
      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(editId)}`);
        const data = await res.json();
        
        if (!res.ok) {
          if (!cancelled) {
            setError(data.message || "Could not load post");
            setIsLoadingPost(false);
          }
          return;
        }
        
        if (!cancelled && data.post) {
          const post = data.post;
          
          if (post.status !== "draft") {
            setError("Only draft posts can be edited");
            setIsLoadingPost(false);
            return;
          }
          
          setDraftId(post.id);
          setHeadlineClaim(post.headlineClaim || "");
          setBody(post.body || "");
          setAuthorStance(post.authorStance || "arguing");
          setThumbnailUrl(post.thumbnailUrl || null);
          setSlug(post.slug || "");
          setSeoTitle(post.seoTitle || "");
          setSeoDescription(post.seoDescription || "");
          
          if (post.referencedPostId) {
            setReferencedPostId(post.referencedPostId);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Could not load post");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPost(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [editId]);

  useEffect(() => {
    const ref = searchParams.get("ref") || searchParams.get("referencedPostId");
    const annotationId = searchParams.get("referencedAnnotationId");
    const highlightText = searchParams.get("highlightText");
    
    if (!ref || !ref.trim()) {
      setReferencedPostId(null);
      setRefPreview(null);
      setReferencedAnnotationId(null);
      setAnnotationPreview(null);
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
            setReferencedAnnotationId(null);
            setAnnotationPreview(null);
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
          
          if (annotationId) {
            try {
              const annotationRes = await fetch(`/api/annotations/${annotationId}`);
              const annotationData = await annotationRes.json();
              if (annotationRes.ok && annotationData.annotation) {
                setReferencedAnnotationId(annotationId);
                setAnnotationPreview({
                  id: annotationId,
                  selectedText: annotationData.annotation.selectedText,
                });
              }
            } catch {
              console.warn("Failed to load annotation preview");
            }
          } else if (highlightText) {
            setAnnotationPreview({
              id: "",
              selectedText: highlightText,
            });
          }
        }
      } catch {
        if (!cancelled) {
          setRefLoadError("Could not load referenced post");
          setReferencedPostId(null);
          setRefPreview(null);
          setReferencedAnnotationId(null);
          setAnnotationPreview(null);
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
    setReferencedAnnotationId(null);
    setAnnotationPreview(null);
    setRefLoadError(null);
    if (isEditMode) {
      router.replace(`/publish?edit=${editId}`);
    } else {
      router.replace("/publish");
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingThumbnail(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload image");
      }

      setThumbnailUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploadingThumbnail(false);
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = "";
      }
    }
  };

  const removeThumbnail = () => {
    setThumbnailUrl(null);
  };

  const wordCount = getWordCount(body);
  const charCount = headlineClaim.length;
  
  const isValidClaim = charCount >= 10 && charCount <= 280;
  const isValidBody = wordCount >= 100 && wordCount <= 2000;
  const canPublish = isValidClaim && isValidBody && !isSubmitting && !isPublishing && !isLoadingPost;

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
            referencedAnnotationId,
            thumbnailUrl,
            slug: slug || null,
            seoTitle: seoTitle || null,
            seoDescription: seoDescription || null,
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
            ...(referencedAnnotationId ? { referencedAnnotationId } : {}),
            ...(thumbnailUrl ? { thumbnailUrl } : {}),
            ...(slug ? { slug } : {}),
            ...(seoTitle ? { seoTitle } : {}),
            ...(seoDescription ? { seoDescription } : {}),
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
            ...(referencedAnnotationId ? { referencedAnnotationId } : {}),
            ...(thumbnailUrl ? { thumbnailUrl } : {}),
            ...(slug ? { slug } : {}),
            ...(seoTitle ? { seoTitle } : {}),
            ...(seoDescription ? { seoDescription } : {}),
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
    if (isLoadingPost || !headlineClaim.trim() || getWordCount(body) < 20) return;
    
    const timer = setTimeout(() => {
      saveDraft();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [headlineClaim, body, authorStance, referencedPostId, referencedAnnotationId, thumbnailUrl, isLoadingPost]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 16px 100px" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 720, margin: "0 auto" }}
      >
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            color: C.textSoft,
            fontSize: 14,
            cursor: "pointer",
            marginBottom: 16,
            padding: 0,
          }}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ 
            fontSize: 28, 
            fontWeight: 600, 
            color: C.text,
            marginBottom: 8,
          }}>
            {isEditMode ? "Edit Draft" : "Post"}
          </h1>
          <p style={{ color: C.textSoft, fontSize: 15 }}>
            {isEditMode 
              ? "Continue working on your draft."
              : "Share your thinking. Every post shapes your belief map."}
          </p>
        </div>

        {/* Loading State for Edit Mode */}
        {isLoadingPost && (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            padding: 48,
          }}>
            <Loader2 size={32} className="animate-spin" style={{ color: C.accent }} />
          </div>
        )}

        {!isLoadingPost && (
          <>
        {/* Referenced post preview */}
        {refPreview && (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 16,
              marginBottom: annotationPreview ? 0 : 16,
              borderBottomLeftRadius: annotationPreview ? 0 : 12,
              borderBottomRightRadius: annotationPreview ? 0 : 12,
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

        {/* Annotation preview (quoted passage) */}
        {refPreview && annotationPreview && (
          <div
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderTop: "none",
              borderRadius: "0 0 12px 12px",
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Quote size={16} style={{ color: C.accent, flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Responding to passage:</div>
                <p
                  style={{
                    color: C.textSoft,
                    fontSize: 14,
                    lineHeight: 1.5,
                    margin: 0,
                    fontStyle: "italic",
                  }}
                >
                  "{annotationPreview.selectedText.length > 200
                    ? annotationPreview.selectedText.slice(0, 200) + "..."
                    : annotationPreview.selectedText}"
                </p>
              </div>
            </div>
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

        {/* Thumbnail Upload */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: C.textSoft, fontSize: 14, fontWeight: 500, display: "block", marginBottom: 8 }}>
            Thumbnail (optional)
          </label>
          
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleThumbnailUpload}
            style={{ display: "none" }}
          />

          {thumbnailUrl ? (
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 400,
                borderRadius: 12,
                overflow: "hidden",
                border: `1px solid ${C.border}`,
              }}
            >
              <img
                src={thumbnailUrl}
                alt="Post thumbnail"
                style={{
                  width: "100%",
                  height: "auto",
                  aspectRatio: "16/9",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <button
                onClick={removeThumbnail}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "rgba(0,0,0,0.7)",
                  border: "none",
                  borderRadius: 8,
                  padding: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={16} style={{ color: C.rose }} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => thumbnailInputRef.current?.click()}
              disabled={isUploadingThumbnail}
              style={{
                width: "100%",
                maxWidth: 400,
                aspectRatio: "16/9",
                background: C.surface,
                border: `2px dashed ${C.border}`,
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                cursor: isUploadingThumbnail ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => !isUploadingThumbnail && (e.currentTarget.style.borderColor = C.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
            >
              {isUploadingThumbnail ? (
                <Loader2 size={24} className="animate-spin" style={{ color: C.accent }} />
              ) : (
                <>
                  <ImagePlus size={32} style={{ color: C.muted }} />
                  <span style={{ color: C.textSoft, fontSize: 14 }}>Click to upload thumbnail</span>
                  <span style={{ color: C.muted, fontSize: 12 }}>JPEG, PNG, WebP, GIF (max 2MB)</span>
                </>
              )}
            </button>
          )}
        </div>

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

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2">
            {(Object.keys(stanceInfo) as AuthorStance[]).map((stance) => {
              const info = stanceInfo[stance];
              const Icon = info.icon;
              const isSelected = authorStance === stance;
              
              return (
                <motion.button
                  key={stance}
                  className="min-w-0 w-full"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAuthorStance(stance)}
                  style={{
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
                    overflowWrap: "break-word",
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
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: 8,
          }}>
            <label style={{ color: C.textSoft, fontSize: 14, fontWeight: 500 }}>
              Your Argument
            </label>
            <span style={{ 
              color: isValidBody ? C.muted : wordCount > 2000 ? C.rose : C.accent, 
              fontSize: 12 
            }}>
              {wordCount} / 100-2000 words
            </span>
          </div>
          
          <RichEditor
            content={body}
            onChange={setBody}
            placeholder="Make your case. Use formatting to structure your argument."
          />
        </div>

        {/* SEO Settings (Collapsible) */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setShowSeoSettings(!showSeoSettings)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "12px 16px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: showSeoSettings ? "12px 12px 0 0" : 12,
              cursor: "pointer",
              color: C.textSoft,
              fontSize: 14,
              fontWeight: 500,
              textAlign: "left",
            }}
          >
            <Search size={16} />
            SEO & URL Settings
            <ChevronDown
              size={16}
              style={{
                marginLeft: "auto",
                transform: showSeoSettings ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            />
          </button>

          <AnimatePresence>
            {showSeoSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  padding: 16,
                  overflow: "hidden",
                }}
              >
                {/* URL Slug */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ color: C.textSoft, fontSize: 13, fontWeight: 500, display: "block", marginBottom: 8 }}>
                    Custom URL Slug
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <LinkIcon size={14} style={{ color: C.muted, flexShrink: 0 }} />
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="my-custom-url"
                      style={{
                        flex: 1,
                        background: C.bg,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        color: C.text,
                        fontSize: 14,
                        outline: "none",
                      }}
                    />
                  </div>
                  <p style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
                    {slug 
                      ? `mindlair.app/post/${slug}`
                      : "Leave blank to use post ID as URL"
                    }
                  </p>
                </div>

                {/* SEO Title */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ color: C.textSoft, fontSize: 13, fontWeight: 500 }}>
                      SEO Title (optional)
                    </label>
                    <span style={{ color: seoTitle.length > 60 ? C.rose : C.muted, fontSize: 11 }}>
                      {seoTitle.length}/70
                    </span>
                  </div>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value.slice(0, 70))}
                    placeholder={headlineClaim || "Defaults to your headline"}
                    style={{
                      width: "100%",
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: C.text,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                  <p style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
                    Custom title for search engines and social sharing
                  </p>
                </div>

                {/* SEO Description */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ color: C.textSoft, fontSize: 13, fontWeight: 500 }}>
                      Meta Description (optional)
                    </label>
                    <span style={{ color: seoDescription.length > 155 ? C.rose : C.muted, fontSize: 11 }}>
                      {seoDescription.length}/160
                    </span>
                  </div>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value.slice(0, 160))}
                    placeholder="Brief description for search results..."
                    rows={2}
                    style={{
                      width: "100%",
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: C.text,
                      fontSize: 14,
                      lineHeight: 1.5,
                      resize: "none",
                      outline: "none",
                    }}
                  />
                  <p style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
                    Shown in Google search results and social media previews
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              <span style={{ marginLeft: 8 }}>{isEditMode ? "Publish" : "Post"}</span>
            </Button>
          </div>
        </div>

        {/* Posting Note */}
        <div style={{
          marginTop: 32,
          padding: 16,
          background: `${C.accent}10`,
          border: `1px solid ${C.accent}30`,
          borderRadius: 12,
        }}>
          <p style={{ color: C.textSoft, fontSize: 13, lineHeight: 1.6 }}>
            <strong style={{ color: C.accent }}>What happens when you post:</strong>{" "}
            Your post goes through AI screening, then claim extraction. The claims 
            become part of your belief map — posting is the strongest signal of 
            what you actually think.
          </p>
        </div>
          </>
        )}
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
