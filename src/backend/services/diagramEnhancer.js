/**
 * Diagram Enhancer Service
 *
 * Uses OpenAI to polish a raw Terraform diagram by generating
 * human-friendly labels, grouping related resources into containers,
 * suggesting semantic edge verbs, and optional extra annotations.
 *
 * This service is intentionally lightweight: it prepares a condensed
 * JSON prompt, sends it to the OpenAI chat completion endpoint, and
 * expects a structured JSON response.  The calling controller merges
 * the response with the existing diagram before sending to the client.
 */

require('dotenv').config();
const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn('[diagramEnhancer] OPENAI_API_KEY not set – returning original diagram');
}

let openai;
if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

// Few-shot example to steer the model towards our desired JSON format
const SYSTEM_PROMPT = `You are a diagram-polishing assistant. Given a list of Terraform resources and their connections, you output JSON that:
- renames nodes to short friendly labels (title-case, spaces).
- assigns each node an icon category (e.g. gcp/vpc, gcp/pubsub_topic).
- groups related nodes into logical containers with a descriptive title.
- assigns semantic verbs to edges (e.g. "configures", "depends on", "stores in").
- may add extra annotations (actors or notes) if they help readability.

IMPORTANT: For edges, only return the edge ID and verb. Do NOT change the edge IDs.

Return ONLY valid JSON matching this schema:
{
  "nodes": [{"id":string,"label":string,"icon":string}],
  "groups": [{"title":string,"members":string[]}],
  "edges": [{"id":string,"verb":string}],
  "annotations": [{"type":"actor"|"note","label":string,"x":number,"y":number}]
}`;

/**
 * Enhance a diagram.
 * @param {Object} diagramData Raw diagram {nodes,edges,width,height}
 * @returns {Object} Object with optional nodes, groups, edges, annotations
 */
async function polishDiagram(diagramData) {
  const log = (msg, obj) => console.log(`[diagramEnhancer] ${msg}`, obj || '');
  if (!openai) return { polished: false };

  // Trim diagram to stay within token limits
  const compact = {
    nodes: diagramData.nodes.map(n => ({ id: n.id, type: n.resourceType || n.type })),
    edges: diagramData.edges.map(e => ({ id: e.id, sourceId: e.sourceId, targetId: e.targetId }))
  };

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(compact) }
  ];

  log('Sending prompt to OpenAI', messages);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o', // or 'gpt-4o-mini' if available
    messages,
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });

  log('OpenAI response', completion);

  try {
    const json = JSON.parse(completion.choices[0].message.content);
    log('Parsed OpenAI JSON', json);
    
    // Merge enhanced nodes with original node data to preserve all properties
    if (json.nodes && Array.isArray(json.nodes)) {
      const enhancedNodes = diagramData.nodes.map(originalNode => {
        const enhancement = json.nodes.find(n => n.id === originalNode.id);
        if (enhancement) {
          return { 
            ...originalNode, 
            label: enhancement.label || originalNode.label || originalNode.name,
            icon: enhancement.icon || originalNode.icon
          };
        }
        return originalNode;
      });
      json.nodes = enhancedNodes;
    }
    
    // Merge enhanced edges with original edge data to preserve sourceId/targetId
    if (json.edges && Array.isArray(json.edges)) {
      const enhancedEdges = diagramData.edges.map(originalEdge => {
        const enhancement = json.edges.find(e => e.id === originalEdge.id);
        if (enhancement && enhancement.verb) {
          return { ...originalEdge, verb: enhancement.verb };
        }
        return originalEdge;
      });
      json.edges = enhancedEdges;
    }
    
    return { polished: true, ...json };
  } catch (err) {
    console.error('[diagramEnhancer] Failed to parse OpenAI response', err);
    return { polished: false };
  }
}

module.exports = { polishDiagram };
