import type {
  Command,
  Surface,
  TrustConfig,
  TrustVerdict
} from "./types";

export function createDefaultPolicy(): TrustConfig {
  return { defaultPolicy: "allow" };
}

export class TrustEngine {
  private config: TrustConfig;

  constructor(config?: TrustConfig) {
    this.config = config ?? createDefaultPolicy();
  }

  getConfig(): TrustConfig {
    return this.config;
  }

  setConfig(config: TrustConfig): void {
    this.config = config;
  }

  evaluate(
    command: Command,
    surface?: Surface,
    agentId?: string
  ): TrustVerdict {
    // Check default policy
    if (this.config.defaultPolicy === "deny") {
      // In deny-by-default mode, we need explicit agent allow rules
      if (!agentId) {
        return { allowed: false, reason: "Default policy is deny and no agent ID provided." };
      }

      const agentPerms = this.config.agents?.[agentId];
      if (!agentPerms) {
        return { allowed: false, reason: `Agent '${agentId}' has no permissions configured.` };
      }
    }

    // Check agent-level permissions
    if (agentId && this.config.agents) {
      const agentPerms = this.config.agents[agentId];
      if (agentPerms) {
        // Check maxSurfaces for surface:create
        if (command.type === "surface:create" && agentPerms.maxSurfaces !== undefined) {
          // Caller should track surface count externally if needed;
          // here we just validate the rule exists
        }

        // Check node type restrictions on nodes:upsert
        if (command.type === "nodes:upsert") {
          for (const node of command.nodes) {
            if (!node.type) {
              continue;
            }

            if (agentPerms.deny?.includes(node.type)) {
              return {
                allowed: false,
                reason: `Node type '${node.type}' is denied for agent '${agentId}'.`
              };
            }

            if (agentPerms.allow && !agentPerms.allow.includes(node.type)) {
              return {
                allowed: false,
                reason: `Node type '${node.type}' is not in the allow list for agent '${agentId}'.`
              };
            }
          }
        }
      }
    }

    // Check requireConsent
    if (this.config.requireConsent?.length && command.type === "nodes:upsert") {
      for (const node of command.nodes) {
        if (!node.type) {
          continue;
        }

        if (this.config.requireConsent.includes(node.type)) {
          return {
            allowed: false,
            reason: `Node type '${node.type}' requires user consent.`
          };
        }
      }
    }

    return { allowed: true };
  }
}
