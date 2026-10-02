import { Users } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RELATIONSHIPS } from "../../lib/duplicateCheck";
import { FieldMessage } from "./FieldMessage";

export function DuplicateMatchCard({
  matches = [],
  mode = "self",
  relationship = "",
  relationshipOther = "",
  usePrimaryEmail = true,
  onRelationship,
  onRelationshipOther,
  onUsePrimaryEmail,
  onThatsMe,
  onBeneficiary,
  onUseDifferent,
  onShareAnyway,
  error = "",
  busy = false,
}) {
  const match = matches[0];
  if (!match) return null;
  const extra = matches.length > 1 ? ` ${matches.length - 1} more record${matches.length > 2 ? "s" : ""} share this contact.` : "";
  const hint = [match.masked_name, match.masked_email, match.masked_phone].filter(Boolean).join(" · ");

  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5 space-y-4 shadow-sm"
      role="status"
      data-field="duplicate"
    >
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-amber-700 shadow-sm">
          <Users className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">Looks like someone already registered with this email or phone.</p>
          <p className="mt-1 text-sm text-gray-700 break-words">
            {hint}
            {extra}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button type="button" variant="outline" className="h-auto whitespace-normal bg-white py-3 text-left" disabled={busy} onClick={onThatsMe}>
          That's me
          <span className="mt-1 block text-xs font-normal text-gray-500">Send a code to the existing email. No second record is created.</span>
        </Button>
        <Button type="button" className="h-auto whitespace-normal bg-red-600 py-3 text-left hover:bg-red-700" disabled={busy} onClick={onBeneficiary}>
          Register as a beneficiary
          <span className="mt-1 block text-xs font-normal text-red-100">The account holder approves the family link.</span>
        </Button>
        <Button type="button" variant="outline" className="h-auto whitespace-normal bg-white py-3 text-left" disabled={busy} onClick={onUseDifferent}>
          Use a different email or phone
        </Button>
      </div>

      {mode === "beneficiary" ? (
        <div className="space-y-3 rounded-xl bg-white/80 p-3">
          <div className="space-y-1" data-field="relationship">
            <Label>Relationship</Label>
            <Select value={relationship || undefined} onValueChange={onRelationship}>
              <SelectTrigger className={error && !relationship ? "border-red-500" : ""}>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {relationship === "other" ? (
            <div className="space-y-1" data-field="relationship_other">
              <Label>Describe the relationship</Label>
              <Input value={relationshipOther} onChange={(e) => onRelationshipOther(e.target.value)} />
            </div>
          ) : null}
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <Checkbox checked={usePrimaryEmail} onCheckedChange={(v) => onUsePrimaryEmail(Boolean(v))} className="mt-0.5" />
            <span>Use their email for church updates</span>
          </label>
        </div>
      ) : null}

      {onShareAnyway ? (
        <Button type="button" variant="outline" className="w-full bg-white" disabled={busy} onClick={onShareAnyway}>
          Save this shared address anyway
        </Button>
      ) : null}
      <FieldMessage message={error} />
    </div>
  );
}
