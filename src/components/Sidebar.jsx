import {
  BrainCircuit,
  GraduationCap,
  LayoutGrid,
  Menu,
  ScrollText,
  Sigma,
  X,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const icons = {
  'range-builder': LayoutGrid,
  'gto-solver': BrainCircuit,
  'equity-calculator': Sigma,
  'hand-history': ScrollText,
  'quiz-module': GraduationCap,
};

const Sidebar = () => {
  const { modules, activeModule, setActiveModule, sidebarOpen, setSidebarOpen } = useAppContext();

  return (
    <>
      <button
        type="button"
        className="pressable fixed left-4 top-4 z-40 flex items-center gap-2 rounded-full border border-gold/20 bg-panel/90 px-3 py-2 text-ink md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu className="h-4 w-4" /> Menu
      </button>

      <aside
        className={`glass-panel fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-gold/10 px-5 pb-6 pt-6 transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-3xl text-gold">GTO Solver Pro</p>
            <p className="mt-2 text-xs uppercase tracking-[0.32em] text-muted">Felt table intelligence</p>
          </div>

          <button type="button" className="rounded-full border border-gold/20 p-2 text-muted md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-2">
          {modules.map((module) => {
            const Icon = icons[module.id] || LayoutGrid;
            const selected = activeModule === module.id;
            return (
              <button
                key={module.id}
                type="button"
                onClick={() => {
                  setActiveModule(module.id);
                  setSidebarOpen(false);
                }}
                className={`pressable flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  selected
                    ? 'border-gold/40 bg-gold/10 text-ink shadow-glow'
                    : 'border-white/5 bg-surface/70 text-muted hover:border-gold/20 hover:text-ink'
                }`}
              >
                <Icon className={`h-4 w-4 ${selected ? 'text-gold' : 'text-muted'}`} />
                <span className="text-sm">{module.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-gold/15 bg-gold/5 p-4 text-xs text-muted">
          <p className="text-gold">Keyboard lanes</p>
          <p className="mt-2 leading-6">R = Range Builder, S = Solver, E = Equity, H = History, Q = Quiz</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;