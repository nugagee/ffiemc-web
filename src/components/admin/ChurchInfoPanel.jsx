import React, { useEffect, useState } from 'react';
import api, { formatApiError } from '../../lib/api';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Save } from 'lucide-react';

const SOCIAL_KEYS = ['facebook', 'twitter', 'instagram', 'tiktok', 'youtube', 'audiomack'];

export const ChurchInfoPanel = () => {
  const { refresh } = useSettings();
  const { can } = useAuth();
  const canEdit = can('website', 'edit');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then((r) => {
      const d = r.data;
      setForm({
        name: d.name || '', motto: d.motto || '', mission: d.mission || '',
        location: d.location || '', pastor: d.pastor || '', phone: d.phone || '',
        email: d.email || '', logo: d.logo || '',
        notificationEmail: d.notificationEmail || 'adenugaolajideadewale@gmail.com',
        welcomeHeadline: d.welcomeHeadline || '',
        welcomeBody: d.welcomeBody || '',
        servicesIntro: d.servicesIntro || '',
        stats: d.stats && d.stats.length ? d.stats : [
          { value: '15+', label: 'Years Serving' },
          { value: '500+', label: 'Members Reached' },
          { value: '12', label: 'Ministries' },
          { value: '4', label: 'Weekly Services' },
        ],
        programmes: d.programmes && d.programmes.length ? d.programmes : [],
        socials: SOCIAL_KEYS.reduce((a, k) => ({ ...a, [k]: (d.socials || {})[k] || '' }), {}),
        serviceTimes: d.serviceTimes && d.serviceTimes.length ? d.serviceTimes : [],
      });
    });
  }, []);

  if (!form) return <p className="text-gray-500">Loading...</p>;

  const setField = (k, v) => setForm({ ...form, [k]: v });
  const setSocial = (k, v) => setForm({ ...form, socials: { ...form.socials, [k]: v } });
  const setService = (i, k, v) => {
    const st = [...form.serviceTimes];
    st[i] = { ...st[i], [k]: v };
    setForm({ ...form, serviceTimes: st });
  };
  const addService = () => setForm({ ...form, serviceTimes: [...form.serviceTimes, { name: '', day: '', time: '', description: '' }] });
  const removeService = (i) => setForm({ ...form, serviceTimes: form.serviceTimes.filter((_, idx) => idx !== i) });

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', form);
      await refresh({ notify: true });
      toast.success('Church info saved');
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="manager-churchinfo" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Website</h2>
        {canEdit && (
          <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700" data-testid="save-churchinfo-btn">
            <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>
      {!canEdit && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          You can view website content, but saving changes is not enabled for this account.
        </p>
      )}

      <fieldset disabled={!canEdit} className="space-y-6 border-0 p-0 min-w-0">
      <Card>
        <CardHeader><CardTitle className="text-lg">General</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Church Name</Label><Input value={form.name} onChange={(e) => setField('name', e.target.value)} data-testid="ci-name" /></div>
          <div className="space-y-2"><Label>Motto</Label><Input value={form.motto} onChange={(e) => setField('motto', e.target.value)} data-testid="ci-motto" /></div>
          <div className="space-y-2"><Label>Senior Pastor</Label><Input value={form.pastor} onChange={(e) => setField('pastor', e.target.value)} data-testid="ci-pastor" /></div>
          <div className="space-y-2"><Label>Logo URL</Label><Input value={form.logo} onChange={(e) => setField('logo', e.target.value)} data-testid="ci-logo" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Mission</Label><Textarea rows={3} value={form.mission} onChange={(e) => setField('mission', e.target.value)} data-testid="ci-mission" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Contact</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2"><Label>Address / Location</Label><Input value={form.location} onChange={(e) => setField('location', e.target.value)} data-testid="ci-location" /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} data-testid="ci-phone" /></div>
          <div className="space-y-2"><Label>Public email</Label><Input value={form.email} onChange={(e) => setField('email', e.target.value)} data-testid="ci-email" /></div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notification email (contact form copies)</Label>
            <Input type="email" value={form.notificationEmail} onChange={(e) => setField('notificationEmail', e.target.value)} data-testid="ci-notify-email" />
            <p className="text-xs text-gray-500">Visitors get a confirmation, and a copy is sent here. Default: adenugaolajideadewale@gmail.com</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Social Links</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          {SOCIAL_KEYS.map((k) => (
            <div key={k} className="space-y-2">
              <Label className="capitalize">{k}</Label>
              <Input placeholder={`https://...`} value={form.socials[k]} onChange={(e) => setSocial(k, e.target.value)} data-testid={`ci-social-${k}`} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Home welcome</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2"><Label>Headline</Label><Input value={form.welcomeHeadline} onChange={(e) => setField('welcomeHeadline', e.target.value)} /></div>
          <div className="space-y-2"><Label>Intro text</Label><Textarea rows={4} value={form.welcomeBody} onChange={(e) => setField('welcomeBody', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Home stats</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(form.stats || []).map((stat, i) => (
            <div key={i} className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Value</Label><Input value={stat.value} onChange={(e) => {
                const stats = [...form.stats];
                stats[i] = { ...stat, value: e.target.value };
                setForm({ ...form, stats });
              }} /></div>
              <div className="space-y-1"><Label className="text-xs">Label</Label><Input value={stat.label} onChange={(e) => {
                const stats = [...form.stats];
                stats[i] = { ...stat, label: e.target.value };
                setForm({ ...form, stats });
              }} /></div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Services intro</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={3} value={form.servicesIntro} onChange={(e) => setField('servicesIntro', e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Programmes / special services</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm({ ...form, programmes: [...(form.programmes || []), { title: '', description: '', frequency: '' }] })} disabled={!canEdit}>
            <Plus className="h-4 w-4 mr-1" />Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {(form.programmes || []).map((p, i) => (
            <div key={i} className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end border-b pb-4">
              <div className="space-y-1"><Label className="text-xs">Title</Label><Input value={p.title} onChange={(e) => {
                const programmes = [...form.programmes];
                programmes[i] = { ...p, title: e.target.value };
                setForm({ ...form, programmes });
              }} /></div>
              <div className="space-y-1"><Label className="text-xs">Frequency</Label><Input value={p.frequency} onChange={(e) => {
                const programmes = [...form.programmes];
                programmes[i] = { ...p, frequency: e.target.value };
                setForm({ ...form, programmes });
              }} /></div>
              <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={p.description} onChange={(e) => {
                const programmes = [...form.programmes];
                programmes[i] = { ...p, description: e.target.value };
                setForm({ ...form, programmes });
              }} /></div>
              <Button size="icon" variant="outline" className="text-red-600" disabled={!canEdit} onClick={() => setForm({ ...form, programmes: form.programmes.filter((_, idx) => idx !== i) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Service Times</CardTitle>
          <Button size="sm" variant="outline" onClick={addService} disabled={!canEdit} data-testid="add-service-btn"><Plus className="h-4 w-4 mr-1" />Add</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.serviceTimes.length === 0 && <p className="text-sm text-gray-500">No service times. Click "Add".</p>}
          {form.serviceTimes.map((s, i) => (
            <div key={i} className="grid md:grid-cols-[1fr_1fr_1fr_1.5fr_auto] gap-3 items-end border-b pb-4" data-testid={`service-row-${i}`}>
              <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={s.name} onChange={(e) => setService(i, 'name', e.target.value)} data-testid={`service-name-${i}`} /></div>
              <div className="space-y-1"><Label className="text-xs">Day</Label><Input value={s.day} onChange={(e) => setService(i, 'day', e.target.value)} data-testid={`service-day-${i}`} /></div>
              <div className="space-y-1"><Label className="text-xs">Time</Label><Input value={s.time} onChange={(e) => setService(i, 'time', e.target.value)} data-testid={`service-time-${i}`} /></div>
              <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={s.description} onChange={(e) => setService(i, 'description', e.target.value)} data-testid={`service-desc-${i}`} /></div>
              <Button size="icon" variant="outline" className="text-red-600" disabled={!canEdit} onClick={() => removeService(i)} data-testid={`remove-service-${i}`}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
      </fieldset>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700" data-testid="save-churchinfo-btn-bottom">
            <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
};
