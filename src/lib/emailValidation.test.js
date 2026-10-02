import { validateEmail } from "./emailValidation";

describe("validateEmail", () => {
  test("accepts a normal address", () => {
    expect(validateEmail("OmOlara@gmail.com", { required: true })).toEqual({
      ok: true,
      message: "",
      email: "omolara@gmail.com",
    });
  });

  test("accepts plus addressing and a real multi-part domain", () => {
    expect(validateEmail("choir.lead+news@gmail.co.uk").ok).toBe(true);
  });

  test("allows an empty optional email", () => {
    expect(validateEmail("  ", { required: false }).ok).toBe(true);
  });

  test("requires an email when asked", () => {
    expect(validateEmail("", { required: true }).message).toMatch(/required/i);
  });

  test.each([
    ["adetunjiayodejj725@gmal.com", "gmail.com"],
    ["oladipupodavid997@gmil.com", "gmail.com"],
    ["someone@gmial.com", "gmail.com"],
    ["michealogunwale352@gmail.con", "gmail.com"],
    ["daughterofgracejomiloju@gmail.co", "gmail.com"],
    ["olanrewajuracheal07@gmail.co.com", "gmail.com"],
    ["marvellousrichard@10gmail.com", "gmail.com"],
  ])("suggests a correction for %s", (input, domain) => {
    const result = validateEmail(input, { required: true });
    expect(result.ok).toBe(false);
    expect(result.message).toBe(`Did you mean @${domain}?`);
    expect(result.suggestion).toBe(`${input.split("@")[0].toLowerCase()}@${domain}`);
  });

  test("rejects a dot immediately before @", () => {
    const result = validateEmail("adelowotancovenant.@gmail.com");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/dot/i);
  });

  test("rejects whitespace", () => {
    expect(validateEmail("ada lovelace@gmail.com").ok).toBe(false);
  });

  test.each([
    "ade@gmail.com",
    "gdrf@gmail.com",
    "thtr@gmail.com",
    "gcr@gmail.com",
    "test@gmail.com",
    "none@yahoo.com",
    "person@example.com",
    "asdewq@gmail.com",
  ])("rejects placeholder %s", (input) => {
    const result = validateEmail(input, { required: true });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/placeholder/i);
  });
});
