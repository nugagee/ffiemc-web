import { render, screen } from "@testing-library/react";
import { NewsArticleCards } from "./NewsArticleCards";

const items = [
  {
    id: "older",
    category: "education",
    title: "Older published story",
    url: "https://www.bbc.co.uk/news/articles/older",
    excerpt: "Earlier education headline.",
    source_name: "BBC — Education",
    published_at: "2026-10-01T00:00:00.000Z",
    created_at: "2026-10-05T00:00:00.000Z",
    image_url: "",
  },
  {
    id: "stored",
    category: "education",
    title: "Stored without a publish date",
    url: "https://www.legit.ng/education/stored",
    excerpt: "Falls back to when it was saved.",
    source_name: "Legit.ng — Education",
    published_at: null,
    created_at: "2026-10-04T00:00:00.000Z",
    image_url: "",
  },
];

test("Faith shows Nigerian outlet rows and Nigeria-only international rows together", () => {
  const faithItems = [
    {
      id: "wire",
      category: "christian",
      title: "Plateau church attacked overnight",
      url: "https://www.christiantoday.com/news/plateau",
      excerpt: "Gunmen attacked a church.",
      source_name: "Christian Today",
      published_at: "2026-10-06T09:00:00.000Z",
      created_at: "2026-10-06T09:00:00.000Z",
      image_url: "",
    },
    {
      id: "desk",
      category: "nigeria",
      title: "CAN meets bishops in Abuja",
      url: "https://tribuneonlineng.com/can-meets-bishops/",
      excerpt: "Church leaders gathered.",
      source_name: "Nigerian Tribune — Religion",
      published_at: "2026-10-05T09:00:00.000Z",
      created_at: "2026-10-05T09:00:00.000Z",
      image_url: "",
    },
    ...items,
  ];
  render(<NewsArticleCards items={faithItems} filter="christian" />);
  expect(screen.getByText("Plateau church attacked overnight")).toBeInTheDocument();
  expect(screen.getByText("CAN meets bishops in Abuja")).toBeInTheDocument();
  expect(screen.queryByText("Older published story")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Faith" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Faith (Nigeria)" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Faith / Church" })).not.toBeInTheDocument();
});

test("shows the source and sorts by published_at, then created_at", () => {
  render(<NewsArticleCards items={items} filter="education" />);
  expect(screen.getByText("Source: BBC — Education")).toBeInTheDocument();
  expect(screen.getByText("Source: Legit.ng — Education")).toBeInTheDocument();
  const titles = screen.getAllByRole("link").map((node) => node.textContent);
  const storedAt = titles.indexOf("Stored without a publish date");
  const olderAt = titles.indexOf("Older published story");
  expect(storedAt).toBeGreaterThanOrEqual(0);
  expect(olderAt).toBeGreaterThan(storedAt);
});
