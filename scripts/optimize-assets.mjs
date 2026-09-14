import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src", "games");
const outGames = path.join(root, "src", "assets", "games");
const outIcons = path.join(root, "src", "assets", "icons");

fs.mkdirSync(outGames, { recursive: true });
fs.mkdirSync(outIcons, { recursive: true });

const punchTransparent = async (input, output, threshold = 28) => {
  const image = sharp(input).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r <= threshold && g <= threshold && b <= threshold) {
      data[i + 3] = 0;
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(output);
};

for (let i = 1; i <= 13; i += 1) {
  const input = path.join(srcDir, `${i}.jpeg`);
  const output = path.join(outGames, `game-${String(i).padStart(2, "0")}.avif`);
  await sharp(input)
    .resize({ width: 720, withoutEnlargement: true })
    .avif({ quality: 58, effort: 4 })
    .toFile(output);
  console.log("wrote", output);
}

await punchTransparent(
  path.join(srcDir, "multi_token.jpeg"),
  path.join(outIcons, "token.png"),
  32,
);
await punchTransparent(
  path.join(srcDir, "game_coin.jpeg"),
  path.join(outIcons, "game-coin.png"),
  28,
);

const copyAvif = async (name, outName, width = 480) => {
  await sharp(path.join(srcDir, name))
    .resize({ width, withoutEnlargement: true })
    .avif({ quality: 60, effort: 4 })
    .toFile(path.join(outIcons, outName));
};

await copyAvif("multi_VEs.jpeg", "ves.avif");
await copyAvif("multi_SVEs.jpeg", "sves.avif");
await copyAvif("multi_gems.jpeg", "gems.avif");
await copyAvif("signle_spin.jpeg", "spin.avif", 640);

console.log("asset optimization complete");
