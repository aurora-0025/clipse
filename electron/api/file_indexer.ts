import fs from "node:fs";
import crypto from "node:crypto";
import { promisify } from "node:util";
import path from "node:path";
import { createRequire } from 'node:module'
import Database from "better-sqlite3";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

interface ImageRow {
  path: string;
  hash: string;
  filename: string;  // Added filename field
  ctime: number;
  mtime: number;
}

const require = createRequire(import.meta.url);

export const db = require("better-sqlite3")("file_index.sqlite", {}) as Database.Database;

db.pragma("journal_mode = WAL");

// Updated table schema to include filename
db.exec(`
  CREATE TABLE IF NOT EXISTS images (
    imageid INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT,
    hash TEXT,
    filename TEXT,
    ctime TIMESTAMP,
    mtime TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    tagid INTEGER PRIMARY KEY AUTOINCREMENT,
    tagname TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS image_tags (
    imageid INTEGER NOT NULL REFERENCES images ON DELETE CASCADE,
    tagid INTEGER NOT NULL REFERENCES tags ON DELETE CASCADE
  );
`);

function computeFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

async function getFileStats(filePath: string): Promise<fs.Stats> {
  return await stat(filePath);
}

async function processFile(filePath: string): Promise<void> {
  try {
    const fileStats = await getFileStats(filePath);
    const mtimeMs = fileStats.mtimeMs;
    const filename = path.basename(filePath, path.extname(filePath));

    const pathExists = db.prepare("SELECT * FROM images WHERE path = ?").get(filePath) as ImageRow | undefined;

    if (pathExists) {
      if (pathExists.mtime === mtimeMs) {
        console.log(`No change for ${filePath}`);
        return;
      } else {
        console.log(`File modified, recomputing hash for ${filePath}`);

        const newHash = computeFileHash(filePath);

        const hashExists = db.prepare("SELECT * FROM images WHERE hash = ?").get(newHash);
        if (hashExists) {
          // File moved, update path and filename
          db.prepare("UPDATE images SET path = ?, filename = ?, mtime = ? WHERE hash = ?").run(
            filePath,
            filename,
            mtimeMs,
            newHash
          );
          console.log(`File moved, path updated for ${filePath}`);
        } else {
          // File changed, update hash, filename, and mtime
          db.prepare("UPDATE images SET hash = ?, filename = ?, mtime = ? WHERE path = ?").run(
            newHash,
            filename,
            mtimeMs,
            filePath
          );
          console.log(`File hash and mtime updated for ${filePath}`);
        }
      }
    } else {
      const fileHash = computeFileHash(filePath);
      const hashExists = db.prepare("SELECT * FROM images WHERE hash = ?").get(fileHash);
      if (hashExists) {
        // File moved, update path and filename
        db.prepare("UPDATE images SET path = ?, filename = ?, mtime = ? WHERE hash = ?").run(
          filePath,
          filename,
          mtimeMs,
          fileHash
        );
        console.log(`File moved, path updated for ${filePath}`);
      } else {
        // Insert new file entry
        const ctimeMs = fileStats.ctimeMs;
        db.prepare("INSERT INTO images (path, hash, filename, ctime, mtime) VALUES (?, ?, ?, ?, ?)").run(
          filePath,
          fileHash,
          filename,
          ctimeMs,
          mtimeMs
        );
        console.log(`New file inserted into SQLite for ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

function isImageFile(filePath: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".svg", ".webp"];
  return imageExtensions.includes(path.extname(filePath).toLowerCase());
}

async function processFilesInBatches(
  paths: string[],
  batchSize: number,
): Promise<void> {
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1}`);
    await Promise.all(batch.map((filePath) => processFile(filePath)));
  }
}

// Function to delete rows where path is not in the given array
function deleteUnprocessedPaths(validPaths: string[]): void {
  const placeholders = validPaths.map(() => "?").join(",");
  const sql = `DELETE FROM images WHERE path NOT IN (${placeholders})`;

  try {
    const stmt = db.prepare(sql);
    stmt.run(...validPaths);
    console.log("Unprocessed paths deleted from SQLite");
  } catch (error) {
    console.error("Error deleting unprocessed paths:", error);
  }
}

async function findImageFiles(directory: string): Promise<string[]> {
  let results: string[] = [];
  const files = await readdir(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const fileStats = await stat(filePath);

    if (fileStats.isDirectory()) {
      const subDirFiles = await findImageFiles(filePath);
      results = results.concat(subDirFiles);
    } else if (isImageFile(filePath)) {
      results.push(filePath);
    }
  }

  return results;
}

async function processDirectories(
  directories: string[],
  batchSize: number,
): Promise<void> {
  try {
    let allImageFiles: string[] = [];
    for (const directory of directories) {
      const imageFiles = await findImageFiles(directory);
      allImageFiles = allImageFiles.concat(imageFiles);
    }
    console.log(`Found ${allImageFiles.length} image files`);
    await processFilesInBatches(allImageFiles, batchSize);
    deleteUnprocessedPaths(allImageFiles);
  } catch (error) {
    console.error("Error processing directories:", error);
  }
}

async function startInitialIndex(paths: string[]) {
  await processDirectories(paths, 10);
}

export { processDirectories, startInitialIndex };