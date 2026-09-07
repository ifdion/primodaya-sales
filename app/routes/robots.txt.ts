export function loader() {
  return new Response("User-agent: *\nAllow: /\nDisallow: /crm/\nDisallow: /db/\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
