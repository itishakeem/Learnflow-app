"use client";

import { useRef } from "react";
import { Upload, User } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  preview: string | null;
  onSelect: (dataUrl: string) => void;
}

export default function AvatarUpload({ preview, onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onSelect(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Preview */}
      <motion.div
        whileHover={{ scale: 1.03 }}
        className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer"
        style={{
          background: "rgba(139,92,246,0.1)",
          border: "1px solid rgba(139,92,246,0.25)",
          boxShadow: "0 0 16px rgba(139,92,246,0.12)",
        }}
        onClick={() => inputRef.current?.click()}
        title="Click to upload photo"
      >
        {preview
          ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
          : <User size={28} className="text-brand-300" />
        }
      </motion.div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                   bg-surface-raised border border-surface-border text-ink-secondary
                   hover:border-brand/30 hover:text-ink-primary transition-all duration-200"
      >
        <Upload size={12} />
        {preview ? "Change photo" : "Upload photo"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
