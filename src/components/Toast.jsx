import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const toneMap = {
  success: { icon: CheckCircle2, border: 'border-success/30', text: 'text-success' },
  error: { icon: TriangleAlert, border: 'border-danger/30', text: 'text-danger' },
  info: { icon: Info, border: 'border-gold/20', text: 'text-gold' },
};

const Toast = () => {
  const { toasts, removeToast } = useAppContext();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3">
      {toasts.map((toast) => {
        const tone = toneMap[toast.tone] || toneMap.info;
        const Icon = tone.icon;
        return (
          <div key={toast.id} className={`glass-panel animate-fadeInUp flex min-w-[280px] items-start justify-between gap-3 rounded-2xl border px-4 py-3 ${tone.border}`}>
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-4 w-4 ${tone.text}`} />
              <p className="text-sm text-ink">{toast.message}</p>
            </div>
            <button type="button" className="text-muted" onClick={() => removeToast(toast.id)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Toast;