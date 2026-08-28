import React, { useState } from "react";
import api, { formatApiError } from "../lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Heart, Flame, Building2, Users, Globe, Gift } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { pageSection } from "../data/sitePages";

const iconFor = (id) =>
  ({
    tithe: Heart,
    offering: Gift,
    building: Building2,
    missions: Globe,
    youth: Users,
    special: Flame,
  }[id] || Gift);

const PRESETS = [1000, 2000, 5000, 10000, 20000, 50000];

export const Donate = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, "donate", "hero");
  const purposes = pageSection(settings, "donate", "purposes").items || [];
  const [form, setForm] = useState({
    name: "",
    email: "",
    amount: "",
    purpose: "tithe",
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/donations/initialize", {
        name: form.name,
        email: form.email,
        amount: Number(form.amount),
        purpose: form.purpose,
      });
      toast.success(
        "Thank you! Your giving intent was received. Our team will follow up with payment instructions."
      );
      setForm({ name: "", email: "", amount: "", purpose: "tithe" });
    } catch (err) {
      toast.error(
        formatApiError(err.response?.data?.detail) ||
          "Could not submit your gift right now."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" data-testid="donate-page">
      <section className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-800 text-white hover:bg-red-800 mb-4">
            <Flame className="w-4 h-4 mr-2 inline" />
            {hero.badge}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {hero.headline}
          </h1>
          <p className="text-lg text-red-100 max-w-3xl mx-auto leading-relaxed">
            {hero.intro}
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Where would you like to give?
            </h2>
            {purposes.map((p) => {
              const Icon = iconFor(p.id);
              const active = form.purpose === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setForm({ ...form, purpose: p.id })}
                  className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    active
                      ? "border-red-600 bg-red-50"
                      : "border-gray-200 hover:border-red-300"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      active
                        ? "bg-red-600 text-white"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-500">{p.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-3">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Make a Donation</CardTitle>
                <CardDescription>
                  Submit your giving intent and we&apos;ll send payment details.
                  Online Paystack checkout can be added via a Supabase Edge
                  Function later.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₦) *</Label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {PRESETS.map((amt) => (
                        <button
                          type="button"
                          key={amt}
                          onClick={() =>
                            setForm({ ...form, amount: String(amt) })
                          }
                          className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                            String(amt) === form.amount
                              ? "border-red-600 bg-red-600 text-white"
                              : "border-gray-200 hover:border-red-400"
                          }`}
                        >
                          ₦{amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Or enter a custom amount"
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-semibold"
                  >
                    {loading ? (
                      "Submitting..."
                    ) : (
                      <>
                        <Heart className="h-5 w-5 mr-2" />
                        Submit Gift Intent
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};
