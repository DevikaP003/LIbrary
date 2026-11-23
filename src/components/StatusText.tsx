import { CheckCircle2, Clock } from 'lucide-react';
import type { ReturnStatus } from '../types';

export function ReturnStatusLabel({ status }: { status: ReturnStatus }) {
  const isReturned = status === 'Returned';
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap ${
        isReturned ? 'text-[#157A56]' : 'text-[#0E5A7A]'
      }`}
    >
      {isReturned ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
      ) : (
        <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
      )}
      <span>{status}</span>
    </span>
  );
}

export function AvailabilityLabel({ isBorrowed }: { isBorrowed: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap ${
        isBorrowed ? 'text-[#0E5A7A]' : 'text-[#157A56]'
      }`}
    >
      {isBorrowed ? (
        <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
      )}
      <span>{isBorrowed ? 'Borrowed' : 'Available'}</span>
    </span>
  );
}
