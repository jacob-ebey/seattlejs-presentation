import { html, renderToString } from "https://esm.sh/html-tagged@0.0.2";
import { type HTMLNode } from "https://esm.sh/html-tagged@0.0.2/lib/html.d.ts";

import { type SerializeFrom, insertScripts } from "./utils.ts";

export class DeferredData<T> {
  deferredKeys: Set<string>;
  originalData: T;
  processedData: SerializeFrom<T>;

  constructor(data: T) {
    let processedData: SerializeFrom<T>;
    const deferredKeys = new Set<string>();

    // Skip processing if no need for it
    if (!data || typeof data !== "object") {
      processedData = data as SerializeFrom<T>;
    } else {
      processedData = {} as SerializeFrom<T>;
      // Collect deferred keys to await later
      for (const [key, value] of Object.entries(data)) {
        // Store promise keys for later resolution
        if (value instanceof Promise) {
          deferredKeys.add(key);
          // Replace the promise with the TeleportedPromise identifier
          // for use in a <script> tag. `SerializeFrom` will do the same
          // for the `data` object passed to the component.
          Object.assign(processedData as { [key: string]: unknown }, {
            [key]: `__DEFERRED_PROMISES[${JSON.stringify(key)}]`,
          });
        } else {
          Object.assign(processedData as { [key: string]: unknown }, {
            [key]: value,
          });
        }
      }
    }

    this.originalData = data;
    this.processedData = processedData;
    this.deferredKeys = deferredKeys;
  }
}

export function renderToReadableStream(
  template: HTMLNode,
  deferredData: DeferredData<unknown>
) {
  // If we have deferred data, insert a <script> tag
  if (deferredData.deferredKeys.size > 0) {
    insertScripts(
      template,
      html`
        <script>
          // We use these to store our resolve and reject callbacks
          // for each of the TeleportedPromises
          const __DEFERRED = {};

          // These are the TeleportedPromise identifiers
          const __DEFERRED_PROMISES = {
            ${Array.from(deferredData.deferredKeys)
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
      controller.enqueue(encoder.encode(renderToString(template)));

      const originalData = deferredData.originalData as Record<
        string,
        Promise<unknown>
      >;
      if (originalData && typeof originalData === "object") {
        // Used to make the code below easier to read
        const html = String.raw;
        // A list of promises to wait for before closing the stream
        const waitToCloseStream: Promise<unknown>[] = [];
        for (const key of deferredData.deferredKeys) {
          // Push a promise to wait for for each deferred key
          waitToCloseStream.push(
            originalData[key]
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
      }

      controller.close();
    },
  });

  return body;
}
