#!/usr/bin/env bash
set -euo pipefail
RPC_URL="http://127.0.0.1:3100/rpc"
jsonrpc() {
  curl -s -X POST "$RPC_URL" -H 'Content-Type: application/json' -d "$1"
}
JQ() { jq "$@"; }
SESSION=$(jsonrpc '{"jsonrpc":"2.0","id":1,"method":"slate.create_session","params":{"goal":"Smoke test SLATE","context":{"questions":{},"decision_matrix":{}},"autonomy_level":"L1"}}')
SESSION_ID=$(echo "$SESSION" | JQ -r '.result.id')
echo "Session: $SESSION_ID"
POLY=$(jq -n --arg session "$SESSION_ID" '{jsonrpc:"2.0",id:2,method:"slate.run_agent",params:{agent_id:"polymath",session_id:$session,autonomy_level:"L1",input:{goal:"Smoke test SLATE",context:{questions:{q1:{question:"What are we testing?",answer:"Polymath->Resonant"}},decision_matrix:{}}}}}')
POLY_RUN=$(jsonrpc "$POLY")
POLY_EXEC=$(echo "$POLY_RUN" | JQ -r '.result.executionId')
echo "Polymath exec: $POLY_EXEC"
while true; do
  STATUS=$(jq -n --arg exec "$POLY_EXEC" '{jsonrpc:"2.0",id:3,method:"slate.get_agent_status",params:{execution_id:$exec}}' | jsonrpc)
  STATE=$(echo "$STATUS" | JQ -r '.result.status')
  if [[ "$STATE" == "completed" ]]; then
    break
  elif [[ "$STATE" == "failed" ]]; then
    echo "$STATUS" | JQ '.' >&2
    exit 1
  fi
  sleep 2
done
POLY_ART=$(echo "$STATUS" | JQ -r '.result.artifact.id')
TASKMAP=$(jq -n --arg id "$POLY_ART" '{jsonrpc:"2.0",id:4,method:"slate.get_artifact",params:{artifact_id:$id}}' | jsonrpc | JQ '.result')
TASKMAP_PATH='context/context_packets/taskmap-demo.json'
echo "$TASKMAP" | JQ '.' > "$TASKMAP_PATH"
echo "Saved TaskMap to $TASKMAP_PATH"
RES=$(jq -n --arg session "$SESSION_ID" --argjson tm "$TASKMAP" '{jsonrpc:"2.0",id:5,method:"slate.run_agent",params:{agent_id:"resonant",session_id:$session,autonomy_level:"L1",input:{taskMap:$tm}}}')
RES_RUN=$(jsonrpc "$RES")
RES_EXEC=$(echo "$RES_RUN" | JQ -r '.result.executionId')
echo "Resonant exec: $RES_EXEC"
while true; do
  RSTATUS=$(jq -n --arg exec "$RES_EXEC" '{jsonrpc:"2.0",id:6,method:"slate.get_agent_status",params:{execution_id:$exec}}' | jsonrpc)
  STATE=$(echo "$RSTATUS" | JQ -r '.result.status')
  if [[ "$STATE" == "completed" ]]; then
    break
  elif [[ "$STATE" == "failed" ]]; then
    echo "$RSTATUS" | JQ '.' >&2
    exit 1
  fi
  sleep 2
done
EVID_ART=$(echo "$RSTATUS" | JQ -r '.result.artifact.id')
EVIDENCE=$(jq -n --arg id "$EVID_ART" '{jsonrpc:"2.0",id:7,method:"slate.get_artifact",params:{artifact_id:$id}}' | jsonrpc | JQ '.result')
EVIDENCE_PATH='context/context_packets/evidencepack-demo.json'
echo "$EVIDENCE" | JQ '.' > "$EVIDENCE_PATH"
echo "Saved EvidencePack to $EVIDENCE_PATH"
echo 'Done.'
