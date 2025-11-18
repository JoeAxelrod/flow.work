import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { isValidUUID } from '../common/validation';

@Injectable()
export class WorkflowsService {
  private readonly log = new Logger(WorkflowsService.name);
  constructor(@Inject('PG') private readonly db: Pool) {}

  async import(def: any) {
    const t0 = Date.now();
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const workflowIdFromDef = def.workflows?.[0]?.id;
      const name = def.workflows?.[0]?.name ?? 'Workflow ' + workflowIdFromDef;

      let workflowId: string;
      
      if (workflowIdFromDef && isValidUUID(workflowIdFromDef)) {
        // Existing workflow - update it
        const { rows: wf } = await client.query(
          `UPDATE public._workflow SET name=$1 WHERE id=$2 RETURNING id`,
          [name, workflowIdFromDef]
        );
        if (wf.length > 0) {
          workflowId = wf[0].id;
          this.log.log(`_workflow updated id=${workflowId}`);
        } else {
          // Workflow not found, create new
          const { rows: wf2 } = await client.query(
            `INSERT INTO public._workflow(name) VALUES ($1) RETURNING id`,
            [name]
          );
          workflowId = wf2[0].id;
          this.log.log(`_workflow created id=${workflowId}`);
        }
      } else {
        // New workflow - create it
        const { rows: wf } = await client.query(
          `INSERT INTO public._workflow(name) VALUES ($1) RETURNING id`,
          [name]
        );
        workflowId = wf[0].id;
        this.log.log(`_workflow created id=${workflowId}`);
      }

      // nodes - let DB generate IDs, map frontend temp IDs to DB IDs
      const frontendIdToDbId = new Map<string, string>();
      let nodeCount = 0;
      for (const n of (def.nodes ?? def.stations ?? [])) {
        const pos  = JSON.stringify(n.position ?? {});
        const data = JSON.stringify(n.data ?? {});
        const kind = n.kind as string; // 'http'|'hook'|'timer'|'join'|'noop'

        let dbId: string;
        
        // Check if this is an existing node (has UUID) or new (has temp ID)
        const isExistingNode = n.id && !n.id.startsWith('__temp_');
        
        if (isExistingNode) {
          // Update existing node
          const { rows: s } = await client.query(
            `UPDATE public._node
             SET label=$1, kind=$2, position=$3, data=$4
             WHERE id=$5 AND workflow_id=$6
             RETURNING id`,
            [n.name, kind, pos, data, n.id, workflowId]
          );
          
          if (s.length > 0) {
            dbId = s[0].id;
          } else {
            // Node not found, insert as new
            const { rows: s2 } = await client.query(
              `INSERT INTO public._node(workflow_id,label,kind,position,data)
               VALUES ($1,$2,$3,$4,$5)
               RETURNING id`,
              [workflowId, n.name, kind, pos, data]
            );
            dbId = s2[0].id;
          }
        } else {
          // New node - let DB generate ID
          const { rows: s } = await client.query(
            `INSERT INTO public._node(workflow_id,label,kind,position,data)
             VALUES ($1,$2,$3,$4,$5)
             RETURNING id`,
            [workflowId, n.name, kind, pos, data]
          );
          dbId = s[0].id;
        }

        // Map frontend ID (temp or existing) to database ID
        if (n.id) {
          frontendIdToDbId.set(n.id, dbId);
        }
        nodeCount++;
      }
      this.log.log(`_node upserted count=${nodeCount}`);

      // edges - use database-generated node IDs
      let edgeCount = 0;
      for (const e of (def.edges ?? [])) {
        const frontendSourceId = e.source ?? e.from;
        const frontendTargetId = e.target ?? e.to;

        const sourceId = frontendIdToDbId.get(frontendSourceId) || frontendSourceId;
        const targetId = frontendIdToDbId.get(frontendTargetId) || frontendTargetId;

        if (!sourceId || !targetId) {
          this.log.warn(`edge skipped (missing node): from=${frontendSourceId} to=${frontendTargetId}`);
          continue;
        }

        const kind = (e.kind ?? e.type ?? 'normal') as string;
        const condition: string | null = e.condition ?? null;

        const sourceHandle: string | null = e.sourceHandle ?? null;
        const targetHandle: string | null = e.targetHandle ?? null;

        await client.query(
          `INSERT INTO public._edge(source_id,target_id,kind,condition,source_handle,target_handle)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (source_id, target_id) DO UPDATE SET
             kind = EXCLUDED.kind,
             condition = EXCLUDED.condition,
             source_handle = EXCLUDED.source_handle,
             target_handle = EXCLUDED.target_handle`,
          [sourceId, targetId, kind, condition, sourceHandle, targetHandle]
        );
        edgeCount++;
      }

      this.log.log(`_edge inserted count=${edgeCount}`);

      await client.query('COMMIT');
      this.log.log(`import done in ${Date.now() - t0}ms`);
      return { 
        id: workflowId,
        nodeIdMap: Object.fromEntries(frontendIdToDbId) // Return mapping for frontend to update IDs
      };
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      this.log.error(`import failed: ${String(err)}`);
      throw err;
    } finally {
      client.release();
    }
  }

  async nodeId(workflowId: string, nodeId: string) {
    const { rows } = await this.db.query(
      `SELECT s.id
       FROM public._node s
       WHERE s.workflow_id = $1 AND s.id = $2`,
      [workflowId, nodeId]
    );
    return rows[0]?.id ?? null;
  }

  async firstNodeId(workflowId: string) {
    const { rows } = await this.db.query(
      `SELECT s.id
       FROM public._node s
       WHERE s.workflow_id = $1
       ORDER BY s.created_at NULLS LAST
       LIMIT 1`,
      [workflowId]
    );
    return rows[0]?.id ?? null;
  }

  async list() {
    const { rows } = await this.db.query(
      `SELECT id, name, created_at
       FROM public._workflow
       ORDER BY created_at DESC`
    );
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
    }));
  }

  async create(name: string) {
    const { rows } = await this.db.query(
      `INSERT INTO public._workflow(name)
       VALUES ($1)
       RETURNING id, name, created_at`,
      [name]
    );
    return {
      id: rows[0].id,
      name: rows[0].name,
      createdAt: rows[0].created_at,
    };
  }

  async getById(id: string) {
    // Single query with JOINs to get workflow, nodes, and edges
    const { rows } = await this.db.query(
      `SELECT 
      w.id as workflow_id, w.name as workflow_name,
      s.id as node_id, s.label, s.kind, s.position, s.data,
      e.id as edge_id, e.source_id, e.target_id, e.kind as edge_kind, e.condition,
      e.source_handle, e.target_handle
     FROM public._workflow w
     LEFT JOIN public._node s ON s.workflow_id = w.id
     LEFT JOIN public._edge e ON e.source_id = s.id OR e.target_id = s.id
     WHERE w.id = $1
     ORDER BY s.created_at, e.created_at`,
      [id]
    );

    if (!rows.length) return null;

    // Extract workflow info from first row
    const firstRow = rows[0];
    const workflow = {
      id: firstRow.workflow_id,
      name: firstRow.workflow_name,
    };

    // Collect unique nodes and edges
    const nodeMap = new Map<string, any>();
    const edgeMap = new Map<string, any>();

    rows.forEach((row: any) => {
      // Add node if it exists and not already added
      if (row.node_id && !nodeMap.has(row.node_id)) {
        nodeMap.set(row.node_id, {
          id: row.node_id,
          name: row.label,
          kind: row.kind,
          position: row.position,
          data: row.data,
        });
      }

      // Add edge if it exists and not already added
      if (row.edge_id && row.source_id && row.target_id) {
        const edgeKey = row.edge_id;
        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, {
            id: edgeKey,
            source: row.source_id,
            target: row.target_id,
            type: row.edge_kind === 'if' ? 'if' : 'normal',
            condition: row.condition || undefined,
            sourceHandle: row.source_handle || undefined,
            targetHandle: row.target_handle || undefined,
          });
        }
      }
    });

    return {
      workflow,
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
    };
  }
}
