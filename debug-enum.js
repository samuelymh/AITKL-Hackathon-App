const { JobPriority } = require("./lib/services/notification-queue.ts");

console.log("JobPriority enum values:");
console.log("NORMAL:", JobPriority.NORMAL);
console.log("URGENT:", JobPriority.URGENT);
console.log("HIGH:", JobPriority.HIGH);
console.log("LOW:", JobPriority.LOW);

console.log("All values:", Object.values(JobPriority));
