const colors = ["#1769FF", "#7B4DFF", "#22A447", "#F4A000", "#E5484D"];

export function PGHubConfetti({ count = 18 }: { count?: number }) {
  return (
    <div className="pgh-confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          style={{
            left: `${(index * 37) % 100}%`,
            backgroundColor: colors[index % colors.length],
            animationDelay: `${(index % 7) * 0.18}s`,
            animationDuration: `${2.8 + (index % 5) * 0.25}s`,
          }}
        />
      ))}
    </div>
  );
}
