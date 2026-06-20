import { describe, expect, it } from "vitest";
import { toQueryString } from "@/lib/query";

describe("toQueryString", () => {
  it("serializes meaningful values", () => {
    expect(
      toQueryString({
        q: "shirt",
        page: 2,
        lowStock: false,
        empty: "",
        missing: undefined,
      }),
    ).toBe("?q=shirt&page=2&lowStock=false");
  });
});
