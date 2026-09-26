import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function ActivityChart({ data = [] }) {
  const formattedData = data.map((item) => ({
    time: new Date(item.time).toLocaleString("en-IN", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),

    transactions: Number(item.transactions),

    fraud: Number(item.fraud),
  }));

  return (
    <div className="mt-6 h-[320px]">

      <ResponsiveContainer
        width="100%"
        height="100%"
      >

        <AreaChart data={formattedData}>

          <defs>

            <linearGradient
              id="transactionGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >

              <stop
                offset="0%"
                stopColor="#22d3ee"
                stopOpacity={0.35}
              />

              <stop
                offset="100%"
                stopColor="#22d3ee"
                stopOpacity={0}
              />

            </linearGradient>

          </defs>

          <CartesianGrid
            stroke="#27272a"
            strokeDasharray="3 3"
          />

          <XAxis
            dataKey="time"
            stroke="#71717a"
            tick={{
              fontSize: 11,
            }}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            stroke="#71717a"
            tick={{
              fontSize: 11,
            }}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "12px",
            }}
          />

          <Area
            type="monotone"
            dataKey="transactions"
            stroke="#22d3ee"
            strokeWidth={2}
            fill="url(#transactionGradient)"
          />

        </AreaChart>

      </ResponsiveContainer>

    </div>
  );
}