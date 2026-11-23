import { createFileRoute } from "@tanstack/react-router";
import { SignUpPage } from "@/components/screens/public";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Teacher Registration | Kids Parliament Results" },
      { name: "description", content: "Teacher account creation" },
    ],
  }),
  component: SignUpRoute,
});

function SignUpRoute() {
  return <SignUpPage />;
}
