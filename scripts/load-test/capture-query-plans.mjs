import { writeFile } from "node:fs/promises";
import { client } from "./shared.mjs";

const { data, error } = await client().rpc("event_readiness_query_plans");
if (error) throw error;
await writeFile(".tools/query-plans.json", `${JSON.stringify(data, null, 2)}\n`, "utf8");

function nodes(node, found = []) {
  found.push({ type: node["Node Type"], relation: node["Relation Name"], index: node["Index Name"], actualRows: node["Actual Rows"], loops: node["Actual Loops"] });
  for (const child of node.Plans ?? []) nodes(child, found);
  return found;
}

console.log(JSON.stringify(data.map((entry) => ({
  name: entry.plan_name,
  planningMs: entry.plan[0]["Planning Time"],
  executionMs: entry.plan[0]["Execution Time"],
  sharedHitBlocks: entry.plan[0].Plan["Shared Hit Blocks"],
  nodes: nodes(entry.plan[0].Plan),
})), null, 2));
