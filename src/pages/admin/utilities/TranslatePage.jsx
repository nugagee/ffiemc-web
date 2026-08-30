import { useState } from "react";
import { toast } from "sonner";
import { Languages, Copy, ExternalLink } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { DownloadDocumentButton } from "../../../components/admin/DownloadDocumentButton";

const LANGS = [
  { id: "auto", label: "Detect language" },
  { id: "en", label: "English" },
  { id: "yo", label: "Yoruba" },
  { id: "ig", label: "Igbo" },
  { id: "ha", label: "Hausa" },
  { id: "fr", label: "French" },
  { id: "es", label: "Spanish" },
  { id: "pt", label: "Portuguese" },
  { id: "ar", label: "Arabic" },
];

export default function TranslatePage() {
  const [source, setSource] = useState("auto");
  const [target, setTarget] = useState("en");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  const googleUrl = () => {
    const sl = source === "auto" ? "auto" : source;
    return `https://translate.google.com/?sl=${sl}&tl=${target}&text=${encodeURIComponent(text)}&op=translate`;
  };

  const quickTranslate = async () => {
    if (!text.trim()) {
      toast.error("Enter text to translate");
      return;
    }
    setBusy(true);
    try {
      const langpair = `${source === "auto" ? "en" : source}|${target}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${encodeURIComponent(langpair)}`;
      const res = await fetch(url);
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (!translated) throw new Error("No translation returned");
      setResult(translated);
    } catch (err) {
      toast.error(err.message || "Quick translate failed. Use Google Translate instead.");
      window.open(googleUrl(), "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Utilities</p>
      <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
        <Languages className="h-7 w-7 text-red-600" /> Translate
      </h1>
      <p className="text-sm text-gray-500 mt-2 max-w-2xl">
        Draft in one language, then open Google Translate for a full review, or run a quick draft translation here.
      </p>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>From</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGS.filter((l) => l.id !== "auto").map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Source text</Label>
          <Textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste announcement, sermon outline, or visitor message…" />
        </div>
        <div className="space-y-2">
          <Label>Quick translation</Label>
          <Textarea rows={12} value={result} onChange={(e) => setResult(e.target.value)} placeholder="Result appears here" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="bg-red-600 hover:bg-red-700" onClick={quickTranslate} disabled={busy}>
          {busy ? "Translating…" : "Quick translate"}
        </Button>
        <Button variant="outline" asChild>
          <a href={googleUrl()} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" /> Open in Google Translate
          </a>
        </Button>
        <Button
          variant="outline"
          disabled={!result.trim()}
          onClick={async () => {
            await navigator.clipboard.writeText(result.trim());
            toast.success("Copied translation");
          }}
        >
          <Copy className="h-4 w-4 mr-2" /> Copy result
        </Button>
        <DownloadDocumentButton
          disabled={!text.trim() && !result.trim()}
          getDocument={() => ({
            title: "Translation",
            meta: `${LANGS.find((l) => l.id === source)?.label || source} → ${LANGS.find((l) => l.id === target)?.label || target}`,
            sections: [
              { heading: "Source", body: text },
              { heading: "Translation", body: result },
            ],
          })}
        />
      </div>
    </div>
  );
}
