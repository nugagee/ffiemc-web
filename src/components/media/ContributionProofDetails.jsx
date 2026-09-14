import { ExternalLink, FileText } from "lucide-react";
import { formatContributionPaymentDate, isReceiptImage } from "../../lib/mediaContributions";

export function ContributionProofDetails({
  paymentDate,
  receiptUrl,
  note,
  className = "",
  compact = false,
}) {
  const paidOn = formatContributionPaymentDate(paymentDate);
  const showReceipt = Boolean(receiptUrl);
  const showNote = Boolean(note?.trim());
  if (!paidOn && !showReceipt && !showNote) return null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {paidOn ? (
        <p className={`text-gray-500 ${compact ? "text-xs" : "text-sm"}`}>Paid {paidOn}</p>
      ) : null}
      {showNote ? (
        <p className={`text-gray-500 italic ${compact ? "text-xs" : "text-sm"}`}>{note}</p>
      ) : null}
      {showReceipt ? (
        <div className="flex items-start gap-2">
          {isReceiptImage(receiptUrl) ? (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="block shrink-0 rounded-lg border border-gray-200 overflow-hidden hover:ring-2 hover:ring-red-200 transition-shadow"
              title="View payment proof"
            >
              <img
                src={receiptUrl}
                alt="Payment proof"
                className={compact ? "h-14 w-14 object-cover" : "h-20 w-20 object-cover"}
              />
            </a>
          ) : (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1 text-red-600 hover:underline ${compact ? "text-xs" : "text-sm"}`}
            >
              <FileText className="h-3.5 w-3.5" />
              View receipt
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          )}
          {isReceiptImage(receiptUrl) ? (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1 text-red-600 hover:underline mt-1 ${compact ? "text-xs" : "text-sm"}`}
            >
              Open proof
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
