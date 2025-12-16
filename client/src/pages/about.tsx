export default function About() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-12">
      <div className="max-w-[500px] w-full space-y-8 text-white">
        <h1 className="text-3xl font-bold text-primary mb-8">About Kaizen</h1>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary">
            What is Kaizen?
          </h2>
          <p className="text-sm opacity-80 leading-relaxed">
            An anime streaming site. Watch shows, track episodes, discover new
            series. Simple as that.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary">
            How does it work?
          </h2>
          <p className="text-sm opacity-80 leading-relaxed">
            We index streaming sources from various providers, cache anime
            metadata from AniList, and serve it all in one clean interface.
            Think of it as your anime hub.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary">Tech Stack</h2>
          <div className="text-sm opacity-80 leading-relaxed">
            <p>React, Node.js, TypeScript, MongoDB, Redis.</p>
            <p className="mt-1">Node.js worker handles scraping.</p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary">Hosting?</h2>
          <p className="text-sm opacity-80 leading-relaxed">
            Not hosted yet. Still in development.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary">Disclaimer</h2>
          <p className="text-sm opacity-80 leading-relaxed">
            Kaizen is an indexer. We don't host content—we just point you to it.
            All streaming sources are third-party. Links provided for
            convenience only.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary">Free Forever</h2>
          <p className="text-sm opacity-80 leading-relaxed">
            No ads, no donations, no BS. Just anime.
          </p>
        </section>

        <div className="pt-4 border-t border-secondary opacity-60 text-xs text-center">
          <p>© 2025 Kaizen</p>
        </div>
      </div>
    </div>
  );
}
