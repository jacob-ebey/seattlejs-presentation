import { serve } from "https://deno.land/std@0.172.0/http/server.ts";

import { DeferredData, renderToReadableStream } from "./defer.ts";
import * as route from "./route.ts";
import { type RouteComponent } from "./utils.ts";

// We don't have a router in this simple demo, so we just create
// a simulated match here and type it out generically
const match = {
  Component: route.Component as RouteComponent<unknown>,
  loader: route.loader as (args: { request: Request }) => unknown,
};

await serve(
  async (request) => {
    // Call the loader for our matched route
    const data = await match.loader({ request });

    // Wrap the data in a DeferredData instance
    const deferredData = new DeferredData(data);

    // Render the template for our matched route
    const template = match.Component({ data: deferredData.processedData });

    // Render the template to a ReadableStream
    const body = renderToReadableStream(template, deferredData);

    return new Response(body, {
      headers: { "Content-Type": "text/html" },
    });
  },
  {
    port: 8001,
  }
);
