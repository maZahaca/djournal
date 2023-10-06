import { AbstractFlow, FlowAction } from "./flows/AbstractFlow";

export class FlowStore {
  flows = new Map<FlowAction, AbstractFlow>();

  register(flows?: AbstractFlow[]): void {
    (flows || []).forEach((flow) => {
      this.flows.set(flow.action, flow);
    });
  }
}
