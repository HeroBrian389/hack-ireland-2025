"use client";

import React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface ControlButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const ControlButton = ({ icon: Icon, onClick, disabled, className = "" }: ControlButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full bg-white/10 p-4 text-white transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <Icon className="h-6 w-6" />
    </button>
  );
};
