// One-off icon generator. Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync("public/icon.svg");

const bgSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#3951c1"/></svg>';

await sharp(svg, { density: 600 }).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(svg, { density: 600 }).resize(512, 512).png().toFile("public/icon-512.png");

const inner = await sharp(svg, { density: 600 }).resize(360, 360).png().toBuffer();
await sharp(Buffer.from(bgSvg))
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile("public/icon-maskable-512.png");

console.log("Icons written to public/.");
