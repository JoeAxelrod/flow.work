export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function importWorkflow(def:any){ 
  const r = await fetch(`${API}/workflows/import`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(def) });
  return r.json();
}

export async function startWorkflow(id:string, body:any){
  const r = await fetch(`${API}/workflows/${id}`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
  return r.json();
}

export async function hookNode(workflowId:string, nodeId:string, body:any){
  const r = await fetch(`${API}/hook/workflow/${workflowId}/node/${nodeId}`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
  return r.json();
}

export async function getWorkflow(id:string){
  const r = await fetch(`${API}/workflows/${id}`);
  if (!r.ok) throw new Error(`Failed to fetch workflow: ${r.statusText}`);
  return r.json();
}

export async function listWorkflows(){
  const r = await fetch(`${API}/workflows`);
  if (!r.ok) throw new Error(`Failed to fetch workflows: ${r.statusText}`);
  return r.json();
}

export async function createWorkflow(name:string){
  const r = await fetch(`${API}/workflows`, { 
    method:'POST', 
    headers:{'content-type':'application/json'}, 
    body: JSON.stringify({ name }) 
  });
  if (!r.ok) throw new Error(`Failed to create workflow: ${r.statusText}`);
  return r.json();
}

export async function createInstance(workflowId:string, input?:any){
  const r = await fetch(`${API}/workflows/${workflowId}`, { 
    method:'POST', 
    headers:{'content-type':'application/json'}, 
    body: JSON.stringify({ workflowId, input: input || {} }) 
  });
  if (!r.ok) throw new Error(`Failed to create instance: ${r.statusText}`);
  return r.json();
}

export async function getWorkflowInstances(workflowId:string){
  const r = await fetch(`${API}/workflows/${workflowId}/instances`);
  if (!r.ok) throw new Error(`Failed to fetch instances: ${r.statusText}`);
  return r.json();
}

export async function getInstanceActivities(instanceId:string){
  const r = await fetch(`${API}/instance/${instanceId}/activities`);
  if (!r.ok) throw new Error(`Failed to fetch activities: ${r.statusText}`);
  return r.json();
}

export async function getInstance(instanceId:string){
  const r = await fetch(`${API}/workflows/instances/${instanceId}`);
  if (!r.ok) throw new Error(`Failed to fetch instance: ${r.statusText}`);
  return r.json();
}

