export function linearRegression(yValues) {
  const xValues = yValues.map((_, idx) => idx + 1);
  const n = xValues.length;
  const sumX = xValues.reduce((acc, value) => acc + value, 0);
  const sumY = yValues.reduce((acc, value) => acc + value, 0);
  const sumXY = xValues.reduce((acc, value, idx) => acc + value * yValues[idx], 0);
  const sumXX = xValues.reduce((acc, value) => acc + value * value, 0);

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { intercept, slope, lastX: xValues[xValues.length - 1] };
}

export function predictNext(model, horizon) {
  const { intercept, slope, lastX } = model;
  return Array.from({ length: horizon }).map((_, idx) => {
    const x = lastX + idx + 1;
    return Math.max(0, Math.round((intercept + slope * x) * 100) / 100);
  });
}
