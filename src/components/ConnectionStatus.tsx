import type { ConnectionState } from "../types";
const labels:Record<ConnectionState,string>={disconnected:"Ready for your order",connecting:"Checking your order",listening:"Listening",speaking:"Replying",error:"Voice is paused"};
export function ConnectionStatus({state}:{state:ConnectionState}){return <div aria-live="polite" className={`status status-${state}`} role="status"><span aria-hidden="true" className="status-dot"/>{labels[state]}</div>}
