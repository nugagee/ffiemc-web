import React, { useState } from "react";
import { MapPin } from "lucide-react";

const MAP_ADDRESS = "Fire-Fire Area, Olomi, Ibadan, Nigeria";

const GoogleMap = ({ address = MAP_ADDRESS, className = "" }) => {
  const [mapError, setMapError] = useState(false);

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const encodedAddress = encodeURIComponent(address);
  const embedUrl = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}&zoom=15`
    : null;

  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  const Placeholder = () => (
    <a
      href={mapsLink}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center justify-center w-full h-full min-h-[300px] bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-700"
    >
      <MapPin className="w-16 h-16 mb-2 opacity-50" />
      <p className="font-medium">Interactive Map</p>
      <p className="text-sm">{address}</p>
      <p className="text-xs mt-2 text-gray-400">
        {apiKey ? "Map failed to load. Click to open in Google Maps." : "Add REACT_APP_GOOGLE_MAPS_API_KEY to enable the map."}
      </p>
    </a>
  );

  if (!embedUrl || mapError) {
    return (
      <div className={`rounded-2xl overflow-hidden border border-gray-200 ${className}`}>
        <Placeholder />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="rounded-2xl overflow-hidden border border-gray-200 aspect-video">
        <iframe
          title="Church location - Fire-Fire Area, Olomi, Ibadan"
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          onError={() => setMapError(true)}
        />
      </div>
      <a
        href={mapsLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-3 text-sm text-primary color-primary hover:underline"
      >
        Open in Google Maps for directions
      </a>
    </div>
  );
};

export default GoogleMap;
