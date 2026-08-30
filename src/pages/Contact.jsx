import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { MapPin, Phone, Mail, Clock, Facebook, Twitter, Youtube, Instagram, Music2, Headphones, Send } from 'lucide-react';
import api, { formatApiError } from '../lib/api';
import { sendContactEmails } from '../lib/email';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { useSettings } from '../context/SettingsContext';
import { pageSection } from '../data/sitePages';
import { BranchSelect } from '../components/programs/BranchSelect';

export const Contact = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, 'contact', 'hero');
  const hours = pageSection(settings, 'contact', 'hours');
  const serviceTimes = settings.serviceTimes || [];
  const socials = settings.socials || {};
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    branch_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/contact', formData);
      try {
        await sendContactEmails({
          ...formData,
          adminEmail: settings.notificationEmail || 'adenugaolajideadewale@gmail.com',
        });
        if (data?.id && isSupabaseConfigured) {
          await getSupabase()?.rpc('mark_contact_emailed', { p_id: data.id });
        }
      } catch (emailErr) {
        console.warn('Email send failed:', emailErr.message);
      }
      toast.success("Thank you for your message! We'll get back to you soon.");
      setFormData({ name: '', email: '', phone: '', subject: '', message: '', branch_id: '' });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: "Visit Us",
      details: [settings.location],
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      icon: Phone,
      title: "Call Us",
      details: settings.phone ? [settings.phone] : ["Contact us via email"],
      bgColor: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      icon: Mail,
      title: "Email Us",
      details: settings.email ? [settings.email] : ["info@firefireintl.org"],
      bgColor: "bg-red-100",
      iconColor: "text-red-600"
    },
    {
      icon: Clock,
      title: "Office Hours",
      details: [hours.weekday, hours.saturday, hours.sunday],
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-red-50 via-white to-orange-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{hero.badge}</Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {hero.headline}
            <span className="text-red-600 block">{hero.accent}</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {hero.intro}
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">Contact Information</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ways to Reach Us
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We're always available to serve you. Here are the best ways to get in touch with our team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className={`inline-flex items-center justify-center w-12 h-12 ${info.bgColor} rounded-full mb-4`}>
                    <info.icon className={`h-6 w-6 ${info.iconColor}`} />
                  </div>
                  <CardTitle className="text-lg">{info.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {info.details.map((detail, idx) => (
                      <CardDescription key={idx} className="text-gray-600 text-sm">
                        {detail}
                      </CardDescription>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Service Times */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">Send Message</Badge>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Send Us a Message
              </h2>
              <Card className="shadow-lg border-0">
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          data-testid="contact-name"
                          placeholder="Your full name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="border-gray-300 focus:border-red-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          data-testid="contact-email"
                          placeholder="your.email@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="border-gray-300 focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+234 XXX XXX XXXX"
                          value={formData.phone}
                          onChange={handleChange}
                          className="border-gray-300 focus:border-red-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          name="subject"
                          type="text"
                          data-testid="contact-subject"
                          placeholder="Message subject"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          className="border-gray-300 focus:border-red-500"
                        />
                      </div>
                    </div>

                    <BranchSelect
                      value={formData.branch_id}
                      onChange={(v) => setFormData({ ...formData, branch_id: v })}
                      required={false}
                      label="Church branch (optional)"
                    />

                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        name="message"
                        data-testid="contact-message"
                        placeholder="Tell us how we can help you..."
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        className="border-gray-300 focus:border-red-500 resize-none"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={submitting}
                      data-testid="contact-submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-semibold"
                    >
                      <Send className="h-5 w-5 mr-2" />
                      {submitting ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Service Times & Additional Info */}
            <div className="space-y-8">
              {/* Service Times */}
              <div>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">Service Schedule</Badge>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Join Us for Worship
                </h3>
                <Card className="shadow-lg border-0">
                  <CardContent className="p-6 space-y-4">
                    {serviceTimes.map((service, i) => (
                      <div key={i} className="flex items-start space-x-4 p-4 bg-red-50 rounded-lg">
                        <div className="bg-red-600 p-2 rounded-lg mt-1">
                          <Clock className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{service.name}</h4>
                          <p className="text-sm text-gray-600">{service.day} • {service.time}</p>
                          <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Social Media */}
              <div>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">Connect Online</Badge>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Follow Us
                </h3>
                <Card className="shadow-lg border-0">
                  <CardContent className="p-6">
                    <p className="text-gray-600 mb-6">
                      Stay connected with us on social media for updates, encouragement, 
                      and community fellowship.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {socials.facebook && (
                        <Button asChild variant="outline" className="justify-start hover:bg-blue-50 hover:border-blue-500">
                          <a href={socials.facebook} target="_blank" rel="noreferrer" data-testid="contact-social-facebook">
                            <Facebook className="h-4 w-4 mr-3 text-blue-600" />Facebook
                          </a>
                        </Button>
                      )}
                      {socials.twitter && (
                        <Button asChild variant="outline" className="justify-start hover:bg-sky-50 hover:border-sky-500">
                          <a href={socials.twitter} target="_blank" rel="noreferrer" data-testid="contact-social-twitter">
                            <Twitter className="h-4 w-4 mr-3 text-sky-600" />Twitter
                          </a>
                        </Button>
                      )}
                      {socials.youtube && (
                        <Button asChild variant="outline" className="justify-start hover:bg-red-50 hover:border-red-500">
                          <a href={socials.youtube} target="_blank" rel="noreferrer" data-testid="contact-social-youtube">
                            <Youtube className="h-4 w-4 mr-3 text-red-600" />YouTube
                          </a>
                        </Button>
                      )}
                      {socials.instagram && (
                        <Button asChild variant="outline" className="justify-start hover:bg-pink-50 hover:border-pink-500">
                          <a href={socials.instagram} target="_blank" rel="noreferrer" data-testid="contact-social-instagram">
                            <Instagram className="h-4 w-4 mr-3 text-pink-600" />Instagram
                          </a>
                        </Button>
                      )}
                      {socials.tiktok && (
                        <Button asChild variant="outline" className="justify-start hover:bg-gray-100 hover:border-gray-500">
                          <a href={socials.tiktok} target="_blank" rel="noreferrer" data-testid="contact-social-tiktok">
                            <Music2 className="h-4 w-4 mr-3 text-gray-800" />TikTok
                          </a>
                        </Button>
                      )}
                      {socials.audiomack && (
                        <Button asChild variant="outline" className="justify-start hover:bg-orange-50 hover:border-orange-500">
                          <a href={socials.audiomack} target="_blank" rel="noreferrer" data-testid="contact-social-audiomack">
                            <Headphones className="h-4 w-4 mr-3 text-orange-600" />Audiomack
                          </a>
                        </Button>
                      )}
                      {!Object.values(socials).some((v) => v && v.trim()) && (
                        <p className="text-sm text-gray-500 col-span-2">Social links coming soon.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section (Placeholder) */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">Find Us</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Location
            </h2>
            <p className="text-lg text-gray-600">
              {settings.location}
            </p>
          </div>

          <div className="bg-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">Interactive Map</p>
              <p className="text-sm">Map integration will be available soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Contact */}
      <section className="py-16 bg-red-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Need Immediate Prayer or Help?
            </h2>
            <p className="text-xl text-red-100 leading-relaxed">
              If you're facing an emergency or urgent spiritual need, don't hesitate to reach out. 
              Our pastoral team is available 24/7 for crisis support and prayer.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-red-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold"
              >
                <Phone className="h-5 w-5 mr-2" />
                Emergency Line
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-red-600 px-8 py-6 text-lg font-semibold"
              >
                Request Prayer
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};