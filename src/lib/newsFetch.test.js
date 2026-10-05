import { newsFetchRequest } from "./newsFetch";

describe("newsFetchRequest", () => {
  test("sends the cron secret in a header and strips it from the URL", () => {
    const request = newsFetchRequest(
      "https://example.supabase.co/functions/v1/fetch-christian-news?secret=super-secret",
      "super-secret"
    );
    expect(request.url).toBe("https://example.supabase.co/functions/v1/fetch-christian-news");
    expect(request.url).not.toMatch(/secret=/);
    expect(request.init.headers["x-cron-secret"]).toBe("super-secret");
    expect(request.init.method).toBe("POST");
  });

  test("omits the header when no secret is configured", () => {
    const request = newsFetchRequest("https://example.supabase.co/functions/v1/fetch-christian-news", "");
    expect(request.init.headers["x-cron-secret"]).toBeUndefined();
  });
});