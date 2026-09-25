import type { MetadataRoute } from "next";

/**
 * O que permite "adicionar à tela inicial" e abrir o app sem a barra do
 * navegador. `display: standalone` é o que tira a barra; as cores repetem o
 * papel e a tinta de globals.css porque o manifesto é lido pelo sistema antes
 * de qualquer CSS existir, na tela de abertura.
 *
 * O ícone é `maskable` porque o Android recorta ícone de app em círculo ou em
 * gota; a figurinha foi desenhada dentro da zona segura de 80% para
 * sobreviver ao recorte.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brunanki: álbum de bandeiras",
    short_name: "Brunanki",
    description:
      "Aprenda e revise as bandeiras dos Estados reconhecidos pela ONU.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#e9edf3",
    theme_color: "#e9edf3",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
