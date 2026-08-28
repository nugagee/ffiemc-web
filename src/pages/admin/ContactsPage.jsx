import { useEffect, useState } from "react";
import api, { authApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { Trash2 } from "lucide-react";

function formatDate(value) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statuses = ["new", "read", "replied"];

export default function ContactsPage() {
  const { can } = useAuth();
  const canEdit = can('contacts', 'edit');
  const canDelete = can('contacts', 'delete');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/contact")
      .then((res) => {
        const data = res.data || [];
        setItems(data);
        setSelected((current) => (current ? data.find((item) => item.id === current.id) || data[0] : data[0] || null));
      })
      .catch((err) => setError(err.response?.data?.detail || err.message));

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, status) => {
    await authApi.updateContact(id, status);
    await load();
  };

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Inbox</p>
      <h1 className="text-3xl md:text-4xl font-bold mt-2">Contact messages</h1>

      <div className="grid lg:grid-cols-12 gap-6 mt-8">
        <div className="lg:col-span-5 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          {items.length === 0 && <p className="p-6 text-gray-500">No messages yet.</p>}
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(item);
                    if (canEdit && item.status === "new") updateStatus(item.id, "read");
                  }}
                  className={`w-full text-left px-5 py-4 border-b border-gray-50 ${
                    selected?.id === item.id ? "bg-red-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{item.name}</span>
                    <span className={`text-[10px] uppercase tracking-widest ${item.status === "new" ? "text-red-600" : "text-gray-400"}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1 truncate">{item.subject}</div>
                  <div className="text-xs text-gray-400 mt-1">{formatDate(item.created_at)}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-7 rounded-2xl bg-white border border-gray-100 shadow-sm p-6 md:p-8 min-h-[320px]">
          {!selected ? (
            <p className="text-gray-500">Select a message to read it.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{selected.name}</h2>
                  <a href={`mailto:${selected.email}`} className="text-red-600 text-sm">
                    {selected.email}
                  </a>
                  {selected.phone && <p className="text-sm text-gray-500">{selected.phone}</p>}
                  <p className="text-sm text-gray-500 mt-1">{selected.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit ? (
                    <select
                      value={selected.status}
                      onChange={(e) => updateStatus(selected.id, e.target.value)}
                      className="rounded-full border border-gray-200 px-4 py-2 text-sm bg-transparent"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[10px] uppercase tracking-widest text-gray-400">{selected.status}</span>
                  )}
                  {canDelete && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-red-600"
                      onClick={async () => {
                        await api.delete(`/contact/${selected.id}`);
                        setSelected(null);
                        await load();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-8 text-gray-800 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              <p className="mt-8 text-xs text-gray-400">
                {selected.email_sent ? "Confirmation emails were sent." : "Email send was not confirmed."} ·{" "}
                {formatDate(selected.created_at)}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
