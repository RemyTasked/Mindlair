"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
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
  Sparkles,
  X,
  Settings,
  Globe,
  Lock,
  Plus,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RichEditor, getWordCount } from "@/components/rich-editor";
import { formatPublicName } from "@/lib/display-name-policy";
import { CitationsEditor, type CitationDraft } from "@/components/citations-editor";


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
type Visibility = "public" | "unlisted";

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
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;
  
  const [referencedPostId, setReferencedPostId] = useState<string | null>(null);
  const [referencedAnnotationId, setReferencedAnnotationId] = useState<string | null>(null);
  const [refPreview, setRefPreview] = useState<{
    id: string;
    headlineClaim: string;
    title?: string;
    author: { id: string; name: string | null; avatarUrl: string | null };
  } | null>(null);
  const [annotationPreview, setAnnotationPreview] = useState<{
    id: string;
    selectedText: string;
  } | null>(null);
  const [refLoadError, setRefLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [headlineClaim, setHeadlineClaim] = useState("");
  const [claimRationale, setClaimRationale] = useState("");
  const [isGeneratingClaim, setIsGeneratingClaim] = useState(false);
  const [claimEdited, setClaimEdited] = useState(false);
  const [body, setBody] = useState("");
  const [authorStance, setAuthorStance] = useState<AuthorStance>("arguing");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [topicTags, setTopicTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showStanceHelp, setShowStanceHelp] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [slug, setSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [citations, setCitations] = useState<CitationDraft[]>([]);
  
  // Preflight state
  const [showPreflightModal, setShowPreflightModal] = useState(false);
  const [preflightConflicts, setPreflightConflicts] = useState<Array<{
    pastPostId: string;
    pastTitle: string;
    pastClaim: string;
    pastPublishedAt: string;
    type: "direct_contradiction" | "implicit_tension";
    explanation: string;
    confidence: number;
  }>>([]);
  const [isRunningPreflight, setIsRunningPreflight] = useState(false);
  const [preflightChecked, setPreflightChecked] = useState(false);
  
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const claimDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const tagDebounceRef = useRef<NodeJS.Timeout | null>(null);

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
          setTitle(post.title || "");
          setHeadlineClaim(post.headlineClaim || "");
          setBody(post.body || "");
          setAuthorStance(post.authorStance || "arguing");
          setVisibility(post.visibility || "public");
          setTopicTags(post.topicTags || []);
          setThumbnailUrl(post.thumbnailUrl || null);
          setSlug(post.slug || "");
          setSeoTitle(post.seoTitle || "");
          setSeoDescription(post.seoDescription || "");
          if (Array.isArray(post.citations)) {
            setCitations(
              post.citations.map((c: {
                url: string;
                title: string | null;
                author: string | null;
                outlet: string | null;
                excerpt: string | null;
                contentType: string;
              }) => ({
                url: c.url,
                title: c.title,
                author: c.author,
                outlet: c.outlet,
                excerpt: c.excerpt,
                contentType: c.contentType,
              }))
            );
          }
          
          if (post.headlineClaim) {
            setClaimEdited(true);
          }
          
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
            title: data.post.title,
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

  const generateClaim = useCallback(async () => {
    if (!title.trim() || getWordCount(body) < 50) return;
    
    setIsGeneratingClaim(true);
    try {
      const res = await fetch("/api/posts/suggest-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body,
          authorStance,
          currentClaim: claimEdited ? headlineClaim : undefined,
        }),
      });
      
      const data = await res.json();
      if (res.ok && data.claim) {
        setHeadlineClaim(data.claim);
        setClaimRationale(data.rationale || "");
        setClaimEdited(false);
      }
    } catch (err) {
      console.error("Failed to generate claim:", err);
    } finally {
      setIsGeneratingClaim(false);
    }
  }, [title, body, authorStance, headlineClaim, claimEdited]);

  const fetchTagSuggestions = useCallback(async () => {
    if (!title.trim() || body.trim().length < 100) return;
    
    setIsLoadingTags(true);
    try {
      const res = await fetch("/api/posts/suggest-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body,
        }),
      });
      
      const data = await res.json();
      if (res.ok && data.tags) {
        setSuggestedTags(data.tags.filter((t: string) => !topicTags.includes(t)));
      }
    } catch (err) {
      console.error("Failed to fetch tag suggestions:", err);
    } finally {
      setIsLoadingTags(false);
    }
  }, [title, body, topicTags]);

  useEffect(() => {
    if (claimDebounceRef.current) {
      clearTimeout(claimDebounceRef.current);
    }
    
    const wordCount = getWordCount(body);
    if (title.trim().length >= 3 && wordCount >= 50 && !claimEdited && !headlineClaim) {
      claimDebounceRef.current = setTimeout(() => {
        generateClaim();
      }, 1500);
    }
    
    return () => {
      if (claimDebounceRef.current) {
        clearTimeout(claimDebounceRef.current);
      }
    };
  }, [title, body, authorStance, claimEdited, headlineClaim, generateClaim]);

  useEffect(() => {
    if (tagDebounceRef.current) {
      clearTimeout(tagDebounceRef.current);
    }
    
    if (title.trim().length >= 3 && body.trim().length >= 100) {
      tagDebounceRef.current = setTimeout(() => {
        fetchTagSuggestions();
      }, 2000);
    }
    
    return () => {
      if (tagDebounceRef.current) {
        clearTimeout(tagDebounceRef.current);
      }
    };
  }, [title, body, fetchTagSuggestions]);

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

  const addTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag.length >= 2 && normalizedTag.length <= 40 && topicTags.length < 5 && !topicTags.includes(normalizedTag)) {
      setTopicTags([...topicTags, normalizedTag]);
      setSuggestedTags(suggestedTags.filter(t => t !== normalizedTag));
    }
  };

  const removeTag = (tag: string) => {
    setTopicTags(topicTags.filter(t => t !== tag));
  };

  const handleNewTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagInput.trim()) {
      addTag(newTagInput);
      setNewTagInput("");
    }
  };

  const wordCount = getWordCount(body);
  const titleCharCount = title.length;
  const claimCharCount = headlineClaim.length;
  
  const isValidTitle = titleCharCount >= 3 && titleCharCount <= 120;
  const isValidClaim = claimCharCount >= 10 && claimCharCount <= 280;
  const isValidBody = wordCount >= 100 && wordCount <= 2000;
  const canPublish = isValidTitle && isValidClaim && isValidBody && !isSubmitting && !isPublishing && !isLoadingPost;

  const saveDraft = async () => {
    if (!title.trim() || !headlineClaim.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (draftId) {
        const response = await fetch(`/api/posts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            headlineClaim,
            postBody: body,
            authorStance,
            visibility,
            topicTags,
            referencedPostId,
            referencedAnnotationId,
            thumbnailUrl,
            slug: slug || null,
            seoTitle: seoTitle || null,
            seoDescription: seoDescription || null,
            citations,
          }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to save draft");
        }
      } else {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            headlineClaim,
            postBody: body,
            authorStance,
            visibility,
            topicTags,
            ...(referencedPostId ? { referencedPostId } : {}),
            ...(referencedAnnotationId ? { referencedAnnotationId } : {}),
            ...(thumbnailUrl ? { thumbnailUrl } : {}),
            ...(slug ? { slug } : {}),
            ...(seoTitle ? { seoTitle } : {}),
            ...(seoDescription ? { seoDescription } : {}),
            ...(citations.length > 0 ? { citations } : {}),
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

  const runPreflight = async (postId: string): Promise<boolean> => {
    setIsRunningPreflight(true);
    try {
      const res = await fetch(`/api/posts/${postId}/preflight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateClaim: headlineClaim }),
      });
      
      if (!res.ok) {
        console.error("Preflight check failed");
        return true;
      }
      
      const data = await res.json();
      if (data.conflicts && data.conflicts.length > 0) {
        setPreflightConflicts(data.conflicts);
        setShowPreflightModal(true);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Preflight error:", err);
      return true;
    } finally {
      setIsRunningPreflight(false);
    }
  };

  const performPublish = async () => {
    setIsPublishing(true);
    setError(null);
    
    try {
      let postId = draftId;
      if (!postId) {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            headlineClaim,
            postBody: body,
            authorStance,
            visibility,
            topicTags,
            ...(referencedPostId ? { referencedPostId } : {}),
            ...(referencedAnnotationId ? { referencedAnnotationId } : {}),
            ...(thumbnailUrl ? { thumbnailUrl } : {}),
            ...(slug ? { slug } : {}),
            ...(seoTitle ? { seoTitle } : {}),
            ...(seoDescription ? { seoDescription } : {}),
            ...(citations.length > 0 ? { citations } : {}),
          }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to create post");
        }
        
        const data = await response.json();
        postId = data.post.id;
        setDraftId(postId);
      } else {
        // Persist any pending citation edits before publishing
        await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ citations }),
        }).catch(() => undefined);
      }
      
      const publishResponse = await fetch(`/api/posts/${postId}/publish`, {
        method: "POST",
      });
      
      if (!publishResponse.ok) {
        const data = await publishResponse.json();
        throw new Error(data.message || "Failed to publish post");
      }
      
      router.push("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  const publish = async () => {
    if (!canPublish) return;
    
    setIsPublishing(true);
    setError(null);
    
    try {
      let postId = draftId;
      if (!postId) {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            headlineClaim,
            postBody: body,
            authorStance,
            visibility,
            topicTags,
            ...(referencedPostId ? { referencedPostId } : {}),
            ...(referencedAnnotationId ? { referencedAnnotationId } : {}),
            ...(thumbnailUrl ? { thumbnailUrl } : {}),
            ...(slug ? { slug } : {}),
            ...(seoTitle ? { seoTitle } : {}),
            ...(seoDescription ? { seoDescription } : {}),
            ...(citations.length > 0 ? { citations } : {}),
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
      
      if (!preflightChecked) {
        const canProceed = await runPreflight(postId);
        if (!canProceed) {
          setIsPublishing(false);
          return;
        }
        setPreflightChecked(true);
      }
      
      await performPublish();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
      setIsPublishing(false);
    }
  };

  const handlePreflightContinue = () => {
    setShowPreflightModal(false);
    setPreflightChecked(true);
    performPublish();
  };

  const handlePreflightCancel = () => {
    setShowPreflightModal(false);
    setPreflightConflicts([]);
    setPreflightChecked(false);
  };

  useEffect(() => {
    if (isLoadingPost || !title.trim() || !headlineClaim.trim() || getWordCount(body) < 20) return;
    
    const timer = setTimeout(() => {
      saveDraft();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [title, headlineClaim, body, authorStance, visibility, topicTags, referencedPostId, referencedAnnotationId, thumbnailUrl, isLoadingPost]);

  const renderSettings = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Visibility */}
      <div>
        <label style={{ color: C.textSoft, fontSize: 14, fontWeight: 500, display: "block", marginBottom: 12 }}>
          Visibility
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setVisibility("public")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 16px",
              background: visibility === "public" ? `${C.green}20` : C.surface,
              border: `1px solid ${visibility === "public" ? C.green : C.border}`,
              borderRadius: 10,
              color: visibility === "public" ? C.text : C.textSoft,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            <Globe size={16} />
            Public
          </button>
          <button
            onClick={() => setVisibility("unlisted")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 16px",
              background: visibility === "unlisted" ? `${C.accent}20` : C.surface,
              border: `1px solid ${visibility === "unlisted" ? C.accent : C.border}`,
              borderRadius: 10,
              color: visibility === "unlisted" ? C.text : C.textSoft,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            <Lock size={16} />
            Unlisted
          </button>
        </div>
        <p style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
          {visibility === "public" 
            ? "Visible in feed and search" 
            : "Only accessible via direct link"}
        </p>
      </div>

      {/* Thumbnail */}
      <div>
        <label style={{ color: C.textSoft, fontSize: 14, fontWeight: 500, display: "block", marginBottom: 8 }}>
          Thumbnail
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
              aspectRatio: "16/9",
              background: C.bg,
              border: `2px dashed ${C.border}`,
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: isUploadingThumbnail ? "not-allowed" : "pointer",
            }}
          >
            {isUploadingThumbnail ? (
              <Loader2 size={24} className="animate-spin" style={{ color: C.accent }} />
            ) : (
              <>
                <ImagePlus size={24} style={{ color: C.muted }} />
                <span style={{ color: C.textSoft, fontSize: 13 }}>Add thumbnail</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* URL Slug */}
      <div>
        <label style={{ color: C.textSoft, fontSize: 13, fontWeight: 500, display: "block", marginBottom: 8 }}>
          Custom URL
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
      </div>

      {/* SEO Title */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ color: C.textSoft, fontSize: 13, fontWeight: 500 }}>
            SEO Title
          </label>
          <span style={{ color: seoTitle.length > 60 ? C.rose : C.muted, fontSize: 11 }}>
            {seoTitle.length}/70
          </span>
        </div>
        <input
          type="text"
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value.slice(0, 70))}
          placeholder={title || "Defaults to your title"}
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
      </div>

      {/* SEO Description */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ color: C.textSoft, fontSize: 13, fontWeight: 500 }}>
            Meta Description
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
      </div>
    </div>
  );

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
                {refPreview.title || refPreview.headlineClaim}
              </Link>
              <div style={{ color: C.textSoft, fontSize: 13, marginTop: 6 }}>
                {formatPublicName(refPreview.author?.name)}
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
                  &quot;{annotationPreview.selectedText.length > 200
                    ? annotationPreview.selectedText.slice(0, 200) + "..."
                    : annotationPreview.selectedText}&quot;
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

        {/* Title Input (Primary) */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: 8,
          }}>
            <label style={{ color: C.textSoft, fontSize: 14, fontWeight: 500 }}>
              Title
            </label>
            <span style={{ 
              color: isValidTitle ? C.muted : C.rose, 
              fontSize: 12 
            }}>
              {titleCharCount}/120
            </span>
          </div>
          
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's your post about?"
            style={{
              width: "100%",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 16,
              color: C.text,
              fontSize: 20,
              fontWeight: 600,
              outline: "none",
            }}
          />
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

        {/* AI Claim Panel */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} style={{ color: C.accent }} />
              <label style={{ color: C.textSoft, fontSize: 14, fontWeight: 500 }}>
                Core Claim
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ 
                color: isValidClaim ? C.muted : C.rose, 
                fontSize: 12 
              }}>
                {claimCharCount}/280
              </span>
              <button
                onClick={generateClaim}
                disabled={isGeneratingClaim || !title.trim() || wordCount < 50}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.textSoft,
                  fontSize: 12,
                  cursor: isGeneratingClaim || !title.trim() || wordCount < 50 ? "not-allowed" : "pointer",
                  opacity: isGeneratingClaim || !title.trim() || wordCount < 50 ? 0.5 : 1,
                }}
              >
                {isGeneratingClaim ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                {headlineClaim ? "Regenerate" : "Generate"}
              </button>
            </div>
          </div>
          
          <textarea
            value={headlineClaim}
            onChange={(e) => {
              setHeadlineClaim(e.target.value);
              setClaimEdited(true);
            }}
            placeholder="AI will suggest a falsifiable claim based on your title and argument..."
            style={{
              width: "100%",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 16,
              color: C.text,
              fontSize: 16,
              lineHeight: 1.5,
              resize: "none",
              minHeight: 80,
              outline: "none",
            }}
          />
          
          {claimRationale && (
            <p style={{ color: C.muted, fontSize: 12, marginTop: 8, fontStyle: "italic" }}>
              {claimRationale}
            </p>
          )}
          
          {!headlineClaim && wordCount < 50 && (
            <p style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
              Write at least 50 words in your argument to enable AI claim suggestion
            </p>
          )}
        </div>

        {/* Topic Tags */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: C.textSoft, fontSize: 14, fontWeight: 500, display: "block", marginBottom: 12 }}>
            Topics
          </label>
          
          {/* Selected tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {topicTags.map((tag) => (
              <span
                key={tag}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  background: `${C.accent}20`,
                  border: `1px solid ${C.accent}40`,
                  borderRadius: 20,
                  color: C.text,
                  fontSize: 13,
                }}
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={14} style={{ color: C.muted }} />
                </button>
              </span>
            ))}
            
            {topicTags.length < 5 && (
              <form onSubmit={handleNewTagSubmit} style={{ display: "inline-flex" }}>
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, ""))}
                  placeholder="Add tag..."
                  style={{
                    width: 100,
                    padding: "6px 12px",
                    background: "transparent",
                    border: `1px dashed ${C.border}`,
                    borderRadius: 20,
                    color: C.text,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </form>
            )}
          </div>
          
          {/* Suggested tags */}
          {(suggestedTags.length > 0 || isLoadingTags) && (
            <div>
              <span style={{ color: C.muted, fontSize: 12, marginRight: 8 }}>
                {isLoadingTags ? "Suggesting..." : "Suggestions:"}
              </span>
              {isLoadingTags ? (
                <Loader2 size={12} className="animate-spin" style={{ color: C.muted, display: "inline" }} />
              ) : (
                suggestedTags.slice(0, 5).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 10px",
                      background: "transparent",
                      border: `1px solid ${C.border}`,
                      borderRadius: 16,
                      color: C.textSoft,
                      fontSize: 12,
                      cursor: "pointer",
                      marginRight: 6,
                      marginTop: 4,
                    }}
                  >
                    <Plus size={12} />
                    {tag}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Citations */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: C.textSoft, fontSize: 14, fontWeight: 500, display: "block", marginBottom: 6 }}>
            Citations & sources
          </label>
          <p style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
            Link to articles, papers, videos, or other sources you&apos;re drawing on. We&apos;ll auto-fill the title from the URL when possible.
          </p>
          <CitationsEditor
            citations={citations}
            onChange={setCitations}
          />
        </div>

        {/* Settings (Desktop: Inline, Mobile: Sheet) */}
        {!isMobile && (
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "12px 16px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: showSettings ? "12px 12px 0 0" : 12,
                cursor: "pointer",
                color: C.textSoft,
                fontSize: 14,
                fontWeight: 500,
                textAlign: "left",
              }}
            >
              <Settings size={16} />
              Post Settings
              <ChevronDown
                size={16}
                style={{
                  marginLeft: "auto",
                  transform: showSettings ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </button>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderTop: "none",
                    borderRadius: "0 0 12px 12px",
                    padding: 20,
                    overflow: "hidden",
                  }}
                >
                  {renderSettings()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Actions */}
        <div style={{ 
          display: "flex", 
          gap: 12, 
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {lastSaved && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle size={14} style={{ color: C.green }} />
                <span style={{ color: C.muted, fontSize: 12 }}>
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              </div>
            )}
            
            {isMobile && (
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.textSoft,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <Settings size={16} />
                Settings
              </button>
            )}
          </div>
          
          <div style={{ display: "flex", gap: 12 }}>
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={isSubmitting || !title.trim() || !headlineClaim.trim()}
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

      {/* Mobile Settings Sheet */}
      {isMobile && (
        <Sheet
          open={showSettings}
          onClose={() => setShowSettings(false)}
          variant="bottom"
          snapPoints={[0.85]}
          header={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Settings size={18} style={{ color: C.accent }} />
              <span style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>Post Settings</span>
            </div>
          }
        >
          {renderSettings()}
        </Sheet>
      )}

      {/* Preflight Contradiction Modal */}
      <AnimatePresence>
        {showPreflightModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1003,
              padding: 16,
            }}
            onClick={handlePreflightCancel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: 24,
                maxWidth: 560,
                width: "100%",
                maxHeight: "80vh",
                overflow: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: `${C.accent}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <AlertTriangle size={20} style={{ color: C.accent }} />
                </div>
                <div>
                  <h3 style={{ color: C.text, fontSize: 18, fontWeight: 600, margin: 0 }}>
                    Potential Conflicts Found
                  </h3>
                  <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                    This claim may conflict with your past positions
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                {preflightConflicts.map((conflict, index) => (
                  <div
                    key={conflict.pastPostId}
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: index < preflightConflicts.length - 1 ? 12 : 0,
                    }}
                  >
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}>
                      <span style={{
                        padding: "3px 8px",
                        background: conflict.type === "direct_contradiction" ? `${C.rose}20` : `${C.accent}20`,
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        color: conflict.type === "direct_contradiction" ? C.rose : C.accent,
                        textTransform: "uppercase",
                      }}>
                        {conflict.type === "direct_contradiction" ? "Contradiction" : "Tension"}
                      </span>
                      <span style={{ color: C.muted, fontSize: 12 }}>
                        {new Date(conflict.pastPublishedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <Link
                      href={`/post/${conflict.pastPostId}`}
                      target="_blank"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: C.accent,
                        fontSize: 14,
                        fontWeight: 500,
                        textDecoration: "underline",
                        textUnderlineOffset: 2,
                        marginBottom: 8,
                      }}
                    >
                      {conflict.pastTitle}
                      <ExternalLink size={12} />
                    </Link>
                    
                    <p style={{ 
                      color: C.textSoft, 
                      fontSize: 13, 
                      lineHeight: 1.5,
                      margin: 0,
                      fontStyle: "italic",
                    }}>
                      &ldquo;{conflict.pastClaim}&rdquo;
                    </p>
                    
                    <p style={{ 
                      color: C.muted, 
                      fontSize: 12, 
                      lineHeight: 1.5,
                      marginTop: 8,
                      marginBottom: 0,
                    }}>
                      {conflict.explanation}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{
                background: `${C.accent}10`,
                border: `1px solid ${C.accent}25`,
                borderRadius: 10,
                padding: 14,
                marginBottom: 20,
              }}>
                <p style={{ color: C.textSoft, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                  <strong style={{ color: C.accent }}>It&apos;s okay to change your mind.</strong>{" "}
                  If your thinking has evolved, publish anyway. Your belief map tracks how your views develop over time.
                </p>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  onClick={handlePreflightCancel}
                  style={{
                    padding: "10px 20px",
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    color: C.textSoft,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Revise Claim
                </button>
                <button
                  onClick={handlePreflightContinue}
                  disabled={isPublishing}
                  style={{
                    padding: "10px 20px",
                    background: C.accent,
                    border: "none",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: isPublishing ? "not-allowed" : "pointer",
                    opacity: isPublishing ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    "Publish Anyway"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
