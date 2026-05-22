"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { QuickThoughtModal } from "@/components/quick-thought-modal";

export function QuickThoughtButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Quick thought"
        className="fixed z-40 flex items-center justify-center rounded-full shadow-xl"
        style={{
          right: 20,
          bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
          width: 56,
          height: 56,
          background: "linear-gradient(135deg, #d4915a 0%, #c87242 100%)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          boxShadow:
            "0 8px 24px rgba(212, 145, 90, 0.35), 0 2px 6px rgba(0,0,0,0.3)",
        }}
      >
        <Sparkles size={22} strokeWidth={2.2} />
      </motion.button>

      <style jsx>{`
        @media (min-width: 1024px) {
          button[aria-label="Quick thought"] {
            bottom: 24px !important;
          }
        }
      `}</style>

      <QuickThoughtModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
