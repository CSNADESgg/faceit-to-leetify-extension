import React from "react";

interface FaceitToastProps {
  children: React.ReactNode;
}

export default function FaceitToast({ children }: FaceitToastProps) {
  return (
    <div className="absolute inset-x-0 top-[calc(85px-64px)] flex justify-center">
      <div className="flex items-start gap-3 rounded border border-[#484848] bg-[#303030] p-4">
        {children}
      </div>
    </div>
  );
}
