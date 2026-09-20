import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import NissanExperience from "@/components/nissan/NissanExperience";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Nissan GT-R R35 | Cinematic Vehicle Experience" },
      { name: "description", content: "Explore the Nissan GT-R R35 through an interactive 3D cinematic garage experience." },
      { property: "og:title", content: "Nissan GT-R R35 | Cinematic Vehicle Experience" },
      { property: "og:description", content: "A scroll-driven 3D inspection of the Nissan GT-R R35 inside a cinematic automotive studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <NissanExperience />
    </ClientOnly>
  );
}
