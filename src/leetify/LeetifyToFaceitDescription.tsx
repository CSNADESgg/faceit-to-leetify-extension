import React from "react";

interface LeetifyToFaceitDescriptionProps {
  children?: React.ReactNode;
}

export default function LeetifyToFaceitDescription({
  children,
}: LeetifyToFaceitDescriptionProps) {
  return <div className="csn:text-left">{children}</div>;
}
