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
import { sendPrayerSubmissionEmails } from '../lib/email';
import { validateEmail, phoneError } from '../lib/emailValidation';
import { focusFirstInvalid, hasFieldErrors, invalidInputClass } from '../lib/formErrors';

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
  const [errors, setErrors] = useState({});
  const [suggestion, setSuggestion] = useState('');

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const emailResult = validateEmail(form.email, { required: true });
    const next = {};
    if (!String(form.name || '').trim()) next.name = 'Enter your name';
    if (!emailResult.ok) next.email = emailResult.message;
    const phoneMsg = phoneError(form.phone, true);
    if (phoneMsg) next.phone = phoneMsg;
    if (!String(form.request || '').trim()) next.request = 'Enter your prayer request';
    setErrors(next);
    setSuggestion(emailResult.suggestion || '');
    if (hasFieldErrors(next)) {
      focusFirstInvalid(next);
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/prayer-requests', form);
      try {
        await sendPrayerSubmissionEmails({
          ...form,
          adminEmail: settings.notificationEmail || 'adenugaolajideadewale@gmail.com',
          secondaryEmails: settings.secondaryNotificationEmails,
          emailSubjects: settings.emailSubjects,
        });
      } catch (emailErr) {
        console.warn('Prayer email failed:', emailErr.message);
      }
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
              <form onSubmit={submit} noValidate className="space-y-6" data-testid="prayer-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2" data-field="name">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" name="name" value={form.name} onChange={change} data-testid="prayer-name" aria-invalid={Boolean(errors.name)} className={invalidInputClass(Boolean(errors.name), "focus:border-red-500")} />
                    {errors.name ? <p className="text-sm text-red-600" role="alert">{errors.name}</p> : null}
                  </div>
                  <div className="space-y-2" data-field="email">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" name="email" type="email" value={form.email} onChange={change} data-testid="prayer-email" aria-invalid={Boolean(errors.email)} className={invalidInputClass(Boolean(errors.email), "focus:border-red-500")} />
                    {suggestion ? (
                      <button type="button" className="text-sm font-medium text-red-700 underline" onClick={() => { setForm({ ...form, email: suggestion }); setSuggestion(''); setErrors((prev) => ({ ...prev, email: '' })); }}>
                        Did you mean {suggestion}?
                      </button>
                    ) : null}
                    {errors.email ? <p className="text-sm text-red-600" role="alert">{errors.email}</p> : null}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2" data-field="phone">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" name="phone" type="tel" value={form.phone} onChange={change} data-testid="prayer-phone" aria-invalid={Boolean(errors.phone)} className={invalidInputClass(Boolean(errors.phone), "focus:border-red-500")} />
                    {errors.phone ? <p className="text-sm text-red-600" role="alert">{errors.phone}</p> : null}
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
                <div className="space-y-2" data-field="request">
                  <Label htmlFor="request">Prayer Request *</Label>
                  <Textarea id="request" name="request" rows={5} value={form.request} onChange={change} data-testid="prayer-request" aria-invalid={Boolean(errors.request)} className={invalidInputClass(Boolean(errors.request), "focus:border-red-500")} />
                  {errors.request ? <p className="text-sm text-red-600" role="alert">{errors.request}</p> : null}
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
