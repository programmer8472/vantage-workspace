import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ContextGate } from "@/components/ContextGate";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <>
      <ContextGate>
        <AppShell />
      </ContextGate>
      <Toaster />
    </>
  );
}
