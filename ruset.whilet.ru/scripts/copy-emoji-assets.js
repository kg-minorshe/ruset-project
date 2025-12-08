const fs = require("fs");
const path = require("path");

const sourceDir = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "emoji-datasource-apple",
  "img",
  "apple",
  "64"
);
const targetDir = path.resolve(__dirname, "..", "public", "emoji", "apple", "64");

async function copyEmojiAssets() {
  try {
    await fs.promises.access(sourceDir, fs.constants.R_OK);
  } catch (error) {
    console.warn("Emoji assets source not found. Have you installed dependencies?");
    return;
  }

  await fs.promises.mkdir(targetDir, { recursive: true });

  await fs.promises.cp(sourceDir, targetDir, { recursive: true });

  console.log(`Copied Apple emoji assets to ${targetDir}`);
}

copyEmojiAssets().catch((error) => {
  console.error("Failed to copy emoji assets", error);
  process.exitCode = 1;
});
