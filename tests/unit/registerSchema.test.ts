import { describe, it, expect } from "vitest";
import { usernameValidation } from "../../src/schemas/registerSchema";

// Messages copied from the schema. If they change in production, these tests
// fail on purpose, which tells you the user-facing copy changed.
const MSG = {
  min: "Username must be at least 3 characters",
  max: "Username must be at most 20 characters",
  regex:
    "Username must start with a letter and contain only letters, numbers, or underscores",
  doubleUnderscore: "Username cannot contain consecutive underscores",
  reserved: "This username is unavailable",
} as const;

// Pure helpers: no shared mutable state between tests.
const parse = (input: unknown) => usernameValidation.safeParse(input);

const errorMessages = (input: unknown): string[] => {
  const result = parse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe("usernameValidation", () => {
  describe("valid input", () => {
    it.each(["abc", "john_doe", "user123", "a1_b2_c3", "john_"])(
      "accepts %j and returns it unchanged",
      (input) => {
        const result = parse(input);
        expect(result.success).toBe(true);
        if (result.success) expect(result.data).toBe(input);
      }
    );
  });

  describe("length boundaries (min 3, max 20)", () => {
    it("accepts exactly 3 characters", () => {
      expect(parse("abc").success).toBe(true);
    });

    it("rejects 2 characters with the min-length message", () => {
      expect(parse("ab").success).toBe(false);
      expect(errorMessages("ab")).toContain(MSG.min);
    });

    it("accepts exactly 20 characters", () => {
      expect(parse("a".repeat(20)).success).toBe(true);
    });

    it("rejects 21 characters with the max-length message", () => {
      expect(parse("a".repeat(21)).success).toBe(false);
      expect(errorMessages("a".repeat(21))).toContain(MSG.max);
    });

    it("rejects an empty string with the min-length message", () => {
      expect(errorMessages("")).toContain(MSG.min);
    });
  });

  describe("whitespace trimming", () => {
    it("trims leading and trailing spaces", () => {
      const result = parse("  john_doe  ");
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe("john_doe");
    });

    it("trims tabs and newlines too", () => {
      const result = parse("\tjohn\n");
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe("john");
    });

    it("rejects whitespace-only input (trims to empty, fails min)", () => {
      expect(parse("     ").success).toBe(false);
      expect(errorMessages("     ")).toContain(MSG.min);
    });

    it("measures length after trimming: '  ab  ' is too short", () => {
      // 6 raw characters, but only 2 after trim.
      expect(errorMessages("  ab  ")).toContain(MSG.min);
    });

    it("measures length after trimming: padded 20-char name is accepted", () => {
      // 24 raw characters, 20 after trim.
      const result = parse(`  ${"a".repeat(20)}  `);
      expect(result.success).toBe(true);
    });

    it("does not strip internal whitespace; it fails the character rule", () => {
      expect(parse("john doe").success).toBe(false);
      expect(errorMessages("john doe")).toContain(MSG.regex);
    });
  });

  describe("case normalization", () => {
    it("lowercases mixed-case input", () => {
      const result = parse("JohnDoe");
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe("johndoe");
    });

    it("accepts an uppercase first letter because lowercasing runs before the regex", () => {
      const result = parse("Alice");
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe("alice");
    });

    it("applies trim and lowercase together", () => {
      const result = parse("  JOHN_Doe  ");
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe("john_doe");
    });
  });

  describe("character rules", () => {
    it.each(["1john", "9abc"])(
      "rejects %j: must start with a letter (digit first)",
      (input) => {
        expect(errorMessages(input)).toContain(MSG.regex);
      }
    );

    it("rejects a leading underscore", () => {
      expect(errorMessages("_john")).toContain(MSG.regex);
    });

    it.each(["john-doe", "john.doe", "john@doe", "john!", "jöhn"])(
      "rejects %j: only a-z, 0-9 and _ are allowed",
      (input) => {
        expect(errorMessages(input)).toContain(MSG.regex);
      }
    );

    it("allows single underscores in the middle and at the end", () => {
      expect(parse("a_b_c").success).toBe(true);
      expect(parse("john_").success).toBe(true);
    });
  });

  describe("consecutive underscores", () => {
    it.each(["john__doe", "john___doe", "ab__"])(
      "rejects %j with the consecutive-underscore message",
      (input) => {
        expect(parse(input).success).toBe(false);
        expect(errorMessages(input)).toContain(MSG.doubleUnderscore);
      }
    );
  });

  describe("reserved usernames", () => {
    it.each([
      "admin",
      "support",
      "root",
      "system",
      "moderator",
      "null",
      "undefined",
      "owner",
    ])("rejects reserved name %j", (input) => {
      expect(parse(input).success).toBe(false);
      expect(errorMessages(input)).toContain(MSG.reserved);
    });

    it("rejects reserved names regardless of case and surrounding whitespace", () => {
      // Normalization happens first, so the reserved check sees "admin" / "root".
      expect(errorMessages("ADMIN")).toContain(MSG.reserved);
      expect(errorMessages("  Root  ")).toContain(MSG.reserved);
    });

    it.each(["admin1", "administrator", "my_root", "owners"])(
      "allows %j: the check is an exact match, not a substring match",
      (input) => {
        expect(parse(input).success).toBe(true);
      }
    );
  });

  describe("non-string input", () => {
    it.each([123, null, undefined, true, {}, ["abc"]])(
      "fails (without throwing) for %j",
      (input) => {
        expect(parse(input).success).toBe(false);
      }
    );
  });
});
