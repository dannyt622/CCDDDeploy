import { AlertTriangle } from 'lucide-react';

export default function ExclaimIcon({ className = '' }) {
  return <AlertTriangle className={`w-4 h-4 text-risk-high ${className}`} strokeWidth={2.2} />;
}
