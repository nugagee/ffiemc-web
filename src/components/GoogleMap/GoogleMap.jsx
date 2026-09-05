import React, { useMemo } from "react";
import { ExternalLink, MapPin, Navigation } from "lucide-react";

/** HQ: Papa Agric / Olomi area, off Olojuoro Road, Ibadan */
export const CHURCH_MAP = {
  address: "Fire-Fire Area, Papa Agric, Off Olojuoro Olunde Road, Olomi, Ibadan, Nigeria",
  lat: 7.3216,
  lng: 3.961,
  zoom: 16,
  label: "Fire-Fire International Evangelical Church",
};

/**
 * Google Maps embed that centers on the church without requiring Maps Embed API billing.
 * Optional REACT_APP_GOOGLE_MAPS_API_KEY uses the official Place embed when set to a real key.
 */
const GoogleMap = ({
  address,
  lat = CHURCH_MAP.lat,
  lng = CHURCH_MAP.lng,
  zoom = CHURCH_MAP.zoom,
  label = CHURCH_MAP.label,
  className = "",
}) => {
  const resolvedAddress = (address && String(address).trim()) || CHURCH_MAP.address;
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const hasRealKey = Boolean(apiKey && !/your_api_key|changeme|placeholder/i.test(apiKey));

  const { embedUrl, mapsLink, directionsLink } = useMemo(() => {
    const coordQuery = `${lat},${lng}`;
    const placeQuery = resolvedAddress;
    // Prefer coordinates so the map always pans to Ibadan HQ (geocoding of long addresses is unreliable).
    const searchQuery = encodeURIComponent(`${label}, ${placeQuery}`);
    const coordEncoded = encodeURIComponent(coordQuery);

    const embed = hasRealKey
      ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${coordEncoded}&zoom=${zoom}&center=${lat},${lng}`
      : `https://www.google.com/maps?q=${coordEncoded}&z=${zoom}&hl=en&output=embed`;

    return {
      embedUrl: embed,
      mapsLink: `https://www.google.com/maps/search/?api=1&query=${searchQuery}`,
      directionsLink: `https://www.google.com/maps/dir/?api=1&destination=${coordEncoded}`,
    };
  }, [apiKey, hasRealKey, label, lat, lng, resolvedAddress, zoom]);

  return (
    <div className={className} data-testid="church-google-map">
      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
        <div className="relative w-full aspect-[16/10] min-h-[280px] sm:min-h-[360px]">
          <iframe
            title={`${label} — ${resolvedAddress}`}
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-2 text-sm text-gray-600 min-w-0">
          <MapPin className="h-4 w-4 mt-0.5 text-red-600 shrink-0" />
          <p className="leading-relaxed">{resolvedAddress}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a
            href={directionsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3.5 py-2 transition-colors"
          >
            <Navigation className="h-4 w-4" />
            Get directions
          </a>
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-3.5 py-2 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open in Maps
          </a>
        </div>
      </div>
    </div>
  );
};

export default GoogleMap;
