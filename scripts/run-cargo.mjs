import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const cargoFromUserProfile = process.env.USERPROFILE
  ? join(process.env.USERPROFILE, ".cargo", "bin", "cargo.exe")
  : "";
const cargo = existsSync(cargoFromUserProfile) ? cargoFromUserProfile : "cargo";
const result = spawnSync(cargo, process.argv.slice(2), {
  stdio: "inherit",
  shell: false
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
