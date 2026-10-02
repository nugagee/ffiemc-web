import {
  announcementHasImages,
  buildMemberAnnouncementContent,
  memberAnnouncementSmsText,
  normalizeAnnouncementImages,
  safeHttpUrl,
} from "./announcementEmail";

const FLYER = "https://cdn.example.com/flyers/youth-convention.png";
const HEADER = "https://cdn.example.com/banners/header.jpg";

describe("member announcement email", () => {
  test("keeps a text-only announcement as a letter without images", () => {
    const mail = buildMemberAnnouncementContent({
      fullName: "Ada Okonkwo",
      title: "Midweek service",
      body: "Join us on Wednesday at 5pm.\n\nCome expecting.",
    });

    expect(mail.subject).toBe("Midweek service");
    expect(mail.text).toContain("Hi Ada,");
    expect(mail.text).toContain("Join us on Wednesday at 5pm.");
    expect(mail.text.replace(/https:\/\/ffiem\.org/g, "")).not.toMatch(/https?:\/\//);
    expect(mail.html).not.toContain("<img");
    expect(mail.html).not.toContain("<a href=\"https://cdn");
    expect(mail.html).toContain("Hi Ada,");
    expect(mail.html).toContain("<table");
  });

  test("renders a header, flyer images, and a button in HTML and plain text", () => {
    const mail = buildMemberAnnouncementContent({
      fullName: "Samuel Ade",
      subject: "Youth convention this Friday",
      title: "Youth convention",
      body: "Doors open at 4pm.",
      programTitle: "Youth Convention",
      headerImageUrl: HEADER,
      images: [
        { url: FLYER, alt: "Event flyer" },
        { url: HEADER, alt: "duplicate of header" },
      ],
      buttonUrl: "https://ffiem.org/register/youth",
      buttonLabel: "Register",
    });

    expect(mail.html).toContain(`src="${HEADER}"`);
    expect(mail.html).toContain(`src="${FLYER}"`);
    expect(mail.html.match(/<img /g)).toHaveLength(2);
    expect(mail.html).toContain('alt="Event flyer"');
    expect(mail.html).toContain('width="600"');
    expect(mail.html).toContain("display:block");
    expect(mail.html).toContain('href="https://ffiem.org/register/youth"');
    expect(mail.html).toContain(">Register</a>");
    expect(mail.html).toContain("v:roundrect");
    expect(mail.text).toContain(`Header image: ${HEADER}`);
    expect(mail.text).toContain(`Event flyer: ${FLYER}`);
    expect(mail.text).toContain("Register: https://ffiem.org/register/youth");
    expect(mail.text).toContain("Program: Youth Convention");
    expect(mail.text).not.toContain("duplicate of header");
  });

  test("drops unsafe image and button URLs", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBe("");
    expect(safeHttpUrl("data:text/html,hi")).toBe("");
    expect(normalizeAnnouncementImages([
      "javascript:alert(1)",
      { url: "https://cdn.example.com/ok.png", alt: '"><script>' },
      { url: FLYER, alt: "Flyer" },
      { url: FLYER, alt: "again" },
    ])).toEqual([
      { url: "https://cdn.example.com/ok.png", alt: '"><script>' },
      { url: FLYER, alt: "Flyer" },
    ]);

    const mail = buildMemberAnnouncementContent({
      fullName: "Ada",
      title: "Notice",
      body: "Hello",
      headerImageUrl: "javascript:alert(1)",
      images: [{ url: "data:image/png;base64,aaaa", alt: "bad" }],
      buttonUrl: "javascript:alert(1)",
      buttonLabel: "Click",
    });
    expect(mail.html).not.toContain("<img");
    expect(mail.html).not.toContain("javascript:");
    expect(mail.html).not.toContain("data:image");
    expect(mail.html).not.toContain("<script>");
  });

  test("escapes alt text so it cannot break the img tag", () => {
    const mail = buildMemberAnnouncementContent({
      title: "Notice",
      body: "Hello",
      images: [{ url: FLYER, alt: '"><img src=x onerror=alert(1)>' }],
    });
    expect(mail.html).toContain('alt="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"');
    expect(mail.html.match(/<img /g)).toHaveLength(1);
  });

  test("SMS stays the title and body, and appends a short link", () => {
    expect(memberAnnouncementSmsText({ title: "Choir", body: "Rehearsal at 4." })).toBe(
      "Choir\n\nRehearsal at 4."
    );
    expect(
      memberAnnouncementSmsText({
        title: "Choir",
        body: "Rehearsal at 4.",
        buttonUrl: "https://ffiem.org/choir",
      })
    ).toBe("Choir\n\nRehearsal at 4.\nhttps://ffiem.org/choir");
    const longBody = "a".repeat(500);
    const sms = memberAnnouncementSmsText({
      title: "Choir",
      body: longBody,
      buttonUrl: "https://ffiem.org/choir",
    });
    expect(sms.length).toBeLessThanOrEqual(480);
    expect(sms).not.toContain("https://");
  });

  test("detects stored images on a notification row", () => {
    expect(announcementHasImages({ body: "text only" })).toBe(false);
    expect(announcementHasImages({ header_image_url: HEADER })).toBe(true);
    expect(announcementHasImages({ images: [{ url: FLYER, alt: "" }] })).toBe(true);
  });
});
