export default function HomePage() {
  return (
    <div class="max-w-2xl mx-auto p-8">
      <h1 class="text-4xl font-bold mb-4">Claudeopt Framework</h1>
      <p class="text-lg text-gray-600 mb-6">An AI-optimal full-stack framework built with Bun.</p>
      <nav class="flex gap-4">
        <a href="/about" class="text-blue-600 hover:underline">About</a>
        <a href="/users" class="text-blue-600 hover:underline">Users</a>
        <a href="/counter" class="text-blue-600 hover:underline">Counter</a>
      </nav>
    </div>
  );
}
