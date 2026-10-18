/** Center-to-center Euclidean distance; scene grid units and elevations are meters. */
export function tokenDistance(source, target, scene = globalThis.canvas?.scene) {
  if (!source || !target || !scene) return null;
  const gridSize = Number(scene.grid?.size);
  const gridDistance = Number(scene.grid?.distance);
  if (!(gridSize > 0) || !(gridDistance > 0)) return null;

  const center = (token) => {
    const doc = token.document ?? token;
    return token.center ?? {
      x: Number(doc.x) + Number(doc.width ?? 1) * gridSize / 2,
      y: Number(doc.y) + Number(doc.height ?? 1) * gridSize / 2
    };
  };
  const a = center(source);
  const b = center(target);
  const aElevation = Number((source.document ?? source).elevation ?? 0);
  const bElevation = Number((target.document ?? target).elevation ?? 0);
  const scale = gridDistance / gridSize;
  const result = Math.hypot((b.x - a.x) * scale, (b.y - a.y) * scale, bElevation - aElevation);
  return Number.isFinite(result) ? result : null;
}

/** Prefer the controlled token, including unlinked synthetic actors. */
export function attackerTokenFor(actor) {
  const matches = (token) => token.actor === actor || (!actor?.isToken && token.actor?.id === actor?.id);
  return globalThis.canvas?.tokens?.controlled?.find(matches) ?? actor?.getActiveTokens?.(false, false)?.[0] ?? null;
}

export function distanceToTarget(actor, target) {
  return tokenDistance(attackerTokenFor(actor), target);
}
