import { readFileSync } from 'node:fs';

const tracePath = process.argv[2];
if (!tracePath) throw new Error('Usage: node analyze-rendering-trace.mjs <trace.json>');

const parsed = JSON.parse(readFileSync(tracePath, 'utf8'));
const events = parsed.traceEvents || parsed;
const navigation = events.find((event) => event.name === 'navigationStart');
const origin = navigation?.ts || Math.min(...events.map((event) => event.ts || Infinity));
const relativeMs = (timestamp) => Number(((timestamp - origin) / 1000).toFixed(2));
const mainFrame = navigation?.args?.data?.frame || navigation?.args?.frame;
const eventFrame = (event) => event.args?.data?.frame || event.args?.frame;
const isMainFrameEvent = (event) => !mainFrame || !eventFrame(event) || eventFrame(event) === mainFrame;

const interestingNames = new Set([
  'Animation',
  'BeginRemoteFontLoad',
  'CommitLoad',
  'firstContentfulPaint',
  'firstPaint',
  'largestContentfulPaint::Candidate',
  'LayoutShift',
  'RemoteFontLoaded',
  'RunTask',
]);
const names = new Map();
for (const event of events) {
  if (!interestingNames.has(event.name)) continue;
  names.set(event.name, (names.get(event.name) || 0) + 1);
}

const summarizeArgs = (event) => {
  const data = event.args?.data || {};
  if (event.name === 'largestContentfulPaint::Candidate') {
    return {
      frame: data.frame,
      candidateIndex: data.candidateIndex,
      isMainFrame: isMainFrameEvent(event),
      nodeId: data.nodeId,
      nodeName: data.nodeName,
      size: data.size,
      type: data.type,
    };
  }
  if (event.name === 'LayoutShift') {
    return {
      frame: data.frame,
      isMainFrame: isMainFrameEvent(event),
      score: data.score,
      cumulativeScore: data.cumulative_score,
      hadRecentInput: data.had_recent_input,
      impactedNodes: (data.impacted_nodes || []).map((node) => ({
        nodeId: node.node_id,
        oldRect: node.old_rect,
        newRect: node.new_rect,
      })),
    };
  }
  return {
    frame: eventFrame(event),
    isMainFrame: isMainFrameEvent(event),
    name: data.name,
    nodeId: data.nodeId,
    url: data.url,
  };
};

const timeline = events
  .filter((event) => interestingNames.has(event.name) && event.name !== 'RunTask')
  .map((event) => ({
    name: event.name,
    startMs: relativeMs(event.ts),
    durationMs: event.dur ? Number((event.dur / 1000).toFixed(2)) : 0,
    details: summarizeArgs(event),
  }));

const longTasks = events
  .filter((event) => event.name === 'RunTask' && (event.dur || 0) >= 50_000)
  .map((event) => {
    const end = event.ts + event.dur;
    const childNames = new Map();
    for (const child of events) {
      if (child.pid !== event.pid || child.tid !== event.tid || child.ts < event.ts || child.ts > end) continue;
      if (!['EvaluateScript', 'EventDispatch', 'FunctionCall', 'Layout', 'Paint', 'PrePaint', 'RecalculateStyles', 'TimerFire', 'UpdateLayoutTree'].includes(child.name)) continue;
      const current = childNames.get(child.name) || { count: 0, durationMs: 0 };
      current.count += 1;
      current.durationMs += (child.dur || 0) / 1000;
      childNames.set(child.name, current);
    }
    return {
      startMs: relativeMs(event.ts),
      durationMs: Number((event.dur / 1000).toFixed(2)),
      children: Object.fromEntries([...childNames].map(([name, value]) => [name, {
        count: value.count,
        durationMs: Number(value.durationMs.toFixed(2)),
      }])),
    };
  });

process.stdout.write(JSON.stringify({
  tracePath,
  navigationTimestamp: origin,
  navigationUrl: navigation?.args?.data?.documentLoaderURL,
  mainFrame,
  matchingEventCounts: Object.fromEntries([...names].sort(([a], [b]) => a.localeCompare(b))),
  timeline,
  longTasks,
}, null, 2));
