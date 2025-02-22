"use client";

import React from "react";
import { motion } from "framer-motion";

interface ControlButtonProps {
  icon: React.ElementType;
  onClick: () => void;
}

export const ControlButton = ({ icon: Icon, onClick }: ControlButtonProps) => (
  <button
    onClick={onClick}
    className="group relative inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 text-lg font-semibold text-white hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-800"
  >
    <span className="relative flex h-full w-full items-center justify-center rounded-full bg-[#020817] transition-all duration-300 ease-in-out group-hover:bg-opacity-0">
      <Icon className="h-6 w-6" />
    </span>
  </button>
);
