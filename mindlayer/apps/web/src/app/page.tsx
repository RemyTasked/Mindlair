import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";
import LandingMapDemo from "@/components/landing-map-demo";

export default function HomePage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "#0f0e0c", color: "#e8e4dc", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Nav ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        borderBottom: "1px solid #2a2825",
        background: "#0f0e0cdd", backdropFilter: "blur(12px)",
      }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.04em", textDecoration: "none", color: "#e8e4dc" }}>
            Mind<span style={{ color: "#d4915a", fontStyle: "italic", fontWeight: 500 }}>lair</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/how-it-works"
              className="hidden sm:block"
              style={{ fontSize: 14, color: "#7a7469", textDecoration: "none" }}
            >
              How it works
            </Link>
            <Link href="/login">
              <Button size="sm" variant="gradient">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-6 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div style={{
            display: "inline-block", fontSize: 11, letterSpacing: "0.15em",
            textTransform: "uppercase", color: "#d4915a",
            border: "1px solid #6b4a2a", borderRadius: 20,
            padding: "5px 14px", marginBottom: 24,
          }}>
            Now in private beta
          </div>

          <h1 style={{
            fontSize: "clamp(2.4rem, 5vw, 3.5rem)",
            fontWeight: 800, letterSpacing: "-0.03em",
            lineHeight: 1.1, marginBottom: 20,
          }}>
            A living map of{" "}
            <span style={{
              background: "linear-gradient(135deg, #d4915a, #6b9fc4, #d4915a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>how you think</span>
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            color: "#c4bfb4", maxWidth: 580, margin: "0 auto 32px",
            lineHeight: 1.65,
          }}>
            Mindlair quietly captures what you read, extracts the claims that matter,
            and builds a map of your evolving beliefs. Watch topics emerge, positions
            shift, and tensions surface.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link href="/login">
              <Button size="lg" variant="gradient">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button size="lg" variant="outline" style={{ borderColor: "#2a2825", background: "transparent", color: "#c4bfb4" }}>
                How it works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Map Demo ── */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto relative">
          <div style={{
            position: "absolute", inset: -60, zIndex: 0,
            background: "radial-gradient(ellipse at center, #d4915a08 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <LandingMapDemo />
          </div>
          <p style={{
            textAlign: "center", marginTop: 14, fontSize: 13,
            color: "#7a7469", lineHeight: 1.6,
          }}>
            A year of one person&apos;s intellectual life. Every node is a topic.
            Every shift is a change of mind. Click a cluster to explore it. Drag the timeline to travel through time.
          </p>
        </div>
      </section>

      {/* ── The map is the product ── */}
      <section className="py-20 px-6" style={{ borderTop: "1px solid #2a2825" }}>
        <div className="max-w-5xl mx-auto">
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 2.4rem)",
            fontWeight: 700, textAlign: "center", marginBottom: 12,
          }}>
            The map is the product
          </h2>
          <p style={{
            textAlign: "center", color: "#7a7469", maxWidth: 520,
            margin: "0 auto 48px", fontSize: 15,
          }}>
            Not a dashboard. Not a feed. A single visualization that compounds every time you read.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              title="It grows with you"
              description="Every article, podcast, and video adds to the map. Topics emerge organically. The more you read, the more it reveals."
              accent="#d4915a"
            />
            <FeatureCard
              title="Beliefs evolve"
              description="Your reactions become positions. Positions shift as you encounter new evidence. The map remembers every turn."
              accent="#6b9fc4"
            />
            <FeatureCard
              title="Tensions surface"
              description="When your views contradict each other, the map shows it. Not to judge — to illuminate."
              accent="#d4915a"
            />
          </div>
        </div>
      </section>

      {/* ── The "oh" moment ── */}
      <section className="py-20 px-6" style={{
        background: "#1a1916",
        borderTop: "1px solid #2a2825",
        borderBottom: "1px solid #2a2825",
      }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 style={{
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            fontWeight: 700, marginBottom: 16,
          }}>
            The timeline changes everything
          </h2>
          <p style={{ color: "#c4bfb4", fontSize: 16, lineHeight: 1.75, maxWidth: 560, margin: "0 auto" }}>
            Drag back to January. Watch your map grow from nothing. See topics emerge,
            peak, and fade. Watch a belief you held in March flip by September.
          </p>
          <p style={{ color: "#7a7469", fontSize: 14, marginTop: 20, fontStyle: "italic" }}>
            The first time someone does this is the moment they tell someone else about Mindlair.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 style={{
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            fontWeight: 700, textAlign: "center", marginBottom: 48,
          }}>
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number={1}
              title="Capture"
              description="Runs silently on your desktop. No buttons, no saving. Just read like you always do."
              icon="🖥"
            />
            <StepCard
              number={2}
              title="Extract"
              description="AI identifies the core claims from everything you consume. Articles, podcasts, videos."
              icon="✦"
            />
            <StepCard
              number={3}
              title="Map"
              description="Your reactions build a living map of your beliefs. It compounds daily."
              icon="◎"
            />
          </div>
        </div>
      </section>

      {/* ── Posting Lair ── */}
      <section className="py-20 px-6" style={{
        background: "#1a1916",
        borderTop: "1px solid #2a2825",
        borderBottom: "1px solid #2a2825",
      }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div style={{
              display: "inline-block", fontSize: 11, letterSpacing: "0.15em",
              textTransform: "uppercase", color: "#6b9fc4",
              border: "1px solid #3a5a7a", borderRadius: 20,
              padding: "5px 14px", marginBottom: 20,
            }}>
              Posting Lair
            </div>
            <h2 style={{
              fontSize: "clamp(1.8rem, 3.5vw, 2.4rem)",
              fontWeight: 700, marginBottom: 16,
            }}>
              Post your thinking.{" "}
              <span style={{ color: "#d4915a" }}>Shape the conversation.</span>
            </h2>
            <p style={{
              color: "#c4bfb4", fontSize: 15, lineHeight: 1.7,
              maxWidth: 560, margin: "0 auto",
            }}>
              Write claim-based posts that become the strongest signals in your belief map.
              Your readers react — and their maps update too. The social layer IS the mapping layer.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Post Mockup */}
            <div style={{
              background: "#0f0e0c",
              border: "1px solid #2a2825",
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              margin: "0 auto",
            }}>
              {/* Author & Stance */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: "#2a2825" }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Sarah Chen</div>
                    <div style={{ fontSize: 12, color: "#7a7469" }}>2 hours ago</div>
                  </div>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", background: "#a3c47a20", borderRadius: 6,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: "#a3c47a" }} />
                  <span style={{ color: "#a3c47a", fontSize: 12, fontWeight: 500 }}>Arguing</span>
                </div>
              </div>

              {/* Headline Claim */}
              <h3 style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, marginBottom: 12 }}>
                Remote work permanently reduced urban commercial real estate value
              </h3>

              {/* Body Preview */}
              <p style={{ fontSize: 14, color: "#c4bfb4", lineHeight: 1.6, marginBottom: 16 }}>
                The pandemic didn&apos;t just accelerate remote work — it fundamentally reset expectations about...
              </p>

              {/* Topic Tags */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                {["remote work", "real estate", "urban planning"].map(tag => (
                  <span key={tag} style={{
                    fontSize: 11, color: "#7a7469",
                    background: "#2a2825", borderRadius: 4,
                    padding: "4px 8px",
                  }}>{tag}</span>
                ))}
              </div>

              {/* Reaction UI (hidden counts) */}
              <div style={{ borderTop: "1px solid #2a2825", paddingTop: 16 }}>
                <p style={{ fontSize: 12, color: "#7a7469", marginBottom: 10, fontStyle: "italic" }}>
                  React to see what others think
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { label: "Agree", color: "#a3c47a" },
                    { label: "Disagree", color: "#e57373" },
                    { label: "Complicated", color: "#d4915a" },
                  ].map(btn => (
                    <button key={btn.label} style={{
                      flex: 1, padding: "8px 12px",
                      background: "transparent", border: `1px solid ${btn.color}40`,
                      borderRadius: 8, color: btn.color, fontSize: 13,
                      cursor: "pointer",
                    }}>{btn.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-6">
              <FeatureCard
                title="Claim-based posts"
                description="Not topics — specific, falsifiable positions. 'Remote work is interesting' won't cut it. State what you believe."
                accent="#6b9fc4"
              />
              <FeatureCard
                title="Your stance, upfront"
                description="Signal if you're arguing, exploring, or steelmanning. Readers know your relationship to the claim before they react."
                accent="#a3c47a"
              />
              <FeatureCard
                title="Reactions update both maps"
                description="When you react to someone's post, your map updates. Their map updates. That's a new relationship between reading and thinking."
                accent="#d4915a"
              />
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/login">
              <Button size="lg" variant="outline" style={{ borderColor: "#6b9fc4", background: "transparent", color: "#6b9fc4" }}>
                Start Posting
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Cold start ── */}
      <section className="py-20 px-6" style={{
        borderTop: "1px solid #2a2825",
        borderBottom: "1px solid #2a2825",
      }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 style={{
            fontSize: "clamp(1.6rem, 3vw, 2rem)",
            fontWeight: 700, marginBottom: 12,
          }}>
            Start with history, not from scratch
          </h2>
          <p style={{
            color: "#c4bfb4", fontSize: 15, lineHeight: 1.7,
            maxWidth: 520, margin: "0 auto 28px",
          }}>
            Import from Readwise, Instapaper, or browser history. Your map begins with everything
            you&apos;ve already read — so the first session already feels like years of insight.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {["Readwise", "Instapaper", "Spotify", "Google Takeout"].map(source => (
              <span key={source} style={{
                fontSize: 12, color: "#7a7469",
                border: "1px solid #2a2825", borderRadius: 6,
                padding: "6px 14px",
              }}>{source}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wrapped teaser ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div style={{
            display: "inline-block", fontSize: 11, letterSpacing: "0.1em",
            textTransform: "uppercase",
            background: "linear-gradient(90deg, #d4915a, #6b9fc4, #d4915a)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontWeight: 600, marginBottom: 16,
          }}>Coming this December</div>
          <h2 style={{
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            fontWeight: 700, marginBottom: 12,
          }}>
            Your year in thinking, beautifully told
          </h2>
          <p style={{
            color: "#c4bfb4", fontSize: 15, lineHeight: 1.7,
            maxWidth: 480, margin: "0 auto",
          }}>
            Every December, Mindlair creates your intellectual year in review.
            Biggest shifts. Deepest reads. Questions still open. Shareable, private by default.
          </p>
        </div>
      </section>

      {/* ── Privacy ── */}
      <section className="py-20 px-6" style={{
        background: "#1a1916",
        borderTop: "1px solid #2a2825",
        borderBottom: "1px solid #2a2825",
      }}>
        <div className="max-w-3xl mx-auto text-center">
          <Shield className="w-10 h-10 mx-auto mb-6" style={{ color: "#7a7469" }} />
          <h2 style={{
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            fontWeight: 700, marginBottom: 12,
          }}>
            Your mind, your data
          </h2>
          <p style={{
            color: "#c4bfb4", fontSize: 15, lineHeight: 1.7,
            maxWidth: 480, margin: "0 auto 24px",
          }}>
            Your belief map is yours alone. We never sell data, never train on your positions.
            Export or delete everything, any time.
          </p>
          <div className="flex justify-center gap-6 text-sm" style={{ color: "#7a7469" }}>
            <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>
              Privacy Policy
            </Link>
            <Link href="/security" style={{ color: "inherit", textDecoration: "none" }}>
              Security
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 2.4rem)",
            fontWeight: 700, marginBottom: 12,
          }}>
            Start mapping today
          </h2>
          <p style={{ color: "#c4bfb4", fontSize: 15, marginBottom: 32 }}>
            Free to start. Import your reading history to see your map instantly.
          </p>
          <Link href="/login">
            <Button size="xl" variant="gradient">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #2a2825" }}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4" style={{ fontSize: 13, color: "#7a7469" }}>
            <p>&copy; 2026 Mindlair. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy</Link>
              <Link href="/security" style={{ color: "inherit", textDecoration: "none" }}>Security</Link>
              <Link href="/install" style={{ color: "inherit", textDecoration: "none" }}>Download</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description, accent }: { title: string; description: string; accent: string }) {
  return (
    <div style={{
      padding: 28, borderRadius: 12,
      border: "1px solid #2a2825",
      background: "#1a1916",
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: accent, marginBottom: 16,
      }} />
      <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14, color: "#c4bfb4", lineHeight: 1.65 }}>{description}</p>
    </div>
  );
}

function StepCard({ number, title, description, icon }: { number: number; title: string; description: string; icon: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 12, lineHeight: 1 }}>{icon}</div>
      <div style={{
        fontSize: 11, color: "#d4915a", fontWeight: 600,
        letterSpacing: "0.1em", textTransform: "uppercase" as const,
        marginBottom: 8,
      }}>Step {number}</div>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14, color: "#c4bfb4", lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}
