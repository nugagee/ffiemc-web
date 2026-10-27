import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DailyGrowthCards from "./DailyGrowthCards";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const mockReveal = jest.fn();
jest.mock("../../lib/api", () => ({
  formatApiError: (value) => String(value || ""),
  authApi: {
    revealDailyGrowthAnswer: (...args) => mockReveal(...args),
  },
}));

test("a past riddle reveals the answer already returned for that day", () => {
  render(
    <DailyGrowthCards
      items={[
        {
          id: "past",
          category: "riddle",
          title: "Walls without hands",
          body: "Which city walls fell?",
          answer: "Jericho.",
          answer_available: true,
          published_on: "2020-01-01",
        },
      ]}
    />
  );
  expect(screen.queryByText("Jericho.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /reveal answer/i }));
  expect(screen.getByText("Jericho.")).toBeInTheDocument();
  expect(mockReveal).not.toHaveBeenCalled();
});

test("today's riddle loads the answer only after Reveal is clicked", async () => {
  mockReveal.mockResolvedValueOnce({ id: "today", answer: "Jesus." });
  render(
    <DailyGrowthCards
      items={[
        {
          id: "today",
          category: "riddle",
          title: "Sleeping in a storm",
          body: "Who slept in the boat?",
          answer: "",
          answer_available: true,
          published_on: "2026-10-28",
        },
      ]}
    />
  );
  expect(screen.queryByText("Jesus.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /reveal answer/i }));
  await waitFor(() => expect(screen.getByText("Jesus.")).toBeInTheDocument());
  expect(mockReveal).toHaveBeenCalledWith("today");
});

test("does not show an answer control when the server marks none available", () => {
  render(
    <DailyGrowthCards
      items={[
        {
          id: "fact",
          category: "fact",
          title: "Shortest verse",
          body: "Jesus wept.",
          answer: "hidden-note",
          answer_available: false,
        },
      ]}
    />
  );
  expect(screen.queryByRole("button", { name: /reveal answer/i })).not.toBeInTheDocument();
  expect(screen.queryByText("hidden-note")).not.toBeInTheDocument();
  expect(screen.getByText("Jesus wept.")).toBeInTheDocument();
});
