import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const outDir = path.resolve("src/assets/icons");
const srcDir = path.resolve(
  "C:/Users/HP/.cursor/projects/c-Users-HP-OneDrive-Desktop-VELOOP-project/assets",
);

const jobs = [
  { file: "c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_fc3fcf496a998c69812193e486c5bb9f_images_Signle_Token-5ad25beb-61fa-4ba1-97c0-faf6e5cf5874.jpg", name: "token", size: 256 },
  { file: "c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_fc3fcf496a998c69812193e486c5bb9f_images_multi_token-27312923-116d-48e1-8845-56226e5c0333.jpg", name: "tokens", size: 512 },
  { file: "c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_fc3fcf496a998c69812193e486c5bb9f_images_game_coin-cf6e5bc9-c372-47b2-b7c6-5b5f756785bb.jpg", name: "game-coin", size: 256 },
  { file: "c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_fc3fcf496a998c69812193e486c5bb9f_images_single_VEs-5ba0d6f4-0447-4d4c-97dc-b5a1cba876b6.jpg", name: "ves", size: 256 },
  { file: "c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_fc3fcf496a998c69812193e486c5bb9f_images_multi_VEs-0a7e4d6d-c663-40be-80e0-89a07ab776ab.jpg", name: "ves-stack", size: 512 },
  { file: "c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_fc3fcf496a998c69812193e486c5bb9f_images_single_SVEs-9c74746f-c61d-439c-971f-239e1028ca2b.jpg", name: "sves", size: 256 },
  { file: "c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_fc3fcf496a998c69812193e486c5bb9f_images_multi_SVEs-57447e91-96d0-43ba-b239-ba96ceba089b.jpg", name: "sves-stack", size: 512 },
  { file: "c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_fc3fcf496a998c69812193e486c5bb9f_images_single_gem-90ea6df3-78d0-4734-9563-f76d93a59f60.jpg", name: "gem", size: 256 },
  { file: "c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_fc3fcf496a998c69812193e486c5bb9f_images_multi_gems-06e9fbea-ccf9-43e5-9527-1879c7849683.jpg", name: "gems", size: 512 },
  { file: "c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_fc3fcf496a998c69812193e486c5bb9f_images_signle_spin-6f6e107f-fd00-4dfc-ba90-2281eb2992f2.jpg", name: "spin", size: 640 },
  { file: "c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_fc3fcf496a998c69812193e486c5bb9f_images_tap_coin-d4fc8269-3dc6-4027-8f7d-051e91522c0c.jpg", name: "tap-coin", size: 256 },
];

async function knockOutDark(input, size) {
  const { data, info } = await sharp(input)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 22) {
      data[i + 3] = 0;
    } else if (max < 48 && max - min < 18) {
      data[i + 3] = Math.round(((max - 22) / 26) * 255);
    }
  }

  return sharp(data, { raw: info });
}

for (const job of jobs) {
  const input = path.join(srcDir, job.file);
  if (!fs.existsSync(input)) {
    console.error("missing", job.file);
    continue;
  }
  const image = await knockOutDark(input, job.size);
  const png = path.join(outDir, `${job.name}.png`);
  const avif = path.join(outDir, `${job.name}.avif`);
  const pngBuf = await image.png({ compressionLevel: 9 }).toBuffer();
  await fs.promises.writeFile(png, pngBuf);
  await sharp(pngBuf).avif({ quality: 62 }).toFile(avif);
  console.log("wrote", job.name);
}
