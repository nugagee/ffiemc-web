import { sendContributionPaymentUpdatedEmail } from "./email";

describe("contribution payment update email", () => {
  const previousUrl = process.env.REACT_APP_SUPABASE_URL;
  const previousKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  beforeEach(() => {
    process.env.REACT_APP_SUPABASE_URL = "https://mpdvjaotalklzftktuuv.supabase.co";
    process.env.REACT_APP_SUPABASE_ANON_KEY = "anon-test";
    localStorage.setItem("ffiemc_admin_token", "admin-token");
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, memberSent: true, adminSent: true, memberReason: null, adminReason: null }),
    }));
  });

  afterEach(() => {
    process.env.REACT_APP_SUPABASE_URL = previousUrl;
    process.env.REACT_APP_SUPABASE_ANON_KEY = previousKey;
    localStorage.removeItem("ffiemc_admin_token");
  });

  test("asks send-email for the payment id only, with the admin session", async () => {
    await sendContributionPaymentUpdatedEmail("11111111-1111-4111-8111-111111111111");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://mpdvjaotalklzftktuuv.supabase.co/functions/v1/send-email");
    expect(init.headers.Authorization).toBe("Bearer admin-token");
    expect(JSON.parse(init.body)).toEqual({
      purpose: "contribution_payment_updated",
      contributionId: "11111111-1111-4111-8111-111111111111",
    });
  });

  test("does not fall back to the anon key when the admin session is rejected", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 403,
      json: async () => ({ error: "Admin session required" }),
    }));
    await expect(sendContributionPaymentUpdatedEmail("11111111-1111-4111-8111-111111111111")).rejects.toThrow(
      "Admin session required"
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
