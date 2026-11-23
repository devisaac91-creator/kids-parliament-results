import { createFileRoute } from "@tanstack/react-router";
import { handleApiRequest } from "../../../api/bridge";

const handle = ({ request }: { request: Request }) => handleApiRequest(request);

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      OPTIONS: handle,
    },
  },
});
