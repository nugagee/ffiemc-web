import React from 'react';
import api from '../../lib/api';
import { useCollection } from '../../hooks/useCollection';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Check, Trash2, Mail, Phone } from 'lucide-react';

const fmt = (d) => { try { return new Date(d).toLocaleString(); } catch { return d; } };

export const PrayerPanel = () => {
  const { can } = useAuth();
  const canEdit = can('prayer.inbox', 'edit');
  const canDelete = can('prayer.inbox', 'delete');
  const { items, loading, reload } = useCollection('/prayer-requests');

  const markPrayed = async (id) => {
    await api.put(`/prayer-requests/${id}/status`, { status: 'prayed' });
    toast.success('Marked as prayed');
    reload();
  };
  const remove = async (id) => {
    await api.delete(`/prayer-requests/${id}`);
    toast.success('Deleted');
    reload();
  };

  return (
    <div data-testid="manager-prayers">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Prayer Requests</h2>
      <p className="text-sm text-gray-500 mb-6">{items.length} request{items.length !== 1 ? 's' : ''}</p>
      {loading ? <p className="text-gray-500">Loading...</p> : items.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">No prayer requests yet.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <Card key={p.id} className="p-4" data-testid={`prayer-${p.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <Badge className="bg-red-100 text-red-700">{p.category}</Badge>
                    {p.status === 'prayed' ? <Badge className="bg-green-100 text-green-700">Prayed</Badge> : <Badge className="bg-blue-100 text-blue-700">New</Badge>}
                    {p.is_public && <Badge variant="secondary">Public</Badge>}
                  </div>
                  <p className="text-gray-700 mb-2">{p.request}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
                    {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                    <span>{fmt(p.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {canEdit && p.status !== 'prayed' && <Button size="icon" variant="outline" className="text-green-600" onClick={() => markPrayed(p.id)} data-testid={`prayed-${p.id}`}><Check className="h-4 w-4" /></Button>}
                  {canDelete && <Button size="icon" variant="outline" className="text-red-600" onClick={() => remove(p.id)} data-testid={`delete-prayer-${p.id}`}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export const MessagesPanel = () => {
  const { can } = useAuth();
  const canDelete = can('contacts', 'delete');
  const { items, loading, reload } = useCollection('/contact');
  const remove = async (id) => {
    await api.delete(`/contact/${id}`);
    toast.success('Deleted');
    reload();
  };
  return (
    <div data-testid="manager-messages">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Contact Messages</h2>
      <p className="text-sm text-gray-500 mb-6">{items.length} message{items.length !== 1 ? 's' : ''}</p>
      {loading ? <p className="text-gray-500">Loading...</p> : items.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">No messages yet.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <Card key={m.id} className="p-4" data-testid={`message-${m.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{m.subject}</p>
                  <p className="text-gray-700 mb-2">{m.message}</p>
                  <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                    <span>{m.name}</span>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</span>
                    {m.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>}
                    <span>{fmt(m.created_at)}</span>
                  </div>
                </div>
                {canDelete && <Button size="icon" variant="outline" className="text-red-600 shrink-0" onClick={() => remove(m.id)} data-testid={`delete-message-${m.id}`}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
