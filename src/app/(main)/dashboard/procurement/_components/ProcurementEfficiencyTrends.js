import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Line } from "recharts";
import { ChartCard } from "./ChartCard.js";

export const ProcurementEfficiencyTrends = ({ darkMode, data, loading = false, loadingHeight = 175 }) => {
  return (
    <ChartCard title="Procurement Efficiency Trends (Last 6 Months)" delay={0.9} darkMode={darkMode} loading={loading} loadingHeight={loadingHeight}>
      <ResponsiveContainer width="100%" height={175}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          animationDuration={1000}
          animationEasing="ease-in-out"
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={darkMode ? "#60a5fa" : "#3b82f6"} stopOpacity={0.8} />
              <stop offset="95%" stopColor={darkMode ? "#3b82f6" : "#60a5fa"} stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="processingGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={darkMode ? "#f87171" : "#ef4444"} />
              <stop offset="50%" stopColor={darkMode ? "#fb923c" : "#f97316"} />
              <stop offset="100%" stopColor={darkMode ? "#f87171" : "#ef4444"} />
            </linearGradient>
            <linearGradient id="onTimeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={darkMode ? "#34d399" : "#10b981"} />
              <stop offset="50%" stopColor={darkMode ? "#10b981" : "#059669"} />
              <stop offset="100%" stopColor={darkMode ? "#34d399" : "#10b981"} />
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
            dataKey="period"
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 11,
              fill: darkMode ? '#d1d5db' : '#374151',
              fontWeight: 500
            }}
            tickFormatter={(value) => {
              const [year, month] = value.split('-');
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
              value: 'Requests',
              angle: -90,
              position: 'insideLeft',
              style: {
                textAnchor: 'middle',
                fill: darkMode ? '#d1d5db' : '#374151',
                fontSize: 12,
                fontWeight: 600
              }
            }}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: 11,
              fill: darkMode ? '#d1d5db' : '#374151',
              fontWeight: 500
            }}
            label={{
              value: 'Days / Rate (%)',
              angle: 90,
              position: 'insideRight',
              style: {
                textAnchor: 'middle',
                fill: darkMode ? '#d1d5db' : '#374151',
                fontSize: 12,
                fontWeight: 600
              }
            }}
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
              color: '#ffffff' // ✅ important
            }}
            labelStyle={{
              color: '#ffffff', // ✅ force white
              fontWeight: 600,
              marginBottom: '8px'
            }}
            itemStyle={{
              color: '#ffffff' // ✅ this fixes series labels + values
            }}
            formatter={(value, name) => {
              const formatValue = (v, n) => {
                switch (n) {
                  case 'avgProcessingDays':
                    return `${v.toFixed(1)} days`;
                  case 'onTimeDeliveryRate':
                    return `${v}%`;
                  default:
                    return v;
                }
              };

              return [formatValue(value, name), name];
            }}
            labelFormatter={(value) => {
              const [year, month] = value.split('-');
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
            dataKey="totalRequests"
            fill="url(#barGradient)"
            name="Total Requests"
            radius={[4, 4, 0, 0]}
            barSize={32}
          />

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgProcessingDays"
            stroke="url(#processingGradient)"
            strokeWidth={3}
            name="Avg Processing Days"
            dot={{
              fill: darkMode ? '#dc2626' : '#ef4444',
              strokeWidth: 2,
              r: 5,
              stroke: '#ffffff',
              strokeWidth: 2
            }}
            activeDot={{
              r: 7,
              stroke: darkMode ? '#dc2626' : '#ef4444',
              strokeWidth: 2,
              fill: darkMode ? '#1f2937' : '#ffffff'
            }}
          />

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="onTimeDeliveryRate"
            stroke="url(#onTimeGradient)"
            strokeWidth={3}
            name="On-Time Rate (%)"
            dot={{
              fill: darkMode ? '#059669' : '#10b981',
              strokeWidth: 2,
              r: 5,
              stroke: '#ffffff',
              strokeWidth: 2
            }}
            activeDot={{
              r: 7,
              stroke: darkMode ? '#059669' : '#10b981',
              strokeWidth: 2,
              fill: darkMode ? '#1f2937' : '#ffffff'
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};