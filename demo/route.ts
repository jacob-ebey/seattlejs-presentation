import { html, value } from "https://esm.sh/html-tagged@0.0.2";

import { type RouteProps } from "./utils.ts";

export async function loader({ request }: { request: Request }) {
  return {
    criticalData:
      "I'm critical data that blocked the initial render of the page.",

    slowData: await new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        const url = new URL(request.url);

        if (url.searchParams.has("error")) {
          reject(new Error("I'm an error!"));
        } else {
          resolve(
            "I'm slow data that DID block the initial render of the page."
          );
        }
      }, 1000);
    }),
  };
}

export function Component({ data }: RouteProps<typeof loader>) {
  return html`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        ${styles}
      </head>
      <body>
        <main>
          <header>
            <h1>YO!</h1>
            <p id="critical">${value(data.criticalData)}</p>
          </header>
          <section>
            <h2>Below is slow data</h2>
            <p id="slow">${value(data.slowData)}</p>
          </section>
        </main>
      </body>
    </html> `;
}

// https://simplecss.org/
const styles = html`<style>
  :root {
    --sans-font: -apple-system, BlinkMacSystemFont, "Avenir Next", Avenir,
      "Nimbus Sans L", Roboto, "Noto Sans", "Segoe UI", Arial, Helvetica,
      "Helvetica Neue", sans-serif;
    --mono-font: Consolas, Menlo, Monaco, "Andale Mono", "Ubuntu Mono",
      monospace;
    --bg: #fff;
    --accent-bg: #f5f7ff;
    --text: #212121;
    --text-light: #585858;
    --border: #898ea4;
    --accent: #0d47a1;
    --code: #d81b60;
    --preformatted: #444;
    --marked: #ffdd33;
    --disabled: #efefef;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --bg: #212121;
      --accent-bg: #2b2b2b;
      --text: #dcdcdc;
      --text-light: #ababab;
      --accent: #ffb300;
      --code: #f06292;
      --preformatted: #ccc;
      --disabled: #111;
    }
    img,
    video {
      opacity: 0.8;
    }
  }
  *,
  ::after,
  ::before {
    box-sizing: border-box;
  }
  html {
    font-family: var(--sans-font);
    scroll-behavior: smooth;
  }
  body {
    color: var(--text);
    background-color: var(--bg);
    font-size: 1.15rem;
    line-height: 1.5;
    display: grid;
    grid-template-columns: 1fr min(45rem, 90%) 1fr;
    margin: 0;
  }
  body > * {
    grid-column: 2;
  }
  main {
    padding-top: 1.5rem;
  }
  h1 {
    font-size: 3rem;
  }
  h2 {
    font-size: 2.6rem;
    margin-top: 3rem;
  }
</style>`;
