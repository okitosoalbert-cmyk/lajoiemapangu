// Only follow shared OpenStreetMap nodes on mapped pedestrian ways.
export function walkingRoute(graph, from, to) {
  const starts = graph.anchors[from], ends = graph.anchors[to];
  if (!starts?.length || !ends?.length || from === to) return null;
  const {points, edges} = graph;
  const neighbours = points.map(() => []);
  for (const [a, b] of edges) {
    const length = Math.hypot(points[a][0] - points[b][0], points[a][1] - points[b][1]);
    neighbours[a].push([b, length]);
    neighbours[b].push([a, length]);
  }
  const distance = points.map(() => Infinity);
  const previous = points.map(() => -1);
  const visited = new Uint8Array(points.length);
  const finish = new Map(ends);
  for (const [node, offset] of starts) distance[node] = offset * 2;
  let last = -1, best = Infinity;
  for (;;) {
    let node = -1, nearest = best;
    for (let i = 0; i < distance.length; i++) {
      if (!visited[i] && distance[i] < nearest) {
        node = i;
        nearest = distance[i];
      }
    }
    if (node < 0) break;
    visited[node] = 1;
    if (nearest + finish.get(node) * 2 < best) {
      last = node;
      best = nearest + finish.get(node) * 2;
    }
    for (const [next, length] of neighbours[node]) {
      if (nearest + length < distance[next]) {
        distance[next] = nearest + length;
        previous[next] = node;
      }
    }
  }
  if (last < 0) return null;
  const path = [];
  let first = last;
  for (let node = last; node !== -1; node = previous[node]) {
    path.push(points[node]);
    first = node;
  }
  const startOffset = new Map(starts).get(first);
  const metres = best - startOffset - finish.get(last);
  return {path: path.reverse(), metres};
}
