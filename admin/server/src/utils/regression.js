export function linearRegression(y) {
  const x = y.map((_, i) => i + 1);
  const n = x.length;
  const sumX = x.reduce((a,b)=>a+b,0);
  const sumY = y.reduce((a,b)=>a+b,0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

  const denom = (n * sumXX - sumX * sumX);
  const b = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  return { a, b, lastX: x[x.length - 1] };
}

export function predictNext({ a, b, lastX }, h) {
  return Array.from({ length: h }).map((_, i) => {
    const xi = lastX + i + 1;
    return Math.max(0, Math.round((a + b * xi) * 100) / 100);
  });
}
