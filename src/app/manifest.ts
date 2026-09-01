import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Alessandro & Anna — Wedding Gallery",
    short_name: "A&A Photos",
    description: "Condividi le foto del matrimonio di Alessandro e Anna.",
    start_url: "/e/alessandro-anna",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#f43f5e",
    orientation: "portrait",
  };
}
