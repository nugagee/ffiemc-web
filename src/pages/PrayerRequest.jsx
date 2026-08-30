import React, { useMemo, useState } from 'react';
import api, { formatApiError } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Heart, Send } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { pageSection } from '../data/sitePages';
import { BranchSelect } from '../components/programs/BranchSelect';

export const PrayerRequest = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, 'prayer', 'hero');
  const categories = useMemo(() => {
    const items = pageSection(settings, 'prayer', 'categories').items || [];
    return items.map((item) => item.name || item).filter(Boolean);
  }, [settings]);
  const defaultCategory = categories[0] || 'Personal Prayer Request';
  const [form, setForm] = useState({ name: '', email: '', phone: '', category: defaultCategory, request: '', is_public: false, branch_id: '' });
  const [submitting, setSubmitting] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/prayer-requests', form);
      toast.success("Your prayer request has been received. Our team will be praying for you.");
      setForm({ name: '', email: '', phone: '', category: defaultCategory, request: '', is_public: false, branch_id: '' });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" data-testid="prayer-page">
      <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{hero.badge}</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {hero.headline} <span className="text-red-600 block">{hero.accent}</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {hero.intro}
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg border-0">
            <CardContent className="p-8">
              <form onSubmit={submit} className="space-y-6" data-testid="prayer-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" name="name" value={form.name} onChange={change} required data-testid="prayer-name" className="focus:border-red-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" name="email" type="email" value={form.email} onChange={change} required data-testid="prayer-email" className="focus:border-red-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" name="phone" type="tel" value={form.phone} onChange={change} required minLength={7} data-testid="prayer-phone" className="focus:border-red-500" />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger data-testid="prayer-category"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <BranchSelect value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })} required={false} label="Church branch (optional)" />
                <div className="space-y-2">
                  <Label htmlFor="request">Prayer Request *</Label>
                  <Textarea id="request" name="request" rows={5} value={form.request} onChange={change} required data-testid="prayer-request" className="focus:border-red-500" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="is_public" checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: Boolean(v) })} />
                  <Label htmlFor="is_public" className="font-normal text-sm text-gray-600">I am comfortable sharing this request with the prayer team publicly</Label>
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-red-600 hover:bg-red-700" data-testid="prayer-submit">
                  {submitting ? 'Sending…' : (<><Send className="h-4 w-4 mr-2" />Submit Prayer Request</>)}
                </Button>
                <p className="text-center text-sm text-gray-500 flex items-center justify-center gap-1">
                  <Heart className="h-3.5 w-3.5 text-red-500" /> Your request is confidential and handled with care.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};
