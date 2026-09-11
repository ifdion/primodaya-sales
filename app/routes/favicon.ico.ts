const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#047857"/><text x="16" y="23" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#ffffff" text-anchor="middle">P</text></svg>`;

export function loader() {
  return new Response(SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
