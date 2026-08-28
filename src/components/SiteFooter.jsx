import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Facebook, Twitter, Youtube, Instagram, Music2, Headphones } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const SOCIAL_ICONS = {
  facebook: Facebook,
  twitter: Twitter,
  youtube: Youtube,
  instagram: Instagram,
  tiktok: Music2,
  audiomack: Headphones,
};

export const Footer = () => {
  const { settings } = useSettings();
  const socials = settings.socials || {};
  const activeSocials = Object.entries(socials).filter(([, url]) => url && url.trim());

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Church Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img src={settings.logo} alt={settings.name} className="h-10 w-10 rounded-full" />
              <div>
                <h3 className="text-lg font-semibold text-red-400">Fire-Fire Int'l</h3>
                <p className="text-sm text-gray-300">Evangelical Church</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{settings.motto}</p>
            {activeSocials.length > 0 && (
              <div className="flex space-x-4" data-testid="footer-socials">
                {activeSocials.map(([key, url]) => {
                  const Icon = SOCIAL_ICONS[key] || Music2;
                  return (
                    <a key={key} href={url} target="_blank" rel="noreferrer" aria-label={key}
                       data-testid={`footer-social-${key}`}
                       className="text-gray-400 hover:text-red-400 transition-colors">
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-red-400">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { name: 'About Us', path: '/about' },
                { name: 'Our Services', path: '/services' },
                { name: 'Leadership', path: '/leadership' },
                { name: 'Ministries', path: '/ministries' },
                { name: 'Events', path: '/events' },
                { name: 'Contact', path: '/contact' }
              ].map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-gray-300 hover:text-red-400 transition-colors text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Service Times */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-red-400">Service Times</h3>
            <ul className="space-y-3">
              {(settings.serviceTimes || []).map((service, i) => (
                <li key={i} className="space-y-1">
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-red-400" />
                    <span className="text-white font-medium">{service.day}</span>
                  </div>
                  <p className="text-xs text-gray-300 ml-6">{service.name}</p>
                  <p className="text-xs text-gray-400 ml-6">{service.time}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-red-400">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-300 text-sm leading-relaxed">{settings.location}</p>
              </div>
              {settings.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-red-400" />
                  <p className="text-gray-300 text-sm">{settings.phone}</p>
                </div>
              )}
              {settings.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-red-400" />
                  <p className="text-gray-300 text-sm">{settings.email}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {settings.name}. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link to="/privacy" className="text-gray-400 hover:text-red-400 text-sm transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-gray-400 hover:text-red-400 text-sm transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
