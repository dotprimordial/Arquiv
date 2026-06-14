"use client";

import { useEffect } from "react";
import clarity from "@microsoft/clarity";

export default function ClarityScript() {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  useEffect(() => {
    if (!clarityId) return;
    clarity.init(clarityId);
  }, [clarityId]);

  return null;
}
