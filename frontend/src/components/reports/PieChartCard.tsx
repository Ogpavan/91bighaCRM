import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type PieDatum = {
  name: string;
  value: number;
};

type PieChartCardProps = {
  data: PieDatum[];
  colors: string[];
};

export default function PieChartCard({ data, colors }: PieChartCardProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
            {data.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
