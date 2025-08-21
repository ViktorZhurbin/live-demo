import type { DemoDataByPath } from "@live-demo/core";

// Shared state for demo data across plugin and remark plugin
export const sharedDemoData: DemoDataByPath = {};

export const getDemoDataByPath = () => sharedDemoData;
