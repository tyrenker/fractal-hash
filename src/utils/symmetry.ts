export interface Point {
  x: number;
  y: number;
}

/**
 * Rotate a point around a center by the given angle (radians).
 */
export function rotatePoint(point: Point, angle: number, center: Point): Point {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * Reflect a point across an axis through center at the given angle (radians).
 */
export function reflectPoint(point: Point, axisAngle: number, center: Point): Point {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const cos2 = Math.cos(2 * axisAngle);
  const sin2 = Math.sin(2 * axisAngle);
  return {
    x: center.x + dx * cos2 + dy * sin2,
    y: center.y + dx * sin2 - dy * cos2,
  };
}

/**
 * Generate all N-fold rotationally symmetric copies of a point around center.
 * Returns symmetryOrder points (including the original).
 */
export function symmetricPoints(point: Point, symmetryOrder: number, center: Point): Point[] {
  const points: Point[] = [];
  const angleStep = (2 * Math.PI) / symmetryOrder;
  for (let i = 0; i < symmetryOrder; i++) {
    points.push(rotatePoint(point, i * angleStep, center));
  }
  return points;
}
