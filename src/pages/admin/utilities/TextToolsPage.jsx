import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CaseSensitive, Copy } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { DownloadDocumentButton } from "../../../components/admin/DownloadDocumentButton";

export default function TextToolsPage() {
  const [text, setText] = useState("");
  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return { chars: text.length, words, lines: text ? text.split(/\n/).length : 0 };
  }, [text]);

  const apply = (fn) => setText((prev) => fn(prev));

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Utilities</p>
      <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
        <CaseSensitive className="h-7 w-7 text-red-600" /> Text tools
      </h1>
      <p className="text-sm text-gray-500 mt-2 max-w-2xl">
        Clean copy for announcements, captions, and emails: word count and case conversion.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => apply((t) => t.toUpperCase())}>UPPERCASE</Button>
        <Button size="sm" variant="outline" onClick={() => apply((t) => t.toLowerCase())}>lowercase</Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => apply((t) => t.replace(/\s+/g, " ").trim())}
        >
          Trim spaces
        </Button>
        <Button size="sm" variant="outline" onClick={copy} disabled={!text}>
          <Copy className="h-4 w-4 mr-2" /> Copy
        </Button>
        <DownloadDocumentButton
          disabled={!text.trim()}
          getDocument={() => ({ title: "Text tools", body: text })}
        />
      </div>

      <Textarea
        className="mt-4 min-h-[280px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste text…"
      />
      <p className="text-xs text-gray-500 mt-2">
        {stats.words} words · {stats.chars} characters · {stats.lines} lines
      </p>
    </div>
  );
}
