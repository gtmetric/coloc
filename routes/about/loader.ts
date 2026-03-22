export async function loader() {
  return {
    title: "About Claudeopt",
    builtAt: new Date().toISOString(),
  };
}

export type Props = Awaited<ReturnType<typeof loader>>;
