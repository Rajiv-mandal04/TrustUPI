export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass = "text-cyan-400",
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-zinc-700 hover:bg-zinc-900">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm text-zinc-500">
            {title}
          </p>

          <h3 className="mt-2 text-3xl font-bold tracking-tight text-white">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-zinc-800/80 p-3">
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </div>

      </div>

      <p className="mt-4 text-xs text-zinc-500">
        {description}
      </p>

    </div>
  );
}