import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import { Send, Quote } from "lucide-react";
import api, { formatApiError, authApi } from "../lib/api";
import { sendTestimonySubmissionEmails } from "../lib/email";
import { useSettings } from "../context/SettingsContext";
import { BranchSelect } from "../components/programs/BranchSelect";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  role: "Church Member",
  dateJoined: "",
  title: "",
  testimony: "",
  consent_public: false,
  branch_id: "",
};

export const ShareTestimony = () => {
  const { settings } = useSettings();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.consent_public) {
      toast.error("Please confirm you consent to share your testimony.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/testimonies/submit", form);
      try {
        await sendTestimonySubmissionEmails({
          ...form,
          adminEmail: settings.notificationEmail || "adenugaolajideadewale@gmail.com",
        });
        if (data?.id) {
          await authApi.markTestimonyConfirmationSent(data.id).catch(() => {});
        }
      } catch (emailErr) {
        console.warn("Testimony email failed:", emailErr.message);
      }
      toast.success(
        "Thank you! Your testimony was submitted and will appear after our team reviews it."
      );
      setForm(emptyForm);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" data-testid="share-testimony-page">
      <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">Share Your Story</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Share Your <span className="text-red-600">Testimony</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Tell us how God has worked in your life. Submissions are reviewed by our team before
            they appear on the website.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={submit} className="space-y-5" data-testid="testimony-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={change}
                      required
                      className="focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={change}
                      required
                      className="focus:border-red-500"
                    />
                    <p className="text-xs text-gray-500">
                      Used for confirmation and if we need to follow up.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={change}
                      required
                      className="focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">How you relate to the church</Label>
                    <Input
                      id="role"
                      name="role"
                      value={form.role}
                      onChange={change}
                      placeholder="e.g. Church Member, Visitor, Youth"
                      className="focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateJoined">Member / attending since</Label>
                    <Input
                      id="dateJoined"
                      name="dateJoined"
                      value={form.dateJoined}
                      onChange={change}
                      placeholder="e.g. 2019"
                      className="focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Short title (optional)</Label>
                    <Input
                      id="title"
                      name="title"
                      value={form.title}
                      onChange={change}
                      placeholder="e.g. He restored my family"
                      className="focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testimony">Your testimony *</Label>
                  <Textarea
                    id="testimony"
                    name="testimony"
                    rows={7}
                    value={form.testimony}
                    onChange={change}
                    required
                    minLength={20}
                    placeholder="Share what God has done…"
                    className="focus:border-red-500"
                  />
                </div>

                <BranchSelect value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })} required={false} label="Church branch (optional)" />

                <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                  <Checkbox
                    id="consent_public"
                    checked={form.consent_public}
                    onCheckedChange={(v) => setForm({ ...form, consent_public: Boolean(v) })}
                  />
                  <Label htmlFor="consent_public" className="font-normal text-sm text-gray-700 leading-relaxed">
                    I consent to Fire-Fire International Evangelical Church reviewing and, if
                    approved, publishing my testimony (name and story) on the website and related
                    church communications. See our{" "}
                    <Link to="/privacy" className="text-red-700 underline underline-offset-2">
                      privacy policy
                    </Link>
                    . *
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {submitting ? (
                    "Submitting…"
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit testimony
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-gray-500 flex items-center justify-center gap-1">
                  <Quote className="h-3.5 w-3.5 text-red-500" />
                  Or{" "}
                  <Link to="/testimonies" className="text-red-600 underline-offset-2 hover:underline">
                    read published stories
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default ShareTestimony;
