import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, Square, Copy, NotebookPen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { DownloadDocumentButton } from "../../../components/admin/DownloadDocumentButton";

const LANGS = [
  { id: "en-NG", label: "English (Nigeria)" },
  { id: "en-US", label: "English (US)" },
  { id: "en-GB", label: "English (UK)" },
  { id: "yo-NG", label: "Yoruba" },
  { id: "ig-NG", label: "Igbo" },
  { id: "ha-NG", label: "Hausa" },
  { id: "fr-FR", label: "French" },
];

export default function SpeechToTextPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [lang, setLang] = useState("en-NG");
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const supported = typeof window !== "undefined"
    && (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => () => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  const start = () => {
    if (!supported) {
      toast.error("Speech recognition is not available in this browser. Try Chrome or Edge.");
      return;
    }
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let out = "";
      for (let i = 0; i < event.results.length; i += 1) {
        out += event.results[i][0].transcript;
        if (event.results[i].isFinal) out += " ";
      }
      setText(out.trimStart());
    };
    rec.onerror = (e) => {
      if (e.error !== "no-speech") toast.error(e.error || "Microphone error");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stop = () => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  };

  const copy = async () => {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text.trim());
    toast.success("Copied");
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Utilities</p>
      <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
        <Mic className="h-7 w-7 text-red-600" /> Speech to text
      </h1>
      <p className="text-sm text-gray-500 mt-2 max-w-2xl">
        Dictate sermons, minutes, or announcements. Allow microphone access, then start listening. Works best in Chrome or Edge.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Language</Label>
          <Select value={lang} onValueChange={setLang} disabled={listening}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {!listening ? (
          <Button className="bg-red-600 hover:bg-red-700" onClick={start}>
            <Mic className="h-4 w-4 mr-2" /> Start listening
          </Button>
        ) : (
          <Button variant="outline" onClick={stop}>
            <Square className="h-4 w-4 mr-2" /> Stop
          </Button>
        )}
        <Button variant="outline" onClick={copy} disabled={!text.trim()}>
          <Copy className="h-4 w-4 mr-2" /> Copy
        </Button>
        {can("utilities", "edit") && (
          <Button
            variant="outline"
            disabled={!text.trim()}
            onClick={() => navigate("/admin/utilities/notes", { state: { body: text.trim(), title: "Dictation" } })}
          >
            <NotebookPen className="h-4 w-4 mr-2" /> Save as note
          </Button>
        )}
        <DownloadDocumentButton
          disabled={!text.trim()}
          getDocument={() => ({
            title: "Speech transcript",
            meta: LANGS.find((l) => l.id === lang)?.label || lang,
            body: text,
          })}
        />
      </div>

      <Textarea
        className="mt-6 min-h-[320px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={listening ? "Listening…" : "Transcript appears here. You can edit it after dictating."}
      />
    </div>
  );
}
