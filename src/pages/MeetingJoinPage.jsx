import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarPlus, Download, Video } from "lucide-react";
import { getPublicMeeting } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  buildIcs,
  downloadIcs,
  formatMeetingWhen,
  googleCalendarUrl,
} from "../lib/meetings";

export function MeetingJoinPage() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getPublicMeeting(id)
      .then((row) => {
        if (!row) setError("This meeting is not available.");
        else setMeeting(row);
      })
      .catch((e) => setError(e.message || "Could not load meeting"));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }
  if (!meeting) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <p className="text-gray-500">Loading meeting…</p>
      </div>
    );
  }

  const when = formatMeetingWhen(meeting.starts_at, meeting.ends_at, meeting.timezone);
  const calUrl = googleCalendarUrl({
    title: meeting.title,
    description: meeting.description,
    location: meeting.location,
    startsAt: meeting.starts_at,
    endsAt: meeting.ends_at,
    meetUrl: meeting.meet_url,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 py-16 px-4">
      <Card className="max-w-lg mx-auto p-8 text-center shadow-lg border-0">
        <Video className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Church meeting</p>
        <h1 className="text-2xl font-bold mt-2">{meeting.title}</h1>
        <p className="text-gray-600 mt-3">{when}</p>
        {meeting.location ? <p className="text-sm text-gray-500 mt-1">{meeting.location}</p> : null}
        {meeting.description ? (
          <p className="text-gray-700 mt-6 whitespace-pre-wrap text-left">{meeting.description}</p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3">
          {meeting.meet_url ? (
            <Button asChild className="bg-red-600 hover:bg-red-700">
              <a href={meeting.meet_url} target="_blank" rel="noreferrer">Join meeting</a>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <a href={calUrl} target="_blank" rel="noreferrer">
              <CalendarPlus className="h-4 w-4 mr-2" /> Add to Google Calendar
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              downloadIcs(
                `${meeting.title || "meeting"}.ics`,
                buildIcs({
                  id: meeting.id,
                  title: meeting.title,
                  description: meeting.description,
                  location: meeting.location,
                  startsAt: meeting.starts_at,
                  endsAt: meeting.ends_at,
                  meetUrl: meeting.meet_url,
                })
              )
            }
          >
            <Download className="h-4 w-4 mr-2" /> Download calendar file (.ics)
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-6">Fire-Fire International Evangelical Church</p>
      </Card>
    </div>
  );
}
