import { validateAll } from "@slate/context-loader";

async function main() {
  try {
    await validateAll(true);
    console.log("Context validation passed.");
  } catch (error) {
    console.error("Context validation failed:", error);
    process.exit(1);
  }
}

void main();
