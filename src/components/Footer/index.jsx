import React from "react";
import SectionWrapper from "../Layout/SectionWrapper";

const FooterSection = () => (
  <footer className="bg-[var(--color-bg-dark)] text-[var(--color-text-light)] py-10">
    <div className="max-w-6xl mx-auto px-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
      <div>
        <h4 className="font-heading text-xl mb-3 text-[var(--color-accent)]">
          Fire Evangelical Church
        </h4>
        <p className="text-sm text-gray-300 leading-relaxed">
          Igniting hearts and transforming lives through God’s love.
        </p>
      </div>
      <div>
        <h5 className="font-semibold mb-3">Quick Links</h5>
        <ul className="space-y-2 text-gray-300 text-sm">
          <li><a href="#about" className="hover:text-[var(--color-accent)]">About</a></li>
          <li><a href="#events" className="hover:text-[var(--color-accent)]">Events</a></li>
          <li><a href="#sermons" className="hover:text-[var(--color-accent)]">Sermons</a></li>
        </ul>
      </div>
      <div>
        <h5 className="font-semibold mb-3">Service Times</h5>
        <p className="text-gray-300 text-sm">
          Sunday: 8:30AM & 10:30AM <br />
          Wednesday: 6:00PM
        </p>
      </div>
      <div>
        <h5 className="font-semibold mb-3">Contact</h5>
        <p className="text-gray-300 text-sm">
          123 Revival Ave, Lagos<br />
          info@fireevangelical.org
        </p>
      </div>
    </div>
    <div className="text-center text-gray-400 text-sm mt-10 border-t border-gray-700 pt-6">
      © {new Date().getFullYear()} Fire Evangelical Church. All Rights Reserved.
    </div>
  </footer>
);

export default FooterSection;
