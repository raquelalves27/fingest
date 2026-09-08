import { useState, useCallback, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  return { message, showToast };
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-card bg-ink dark:bg-paper text-paper dark:text-ink px-4 py-2.5 text-sm font-medium shadow-soft transition-all">
      <CheckCircle2 size={16} className="text-emerald-bright" />
      {message}
    </div>
  );
}
