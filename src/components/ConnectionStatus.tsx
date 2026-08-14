import type { ConnectionState } from "../types";
const labels:Record<ConnectionState,string>={disconnected:"Ready for your order",connecting:"Checking your order",listening:"Listening",speaking:"Replying",error:"Voice is paused"};
export function ConnectionStatus({state}:{state:ConnectionState}){return <div className={`status status-${state}`}><span className="status-dot"/>{labels[state]}</div>}
