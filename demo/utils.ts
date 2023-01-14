import { type HTMLNode } from "https://esm.sh/html-tagged@0.0.2/lib/html.d.ts";

// There's probably a better way to do this, but this forces editors
// to show `TeleportedPromise` in the type hints instead of `string`.
type TeleportedPromise = string & Record<string | number | symbol, never>;

type SerializeFrom<T> = T extends (args: unknown) => infer R
  ? Awaited<R> extends { [key: string]: unknown }
    ? {
        [k in keyof Awaited<R>]: Awaited<R>[k] extends Promise<unknown>
          ? TeleportedPromise
          : Awaited<R>[k];
      }
    : R
  : T;

export type RouteProps<LoaderFunctionOrData = unknown> = {
  data: SerializeFrom<LoaderFunctionOrData>;
};

export type RouteComponent<LoaderFunctionOrData> = (
  props: RouteProps<LoaderFunctionOrData>
) => HTMLNode;

export function insertScripts(template: HTMLNode, scripts: HTMLNode) {
  const bodyIndex = template.__chunks.findIndex((chunk) => {
    return typeof chunk === "object" && chunk.tagName === "body";
  });

  if (bodyIndex === -1) {
    throw new Error("Could not find <body> tag in template.");
  }

  template.__chunks.splice(bodyIndex, 0, ...scripts.__chunks);
}
