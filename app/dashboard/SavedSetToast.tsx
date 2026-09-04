"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function SavedSetToast({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (!show) return;
    window.history.replaceState(null, "", window.location.pathname);
    const timer = window.setTimeout(() => setVisible(false), 3000);
    return () => window.clearTimeout(timer);
  }, [show]);

  return visible ? (
    <div className="dashboard-toast" role="status">
      <CheckCircle2 aria-hidden="true" />
      세트를 저장했어요.
    </div>
  ) : null;
}
