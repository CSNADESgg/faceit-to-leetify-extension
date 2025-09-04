import React from "react";

interface FaceitToastProps {
  children: React.ReactNode;
}

export default function FaceitToast({ children }: FaceitToastProps) {
  return (
    <div className="csn:absolute csn:inset-x-0 csn:top-[calc(85px-64px)] csn:flex csn:justify-center">
      <div className="csn:flex csn:items-start csn:gap-3 csn:rounded-sm csn:border csn:border-[#484848] csn:bg-[#303030] csn:p-4">
        {children}
      </div>
    </div>
  );
}
