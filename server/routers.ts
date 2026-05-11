// Backwards-compatibility barrel. The real code lives in:
//   - ./routers/index.ts    appRouter + AppRouter type
//   - ./routers/{admin,auth,email,exportTemplates,hlr}.ts  individual routers
//   - ./batch.ts            shared batch-processing helpers
// Keeping this file as a re-export means imports like
// `from "./routers"` and `from "../routers"` keep working unchanged.

export { appRouter, type AppRouter } from "./routers/index";
export { autoResumeInterruptedBatches } from "./batch";
export { EXPORT_FIELDS } from "./routers/hlr";
