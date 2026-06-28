import type { Role } from '@/contracts/types';

// Capability → roles allowed. Mirrors ACCOUNT_AND_SETTINGS.md §2 (enforced server-side).
export type Capability =
  | 'graph.read'        // run copilot, compare, TCO, read products
  | 'brief.create'      // run/save searches, create briefs
  | 'negotiation.start'
  | 'purchase.approve'
  | 'members.manage'    // members & billing
  | 'security.manage'   // security & privacy
  | 'org.transfer';     // transfer ownership / delete org

const MATRIX: Record<Capability, Role[]> = {
  'graph.read':        ['owner', 'admin', 'approver', 'member', 'viewer'],
  'brief.create':      ['owner', 'admin', 'approver', 'member'],
  'negotiation.start': ['owner', 'admin', 'approver'],
  'purchase.approve':  ['owner', 'approver'],
  'members.manage':    ['owner', 'admin'],
  'security.manage':   ['owner', 'admin'],
  'org.transfer':      ['owner'],
};

export const can = (role: Role, capability: Capability): boolean =>
  MATRIX[capability].includes(role);

export class RbacError extends Error {
  constructor(public capability: Capability, public role: Role) {
    super(`role '${role}' lacks capability '${capability}'`);
    this.name = 'RbacError';
  }
}

// Throwing guard for route handlers.
export function requireCapability(role: Role, capability: Capability): void {
  if (!can(role, capability)) throw new RbacError(capability, role);
}
