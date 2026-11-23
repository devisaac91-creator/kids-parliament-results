import { createFileRoute } from "@tanstack/react-router";
import { SignInPage } from "@/components/screens/public";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign In | Kids Parliament Results" },
      { name: "description", content: "Staff sign in for Kids Parliament Educational Centre" },
    ],
  }),
  component: SignInRoute,
});

function SignInRoute() {
  return <SignInPage />;
}
