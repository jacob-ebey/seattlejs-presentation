import { Suspense } from "react";
import { defer, type LoaderArgs } from "@remix-run/node";
import { Await, Link, useLoaderData } from "@remix-run/react";

export function loader({ request }: LoaderArgs) {
  return defer({
    criticalData:
      "I'm critical data that blocked the initial render of the page.",

    slowData: new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        const url = new URL(request.url);
        if (url.searchParams.has("error")) {
          reject(new Error("I'm an error!"));
        } else {
          resolve(
            "I'm slow data that did NOT block the initial render of the page."
          );
        }
      }, 1000);
    }),
  });
}

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <main>
      <header>
        <h1>YO!</h1>
        <p>{data.criticalData}</p>
        <p>
          <Link to="/about">Another Page</Link>
        </p>
      </header>
      <section>
        <h2>Below is slow data</h2>
        <Suspense fallback={<p>Loading...</p>}>
          <Await resolve={data.slowData}>{(data) => <p>{data}</p>}</Await>
        </Suspense>
      </section>
    </main>
  );
}
