import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Scatter } from "recharts";
import { ChartCard } from "./ChartCard.js";

export const SpendTrends = ({ darkMode, data, loading = false, loadingHeight = 175 }) => {
  // Transform data for chart
  const periods = [...new Set(data.map(d => d.period))].sort();
  const periodIndex = periods.reduce((acc, p, i) => { acc[p] = i; return acc; }, {});

  const barData = periods.map(period => {
    const periodData = data.filter(d => d.period === period);
    const totalSpend = periodData.reduce((sum, d) => sum + d.totalSpend, 0);
    return { x: periodIndex[period], period, totalSpend };
  });

  const currencies = [...new Set(data.map(d => d.currency))];

  // Colors for currencies
  const currencyColors = {
    'PHP': '#3b82f6',
    'CAD': '#10b981',
    'USD': '#f59e0b',
    'EUR': '#ef4444',
    'GBP': '#8b5cf6'
  };

  return (
    <ChartCard title="Spend Trends (Last 6 Months)" delay={0.9} darkMode={darkMode} loading={loading} loadingHeight={loadingHeight}>
      <ResponsiveContainer width="100%" height={175}>
        <ComposedChart
          data={barData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          animationDuration={1000}
          animationEasing="ease-in-out"
        >
          <defs>
            <linearGradient id="spendBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={darkMode ? "#10b981" : "#059669"} stopOpacity={0.8} />
              <stop offset="95%" stopColor={darkMode ? "#059669" : "#10b981"} stopOpacity={0.3} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="2 4"
            stroke={darkMode ? '#4b5563' : '#e5e7eb'}
            opacity={darkMode ? 0.3 : 0.5}
            horizontal={true}
            vertical={false}
          />

          <XAxis
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 11,
              fill: darkMode ? '#d1d5db' : '#374151',
              fontWeight: 500
            }}
            tickFormatter={(value) => {
              const period = periods[value];
              if (!period) return '';
              const [year, month] = period.split('-');
              return `${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short' })}`;
            }}
            dy={10}
          />

          <YAxis
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 11,
              fill: darkMode ? '#d1d5db' : '#374151',
              fontWeight: 500
            }}
            label={{
              value: 'Amount ($)',
              angle: -90,
              position: 'insideLeft',
              style: {
                textAnchor: 'middle',
                fill: darkMode ? '#d1d5db' : '#374151',
                fontSize: 12,
                fontWeight: 600
              }
            }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />

          <Tooltip
            cursor={{
              stroke: darkMode ? '#6b7280' : '#9ca3af',
              strokeWidth: 1,
              strokeDasharray: '4 4'
            }}
            contentStyle={{
              backgroundColor: darkMode ? '#111827' : 'white',
              border: `2px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
              borderRadius: '0.75rem',
              boxShadow: darkMode
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
                : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: '12px 16px',
              color: '#ffffff'
            }}
            labelStyle={{
              color: '#ffffff',
              fontWeight: 600,
              marginBottom: '8px'
            }}
            itemStyle={{
              color: '#ffffff'
            }}
            formatter={(value, name, props) => {
              const formatValue = (v, n, p) => {
                if (n === 'totalSpend') return `$${v.toLocaleString()}`;
                if (n === 'budgetUtilization') return `${v}%`;
                if (n === 'budgetAmount') return `$${v.toLocaleString()}`;
                if (n.includes('Spend')) return `$${v.toLocaleString()}`;
                return v;
              };

              return [formatValue(value, name, props), name];
            }}
            labelFormatter={(value) => {
              const period = periods[Math.round(value)];
              if (!period) return '';
              const [year, month] = period.split('-');
              return (
                <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {new Date(year, month - 1).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              );
            }}
          />

          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '12px',
              color: darkMode ? '#ffffff' : '#374151'
            }}
            iconType="rect"
            iconSize={12}
          />

          <Bar
            yAxisId="left"
            dataKey="totalSpend"
            fill="url(#spendBarGradient)"
            name="Total Spend"
            radius={[4, 4, 0, 0]}
            barSize={32}
          />

          {currencies.map(currency => {
            const currencyData = data.filter(d => d.currency === currency).map(d => ({
              x: periodIndex[d.period],
              y: d.totalSpend,
              currency: d.currency,
              period: d.period
            }));
            return (
              <Scatter
                key={currency}
                yAxisId="left"
                data={currencyData}
                shape="circle"
                name={`${currency} Spend`}
                fill={currencyColors[currency] || '#6b7280'}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};