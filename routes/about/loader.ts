export async function loader() {
  return {
    title: "About Claudestack",
    builtAt: new Date().toISOString(),
  };
}

export type Props = Awaited<ReturnType<typeof loader>>;
