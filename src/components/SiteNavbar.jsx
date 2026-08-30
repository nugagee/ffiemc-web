import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Menu, ChevronDown } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openSub, setOpenSub] = useState(null);
  const location = useLocation();
  const { settings } = useSettings();
  const isHome = location.pathname === '/';
  const solid = !isHome || scrolled || isOpen;

  const navigationItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Services', path: '/services' },
    { name: 'Leadership', path: '/leadership' },
    {
      name: 'Ministries',
      path: '/ministries',
      subItems: [
        { name: 'All Ministries', path: '/ministries' },
        { name: 'Youth Ministry', path: '/ministries#youth' },
        { name: 'Women Ministry', path: '/ministries#women' },
        { name: 'Men Ministry', path: '/ministries#men' },
      ],
    },
    { name: 'Events', path: '/events' },
    { name: 'Sermons', path: '/sermons' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setOpenSub(null);
  }, [location.pathname]);

  const isActivePath = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const linkIdle = solid
    ? 'text-gray-700 hover:text-red-600 hover:bg-red-50'
    : 'text-white/90 hover:text-white hover:bg-white/10';
  const linkActive = solid
    ? 'text-red-600 bg-red-50'
    : 'text-white bg-white/15';

  return (
    <>
      <nav
        className={`fixed inset-x-0 z-50 transition-all duration-300 ease-out ${
          solid
            ? 'bg-white/95 backdrop-blur-md shadow-md border-b border-gray-100'
            : 'bg-transparent border-b border-transparent'
        }`}
        style={{ top: 'var(--ffiemc-banner-h, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-20 md:h-24">
            <Link
              to="/"
              className="flex items-center shrink-0 mr-3 md:mr-6 z-10"
              aria-label={settings.name || 'Home'}
            >
              <img
                src={settings.logo}
                alt={settings.name || 'Church logo'}
                className={`h-14 w-14 md:h-[4.5rem] md:w-[4.5rem] rounded-full object-cover shrink-0 shadow-sm transition-all duration-300 ${
                  solid ? 'ring-2 ring-red-100' : 'ring-2 ring-white/40'
                }`}
              />
            </Link>

            {/* Mobile-only brand: centered between logo and hamburger */}
            <div
              className="lg:hidden absolute inset-x-0 flex flex-col items-center justify-center pointer-events-none px-14 sm:px-16 text-center"
              aria-hidden="true"
            >
              <span
                className={`text-[0.7rem] sm:text-sm font-semibold leading-tight tracking-wide ${
                  solid ? 'text-gray-900' : 'text-white'
                }`}
              >
                Fire-Fire International
              </span>
              <span
                className={`text-[0.65rem] sm:text-xs font-medium leading-tight mt-0.5 ${
                  solid ? 'text-red-600' : 'text-amber-200'
                }`}
              >
                Evangelical Church
              </span>
            </div>

            <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              {navigationItems.map((item) => (
                <div key={item.name} className="relative group">
                  <Link
                    to={item.path}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      isActivePath(item.path) ? linkActive : linkIdle
                    }`}
                  >
                    {item.name}
                    {item.subItems && <ChevronDown className="ml-1 h-4 w-4" />}
                  </Link>

                  {item.subItems && (
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-2">
                        {item.subItems.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.path}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600"
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden lg:flex items-center space-x-3">
              <Button
                asChild
                variant="outline"
                className={
                  solid
                    ? 'border-red-600 text-red-600 hover:bg-red-600 hover:text-white'
                    : 'border-white text-white hover:bg-white hover:text-red-600 bg-transparent'
                }
              >
                <Link to="/prayer-request">Prayer Request</Link>
              </Button>
              <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
                <Link to="/donate">Give</Link>
              </Button>
            </div>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`relative z-10 lg:hidden h-11 w-11 ${
                    solid
                      ? 'text-gray-900 hover:bg-gray-100'
                      : 'text-white hover:bg-white/15'
                  }`}
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[min(100vw,20rem)] p-0 flex flex-col border-l border-gray-100"
              >
                <SheetHeader className="px-5 pt-5 pb-4 border-b border-gray-100 text-left">
                  <div className="flex items-center gap-3 pr-8">
                    <img
                      src={settings.logo}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-red-100"
                    />
                    <div className="min-w-0">
                      <SheetTitle className="text-base font-semibold text-gray-900 truncate">
                        {settings.name || 'Menu'}
                      </SheetTitle>
                      <p className="text-xs text-gray-500">Navigate the website</p>
                    </div>
                  </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                  {navigationItems.map((item) => {
                    const active = isActivePath(item.path);
                    const expanded = openSub === item.name;
                    if (item.subItems) {
                      return (
                        <div key={item.name} className="rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setOpenSub(expanded ? null : item.name)}
                            className={`w-full flex items-center justify-between px-4 py-3.5 text-left text-base font-medium rounded-xl transition-colors ${
                              active ? 'text-red-600 bg-red-50' : 'text-gray-800 hover:bg-gray-50'
                            }`}
                          >
                            <span>{item.name}</span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${
                                expanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          {expanded && (
                            <div className="ml-2 mb-1 space-y-0.5 border-l-2 border-red-100 pl-2">
                              {item.subItems.map((subItem) => (
                                <Link
                                  key={subItem.name}
                                  to={subItem.path}
                                  onClick={() => setIsOpen(false)}
                                  className="block px-4 py-2.5 text-sm text-gray-600 rounded-lg hover:text-red-600 hover:bg-red-50"
                                >
                                  {subItem.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`block px-4 py-3.5 text-base font-medium rounded-xl transition-colors ${
                          active ? 'text-red-600 bg-red-50' : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>

                <div className="px-4 py-4 border-t border-gray-100 space-y-2.5 bg-gray-50/80">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-11 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                  >
                    <Link to="/prayer-request" onClick={() => setIsOpen(false)}>
                      Prayer Request
                    </Link>
                  </Button>
                  <Button asChild className="w-full h-11 bg-red-600 hover:bg-red-700 text-white">
                    <Link to="/donate" onClick={() => setIsOpen(false)}>
                      Give
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      {!isHome && (
        <div
          className="h-20 md:h-24"
          style={{ marginTop: 'var(--ffiemc-banner-h, 0px)' }}
          aria-hidden
        />
      )}
    </>
  );
};
