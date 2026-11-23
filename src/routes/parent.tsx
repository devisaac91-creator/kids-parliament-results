import { createFileRoute } from "@tanstack/react-router";
import { ParentPage } from "@/components/screens/public";

export const Route = createFileRoute("/parent")({
  head: () => ({
    meta: [
      { title: "Parent Portal | Kids Parliament Results" },
      { name: "description", content: "Check student examination results" },
    ],
  }),
  component: ParentRoute,
});

function ParentRoute() {
  return <ParentPage />;
}
