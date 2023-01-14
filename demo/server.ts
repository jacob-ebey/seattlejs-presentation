import { serve } from "https://deno.land/std@0.172.0/http/server.ts";
import { html, renderToString } from "https://esm.sh/html-tagged@0.0.2";
import { type HTMLNode } from "https://esm.sh/html-tagged@0.0.2/lib/html.d.ts";

import * as route from "./route.ts";
import { type RouteComponent, insertScripts } from "./utils.ts";

// We don't have a router in this simple demo, so we just create
// a simulated match here and type it out generically
const match = {
  Component: route.Component as RouteComponent<unknown>,
  loader: route.loader as () => unknown,
};

await serve(
  async () => {
    // Call the loader for our matched route
    const data = await match.loader();

    // Render the component for our matched route
    const template = match.Component({ data });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        // Render the initial HTML to the stream
        controller.enqueue(
          encoder.encode(
            renderToString(template, {
              elements: {},
            })
          )
        );

        controller.close();
      },
    });

    return new Response(body, {
      headers: { "Content-Type": "text/html" },
    });
  },
  {
    port: 3000,
  }
);
