import { client, EVENT_ID } from "./shared.mjs";
const { error } = await client().from("events").delete().eq("id", EVENT_ID);
if (error) throw error;
console.log("Removed load-test-event and its cascading guests/photos.");
