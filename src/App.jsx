import { useEffect } from 'react';
import { Settings } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import { useAppContext } from './context/AppContext';
import EquityCalculator from './modules/EquityCalculator';
import GTOSolver from './modules/GTOSolver';
import HandHistoryAnalyzer from './modules/HandHistoryAnalyzer';
import QuizModule from './modules/QuizModule';
import RangeBuilder from './modules/RangeBuilder';

const MODULE_COMPONENTS = {
  'range-builder': RangeBuilder,
  'gto-solver': GTOSolver,
  'equity-calculator': EquityCalculator,
  'hand-history': HandHistoryAnalyzer,
  'quiz-module': QuizModule,
};

const shortcutMap = {
  r: 'range-builder',
  s: 'gto-solver',
  e: 'equity-calculator',
  h: 'hand-history',
  q: 'quiz-module',
};

const App = () => {
  const { activeModule, modules, setActiveModule, pushToast, sidebarOpen, setSidebarOpen } = useAppContext();
  const CurrentModule = MODULE_COMPONENTS[activeModule] || RangeBuilder;
  const activeLabel = modules.find((module) => module.id === activeModule)?.label || 'Range Builder';

  useEffect(() => {
    const handleKeydown = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return;
      }

      const nextModule = shortcutMap[event.key.toLowerCase()];
      if (nextModule) {
        setActiveModule(nextModule);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [setActiveModule]);

  return (
    <div className="min-h-screen bg-table text-ink">
      <Sidebar />
      {sidebarOpen ? <button type="button" aria-label="Close sidebar overlay" className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} /> : null}

      <div className="md:pl-72">
        <header className="sticky top-0 z-10 border-b border-gold/10 bg-felt/90 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-6 py-5 md:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-muted">Current Module</p>
              <h1 className="mt-2 font-display text-3xl text-gold">{activeLabel}</h1>
            </div>
            <button type="button" onClick={() => pushToast('Local settings sync to browser storage.', 'info')} className="pressable rounded-full border border-gold/20 bg-panel/90 p-3 text-gold">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8">
          <CurrentModule />
        </main>
      </div>

      <Toast />
    </div>
  );
};

export default App;