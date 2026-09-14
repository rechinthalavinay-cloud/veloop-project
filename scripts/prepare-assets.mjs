import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const sourceDir = path.resolve(
  "C:/Users/HP/.cursor/projects/c-Users-HP-OneDrive-Desktop-VELOOP-project/assets",
);
const gamesOut = path.resolve("src/assets/games");
const iconsOut = path.resolve("src/assets/icons");

fs.mkdirSync(gamesOut, { recursive: true });
fs.mkdirSync(iconsOut, { recursive: true });

const games = [
  "game-01-blade-master.png",
  "game-02-nut-craft.png",
  "game-03-bowlexa.png",
  "game-04-block-crush.png",
  "game-05-slice-storm.png",
  "game-06-cosmo-warrior.png",
  "game-07-toilet-tactics.png",
  "game-08-word-hunt.png",
  "game-09-bubble-blast.png",
  "game-10-merge-master.png",
  "game-11-wormzy.png",
  "game-12-aqua-fill.png",
  "game-13-realm-clash.png",
];

for (const [index, file] of games.entries()) {
  const input = path.join(sourceDir, file);
  const output = path.join(gamesOut, `game-${String(index + 1).padStart(2, "0")}.avif`);
  await sharp(input)
    .rotate()
    .resize(780, 1040, { fit: "cover", position: "attention" })
    .avif({ quality: 62 })
    .toFile(output);
  console.log("wrote", output);
}

const iconSvgs = ["token.svg", "game-coin.svg", "ves.svg"];
for (const name of iconSvgs) {
  const input = path.join(iconsOut, name);
  const png = path.join(iconsOut, name.replace(".svg", ".png"));
  const avif = path.join(iconsOut, name.replace(".svg", ".avif"));
  await sharp(input).resize(128, 128).png().toFile(png);
  await sharp(input).resize(128, 128).avif({ quality: 70 }).toFile(avif);
  console.log("wrote", png);
}
