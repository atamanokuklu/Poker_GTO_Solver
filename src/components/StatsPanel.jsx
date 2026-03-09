import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const StatsPanel = ({ userStats, levelInfo }) => {
  const accuracyData = Object.entries(userStats.accuracyByCategory).map(([key, value]) => ({
    category: key,
    accuracy: value.total ? Number(((value.correct / value.total) * 100).toFixed(1)) : 0,
  }));

  const weakestSpots = Object.entries(userStats.weakestSpots)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);

  const today = new Date();
  const calendarCells = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (27 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      count: userStats.practiceCalendar[key] || 0,
    };
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
      <div className="glass-panel rounded-3xl p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-2xl text-gold">Quiz Stats Dashboard</h3>
            <p className="mt-1 text-xs text-muted">Accuracy split by study lane and recent leak profile.</p>
          </div>
          <div className="animate-chipRise rounded-2xl border border-gold/25 bg-gold/10 px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Level</p>
            <p className="text-lg text-gold">{levelInfo.label}</p>
            <p className="text-xs text-muted">{userStats.xp} XP</p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={accuracyData}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="category" tick={{ fill: '#89a28f', fontSize: 11 }} />
              <YAxis tick={{ fill: '#89a28f', fontSize: 11 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#111a14', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '18px' }} />
              <Bar dataKey="accuracy" fill="#c9a84c" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass-panel rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Practice Volume</p>
          <p className="mt-2 font-display text-4xl text-gold">{userStats.totalHandsReviewed}</p>
          <p className="text-sm text-muted">Total hands reviewed across all quiz sessions.</p>
        </div>

        <div className="glass-panel rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Weakest Spots</p>
          <div className="mt-3 space-y-2 text-sm text-ink">
            {weakestSpots.length ? weakestSpots.map(([spot, misses]) => <p key={spot}>{spot} missed {misses}x</p>) : <p className="text-muted">No weak spots recorded yet.</p>}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Streak Calendar</p>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {calendarCells.map((cell) => (
              <div
                key={cell.key}
                title={`${cell.key}: ${cell.count} reps`}
                className={`aspect-square rounded-md border ${
                  cell.count === 0
                    ? 'border-white/5 bg-surface'
                    : cell.count < 3
                      ? 'border-gold/15 bg-gold/20'
                      : cell.count < 6
                        ? 'border-success/25 bg-success/30'
                        : 'border-success/40 bg-success/60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;