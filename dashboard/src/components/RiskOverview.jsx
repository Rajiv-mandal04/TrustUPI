import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = [
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
];

export default function RiskOverview({ analytics }) {
  const data = [
    {
      name: "Low",
      value: analytics?.low_risk || 0,
    },
    {
      name: "Medium",
      value: analytics?.medium_risk || 0,
    },
    {
      name: "High",
      value: analytics?.high_risk || 0,
    },
    {
      name: "Critical",
      value: analytics?.critical_risk || 0,
    },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">

      <div className="flex items-center justify-between">

        <div>
          <h3 className="font-semibold text-white">
            Risk Overview
          </h3>

          <p className="mt-1 text-xs text-zinc-500">
            Transaction distribution by risk level
          </p>
        </div>

        <PieChart className="h-5 w-5 text-zinc-500" />

      </div>

      <div className="mt-5 h-64">

        <ResponsiveContainer width="100%" height="100%">

          <PieChart>

            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[index]}
                />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "12px",
                color: "#fff",
              }}
            />

          </PieChart>

        </ResponsiveContainer>

      </div>

      <div className="grid grid-cols-2 gap-3">

        {data.map((item, index) => (

          <div
            key={item.name}
            className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2"
          >

            <div className="flex items-center gap-2">

              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: COLORS[index],
                }}
              />

              <span className="text-xs text-zinc-400">
                {item.name}
              </span>

            </div>

            <span className="text-xs font-semibold text-white">
              {item.value.toLocaleString()}
            </span>

          </div>

        ))}

      </div>

    </div>
  );
}