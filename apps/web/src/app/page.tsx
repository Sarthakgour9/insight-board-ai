import { DependencyBoard } from '../components/dependency-board';
import { ThemeToggle } from '../components/theme-toggle';

export default function HomePage() {
  return (
    <>
      <ThemeToggle />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <header className="mb-10 card-animate">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-cyan-400"></div>
              <div className="absolute inset-0 h-2 w-2 rounded-full bg-cyan-400 animate-ping opacity-75"></div>
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              InsightBoard
            </span>
          </div>
          
          <h1 className="text-4xl font-bold text-gradient md:text-5xl lg:text-6xl">
            Dependency Engine
          </h1>
          
          <p className="mt-5 max-w-2xl text-base text-slate-500 leading-relaxed">
            Transform meeting transcripts into validated dependency graphs with intelligent cycle detection, 
            idempotent processing, and interactive task management.
          </p>

          <div className="mt-6 flex flex-wrap gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-px w-6 bg-gradient-to-r from-transparent to-emerald-500"></div>
              <span className="text-xs font-medium text-slate-500">Real-time Processing</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-px w-6 bg-gradient-to-r from-transparent to-violet-500"></div>
              <span className="text-xs font-medium text-slate-500">Cycle Detection</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-px w-6 bg-gradient-to-r from-transparent to-amber-500"></div>
              <span className="text-xs font-medium text-slate-500">Interactive Graph</span>
            </div>
          </div>
        </header>

        <DependencyBoard />
      </main>
    </>
  );
}

