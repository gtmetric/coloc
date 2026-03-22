export async function loader() {
  return {
    title: "About Coloc",
    builtAt: new Date().toISOString(),
  };
}

export type Props = Awaited<ReturnType<typeof loader>>;
