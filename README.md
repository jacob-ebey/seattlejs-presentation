---
marp: true
theme: default
---

<style>
  code {
    color: rgb(36, 41, 47);
  }
</style>

# "Promises" over the wire

Hi, I'm Jacob 👋 I work for Shopify on Remix and React Router

---

# Quick Recap

- Remix is a "middle-stack" JavaScript framework
  - A bundler
  - A request handler for your server runtime of choice
  - Lib(s?) that communicate with the server and integrate with the router to build rich client side experiences
- Started closed source with a great community of backers buying licenses
- I committed to come on-board to prepare for the v1 launch June 2021
- v1 open sourced end of November 2021
- October of 2022 announced Shopify acquisition
- Been continuing the work since

---

# `defer()` and `<Await>`

A pair of utilities that allow you to "teleport" a promise over the wire and enables React `<Suspense>` usage both with and without client side hydration.

---

## If you have a slow data source that would block first pain, what do you do?

---

<style scoped>
  img {
    margin-top: 30%
  }
</style>

![Graph showing waterfall of client side data fetching](./images/client-fetching.svg)

---

![Graphs showing how document and slow data requests sent over the same response significantly speed up the largest contentful paint](./images/waterfall.svg)

---

```tsx
export function loader() {
  return json({
    message: "I'm critical data and required to render the page!",
    slowNonImportantMessage: await iReturnAPromiseThatResolvesAString(),
  });
}

export default function Route() {
  const data = useLoaderData<typeof loader>();
  return (
    <main>
      <h1>{data.message}</h1>
      <p>{data.slowNonImportantMessage}</p>
    </main>
  );
}
```

---

```tsx
export function loader() {
  return defer({
    message: "I'm critical data and required to render the page!",
    slowNonImportantMessagePromise: iReturnAPromiseThatResolvesAString(),
  });
}

export default function Route() {
  const data = useLoaderData<typeof loader>();
  return (
    <main>
      <h1>{data.message}</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <Await resolve={data.slowNonImportantMessagePromise}>
          {(slowMessage) => <p>{slowMessage}</p>}
        </Await>
      </Suspense>
    </main>
  );
}
```

---

## Handle the error inline

```tsx
export default function Route() {
  const data = useLoaderData<typeof loader>();
  return (
    <main>
      <h1>{data.message}</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <Await
          resolve={data.slowNonImportantMessagePromise}
          errorElement={<p>Something went wrong...</p>}
        >
          {(slowMessage) => <p>{slowMessage}</p>}
        </Await>
      </Suspense>
    </main>
  );
}
```

---

# The magic dust that makes this all work

- Ability to render a placeholder for the UI and wait for a promise (React's `<Suspense>`)
- Ability to teleport a promise across the network (Remix's `defer()`)

---

# Demo time!
