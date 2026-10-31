import { buildContributionUpsertData, validateContributionPayment } from "./mediaContributions";

describe("contribution payment validation", () => {
  const valid = {
    team_member_id: "member-1",
    full_name: "Ada Okonkwo",
    amount: "2500",
    payment_date: "2026-10-28",
    note: "October dues",
    receipt_url: "https://example.com/receipt.pdf",
    month_id: "month-1",
  };

  test("accepts a complete payment, including a future date and a long note", () => {
    expect(validateContributionPayment(valid)).toEqual([]);
    expect(validateContributionPayment({ ...valid, payment_date: "2027-01-02" })).toEqual([]);
    expect(validateContributionPayment({ ...valid, payment_date: "", note: "x".repeat(1001) })).toEqual([]);
  });

  test("requires a positive amount, a real date when one is typed, and a name", () => {
    expect(validateContributionPayment({ ...valid, amount: "0" })).toContain(
      "Enter an amount greater than 0"
    );
    expect(validateContributionPayment({ ...valid, amount: "nope" })).toContain(
      "Enter an amount greater than 0"
    );
    expect(validateContributionPayment({ ...valid, payment_date: "2026-02-31" })).toContain(
      "Enter a valid payment date"
    );
    expect(
      validateContributionPayment({ ...valid, team_member_id: "", full_name: "A" })
    ).toContain("Select a team member or enter a name");
  });

  test("rejects a receipt that does not start with http", () => {
    expect(validateContributionPayment({ ...valid, receipt_url: "javascript:alert(1)" })).toContain(
      "Receipt link must start with http"
    );
    expect(validateContributionPayment({ ...valid, receipt_url: "HTTP://example.com/r.pdf" })).toEqual([]);
    expect(validateContributionPayment({ ...valid, month_id: "  " })).toContain("Month is required");
  });
});

describe("contribution upsert payload", () => {
  const form = {
    month_id: "month-1",
    team_member_id: "member-1",
    full_name: "Ada Okonkwo",
    amount: "2500",
    payment_date: "2026-10-28",
    note: "October dues",
    receipt_url: "https://example.com/receipt.pdf",
  };

  test("a new payment does not send the edit-only flags", () => {
    const data = buildContributionUpsertData(form, { editing: false });
    expect(data.team_member_id).toBe("member-1");
    expect(data.update_month).toBeUndefined();
    expect(data.clear_team_member).toBeUndefined();
    expect(data.payment_date).toBe("2026-10-28");
  });

  test("a new payment with no date omits payment_date so the database uses today", () => {
    const data = buildContributionUpsertData(
      { month_id: "month-1", full_name: "Ada Okonkwo", amount: "10", payment_date: "" },
      { editing: false }
    );
    expect(data.payment_date).toBeUndefined();
    expect(data.note).toBeUndefined();
    expect(data.receipt_url).toBeUndefined();
    expect(data.team_member_id).toBeUndefined();
    expect(data.clear_team_member).toBeUndefined();
  });

  test("an edit keeps the member unless the select is cleared, and opts in to a month change", () => {
    const kept = buildContributionUpsertData(form, { editing: true });
    expect(kept.update_month).toBe(true);
    expect(kept.team_member_id).toBe("member-1");
    expect(kept.clear_team_member).toBeUndefined();

    const cleared = buildContributionUpsertData(
      { ...form, team_member_id: "", full_name: "Guest giver", payment_date: "" },
      { editing: true }
    );
    expect(cleared.team_member_id).toBeUndefined();
    expect(cleared.clear_team_member).toBe(true);
    expect(cleared.payment_date).toBeUndefined();
    expect(cleared.note).toBe("October dues");
    expect(cleared.receipt_url).toBe("https://example.com/receipt.pdf");
  });
});
