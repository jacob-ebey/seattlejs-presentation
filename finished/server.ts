import { serve } from "https://deno.land/std@0.172.0/http/server.ts";
import { html, renderToString } from "https://esm.sh/html-tagged@0.0.2";
import { type HTMLNode } from "https://esm.sh/html-tagged@0.0.2/lib/html.d.ts";

import * as route from "./route.ts";
import { type RouteComponent, insertScripts } from "./utils.ts";

// We don't have a router in this simple demo, so we just create one here
const match = {
  Component: route.Component as RouteComponent<unknown>,
  loader: route.loader as () => unknown,
};

await serve(
  async () => {
    // Call the loader for our matched route
    const data = await match.loader();

    // Collect deferred data to await later
    const deferredData: Record<string, Promise<unknown>> = {};
    // If we got an object
    if (typeof data === "object" && data) {
      // Iterate through the entries
      for (const [key, value] of Object.entries(data)) {
        // And look for promises
        if (value instanceof Promise) {
          // To store them for later resolution
          deferredData[key] = value;
          // And replace the promise with the TeleportedPromise identifier
          // for use in a <script> tag. `SerializeFrom` will do the same
          // for the `data` object passed to the component.
          Object.assign(data, {
            [key]: `__DEFERRED_PROMISES[${JSON.stringify(key)}]`,
          });
        }
      }
    }

    // Render the component for our matched route
    const template = match.Component({ data });

    // If we have deferred data, insert a <script> tag
    if (Object.keys(deferredData).length > 0) {
      insertScripts(
        template,
        html`
          <script>
            // We use these to store our resolve and reject callbacks
            // for each of the TeleportedPromises
            const __DEFERRED = {};

            // These are the TeleportedPromise identifiers
            const __DEFERRED_PROMISES = {
              ${Object.keys(deferredData)
                .map((key) => {
                  const stringKey = JSON.stringify(key);
                  // Initialize a TeleportedPromise for each deferred data
                  return `${stringKey}: initializeDeferred(${stringKey})`;
                })
                .join(",\n")},
            };

            function initializeDeferred(key) {
              let resolve, reject;
              const promise = new Promise((r, e) => {
                resolve = r;
                reject = e;
              });
              __DEFERRED[key] = {
                promise,
                resolve: (value) => {
                  resolve(value);
                },
                reject: (error) => {
                  reject(error);
                },
              };
              return promise;
            }

            function resolveDeferred(key, error, value) {
              if (error) {
                __DEFERRED[key].reject(error);
                return;
              }
              __DEFERRED[key].resolve(value);
            }
          </script>
        ` as HTMLNode
      );
    }

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        // Render the initial HTML to the stream
        controller.enqueue(
          encoder.encode(
            renderToString(template, {
              elements: {},
            })
          )
        );

        // Used to make the code below easier to read
        const html = String.raw;
        // A list of promises to wait for before closing the stream
        const waitToCloseStream: Promise<unknown>[] = [];

        for (const [key, promise] of Object.entries(deferredData)) {
          // Push a promise to wait for for each deferred key
          waitToCloseStream.push(
            promise
              .then((value) => {
                // When the promise resolves, send a <script> tag to the client
                // to resolve the TeleportedPromise
                controller.enqueue(
                  encoder.encode(
                    html`<script>
                      resolveDeferred(
                        ${JSON.stringify(key)},
                        null,
                        ${JSON.stringify(value)}
                      );
                    </script>`
                  )
                );
              })
              .catch((error) => {
                // If the promise rejects, send a <script> tag to the client
                // to reject the TeleportedPromise
                controller.enqueue(
                  encoder.encode(
                    html`<script>
                      resolveDeferred(
                        ${JSON.stringify(key)},
                        new Error(${JSON.stringify(error.message)})
                      );
                    </script>`
                  )
                );
              })
          );
        }

        await Promise.all(waitToCloseStream);

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
