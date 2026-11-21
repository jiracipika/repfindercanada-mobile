import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@fontsource-variable/manrope";
import "@fontsource-variable/dm-sans";
import "./index.css";
import "leaflet/dist/leaflet.css";
import { migrateSavedRepsV2 } from "./lib/migrations/migrateSavedReps";

// Run migration on app startup
migrateSavedRepsV2().catch(error => {
  console.error('[App] Failed to run saved reps migration:', error);
});

createRoot(document.getElementById("root")!).render(<App />);
