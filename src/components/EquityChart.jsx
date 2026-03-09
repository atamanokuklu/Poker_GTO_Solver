import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const EquityChart = ({ data = [] }) => (
  <div className="glass-panel rounded-3xl p-4">
    <div className="mb-4">
      <h3 className="font-display text-2xl text-gold">Equity Distribution</h3>
      <p className="mt-1 text-xs text-muted">Stacked breakdown by final hand category.</p>
    </div>

    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="category" tick={{ fill: '#89a28f', fontSize: 11 }} interval={0} angle={-25} height={72} textAnchor="end" />
          <YAxis tick={{ fill: '#89a28f', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#111a14', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '18px' }}
            labelStyle={{ color: '#c9a84c' }}
          />
          <Legend wrapperStyle={{ color: '#e8e8e8' }} />
          <Bar dataKey="hero" stackId="a" fill="#2ecc71" radius={[6, 6, 0, 0]} />
          <Bar dataKey="villain" stackId="a" fill="#c9a84c" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default EquityChart;