import { validateContributionPayment } from "./mediaContributions";

const today = "2026-10-31";

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

  test("accepts a complete payment", () => {
    expect(validateContributionPayment(valid, { today })).toEqual([]);
  });

  test("requires a positive amount, a real date, and a name", () => {
    expect(validateContributionPayment({ ...valid, amount: "0" }, { today })).toContain(
      "Enter an amount greater than 0"
    );
    expect(validateContributionPayment({ ...valid, amount: "nope" }, { today })).toContain(
      "Enter an amount greater than 0"
    );
    expect(validateContributionPayment({ ...valid, payment_date: "2026-02-31" }, { today })).toContain(
      "Enter a valid payment date"
    );
    expect(validateContributionPayment({ ...valid, payment_date: "2026-11-02" }, { today })).toContain(
      "Payment date cannot be in the future"
    );
    expect(
      validateContributionPayment(
        { ...valid, team_member_id: "", full_name: "A" },
        { today }
      )
    ).toContain("Select a team member or enter a name");
  });

  test("rejects a receipt that is not a link and a very long note", () => {
    expect(validateContributionPayment({ ...valid, receipt_url: "javascript:alert(1)" }, { today })).toContain(
      "Receipt link must start with http"
    );
    expect(validateContributionPayment({ ...valid, note: "x".repeat(1001) }, { today })).toContain(
      "Note must be 1000 characters or less"
    );
    expect(validateContributionPayment({ ...valid, month_id: "  " }, { today })).toContain("Month is required");
  });
});
