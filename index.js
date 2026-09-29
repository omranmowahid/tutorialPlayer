import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import Ffmpeg from "fluent-ffmpeg";

const TUTORIAL_PATH = String.raw`I:\0\courses\udemy\cellular generations 4g, 5g\Udemy - 5G, 4G LTE, 3G, 2G; MobileCellular Networks For Beginners 2024-11`;
const DB_NAME = "TUTORIAL_PLAYER";
let subtitleExtension = '.vtt';

const mysqlConfig = {
  host: "localhost",
  user: "root",
  password: "parwan",
  database: DB_NAME,
};

const app = express();
const port = 3007;

// ===============================
// MYSQL CONNECTION
// ===============================

await createDatabase();

let COURSE_ID;
COURSE_ID = await getCourseId(TUTORIAL_PATH);

// ===============================
// CREATE DATABASE + TABLE
// ===============================
async function createDatabase() {
  let connection;
  try {
    // Connect to MySQL server WITHOUT database
    connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "parwan",
    });
    await connection.query(`
      CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci
    `);
    console.log("Database checked/created successfully.");
    await connection.end();
    // Now connect to the newly created database
    connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "parwan",
      database: DB_NAME,
    });
    await connection.query(`
      CREATE TABLE IF NOT EXISTS course (
        course_id INT AUTO_INCREMENT PRIMARY KEY,
        root_path VARCHAR(1000) NOT NULL UNIQUE
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lesson (
        lesson_id INT AUTO_INCREMENT PRIMARY KEY,
        path VARCHAR(1000) NOT NULL,
        root_path VARCHAR(1000) NOT NULL,
        is_video TINYINT(1) DEFAULT 0,
        length INT DEFAULT 0,
        course_id INT NOT NULL,
        is_seen TINYINT(1) DEFAULT 0,
        seen_date DATETIME NULL,
        UNIQUE KEY unique_lesson_path (path(255)),
        FOREIGN KEY (course_id)
          REFERENCES course(course_id)
      )
    `);
    console.log("Tables checked/created successfully.");
  } catch (err) {
    console.error("Database creation error:", err);
    throw err;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
// ===============================
// MYSQL CONNECTION
// ===============================
function mysqlInstance() {
  return mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "parwan",
    database: DB_NAME,
  });
}
// ===============================
// DATABASE QUERY
// ===============================
async function query(command, values = []) {
  let connection;
  try {
    connection = await mysqlInstance();
    const [rows] = await connection.execute(command, values);
    return rows;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
// ===============================
// DATABASE SAVE
// ===============================
async function saveLogic(command, values = []) {
  let connection;
  try {
    connection = await mysqlInstance();
    await connection.execute(command, values);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
// ===============================
// SERVER
// ===============================
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);
app.use(express.static("public"));
app.use(express.json());
// ===============================
// HOME
// ===============================
app.get("/", async (req, res) => {
  try {
    const allFiles = getAllFiles(TUTORIAL_PATH);
    for (const filePath of allFiles) {
      if (filePath.endsWith(".mp4")) {
        const length = await getVideoDurationAsync(filePath);
        await saveLogic(
          `INSERT IGNORE INTO lesson
           (path, root_path, is_video, length, course_id)
           VALUES (?, ?, ?, ?, ?)`,
          [filePath, TUTORIAL_PATH, 1, length, COURSE_ID],
        );
      } else {
        await saveLogic(
          `INSERT IGNORE INTO lesson
           (path, root_path, course_id)
           VALUES (?, ?, ?)`,
          [filePath, TUTORIAL_PATH, COURSE_ID],
        );
      }
    }
    const lessons = await query(
      `SELECT
        lesson_id,
        path,
        is_seen,
        is_video
       FROM lesson
       where course_id = ?
       ORDER BY lesson_id`,
      [COURSE_ID],
    );
    res.render("index", {
      lessons,
      subtitleExtension,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});
// ===============================
// GET FILE
// ===============================
app.get("/file/:id", async (req, res) => {
  try {
    const lessonId = req.params.id;
    const videoPath = await query(
      `SELECT path
       FROM lesson
       WHERE lesson_id = ?`,
      [lessonId],
    );
    if (videoPath.length === 0) {
      return res.status(404).send("Lesson not found");
    }
    res.sendFile(videoPath[0].path);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.get("/subtitle/:id", async (req, res) => {
    try {
        const lessonId = req.params.id;

        const videoPath = await query(
            `SELECT path
             FROM lesson
             WHERE lesson_id = ?`,
            [lessonId]
        );

        if (videoPath.length === 0) {
            return res.status(404).send("Lesson not found");
        }

        const subtitlePath = videoPath[0].path.replace(
            /\.mp4$/i,
            `${subtitleExtension}`
        );

        res.sendFile(subtitlePath);

    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});
// ===============================
// SUMMARY
// ===============================
app.get("/summary", async (req, res) => {
  try {
    const lectures = await query(
      `SELECT COUNT(*) AS lecture
       FROM lesson
       WHERE is_video = 1 and course_id = ?`,
      [COURSE_ID],
    );
    const seen = await query(
      `SELECT COUNT(*) AS seen
       FROM lesson
       WHERE is_seen = 1
       AND is_video = 1 and course_id = ?`,
      [COURSE_ID],
    );
    const covered = await query(
      `SELECT COUNT(*) AS covered
       FROM lesson
       WHERE DATE(seen_date) = CURDATE()
       AND is_video = 1 and course_id = ?`,
      [COURSE_ID],
    );
    res.json({
      lectures: lectures[0].lecture,
      seen: seen[0].seen,
      covered: covered[0].covered,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
});
// ===============================
// SAVE LESSON
// ===============================
app.post("/lesson/save", async (req, res) => {
  const { id, date } = req.body;
  console.log(`id: ${id} ===== date: ${date}`);
  try {
    await saveLogic(
      `UPDATE lesson
       SET is_seen = 1,
           seen_date = ?
       WHERE lesson_id = ?`,
      [date, id],
    );
    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
});
// ===============================
// DELETE / UNSEE LESSON
// ===============================
app.delete("/lesson/delete", async (req, res) => {
  const { id } = req.body;
  try {
    await saveLogic(
      `UPDATE lesson
       SET is_seen = 0,
           seen_date = NULL
       WHERE lesson_id = ?`,
      [id],
    );
    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
});
// ===============================
// VIDEO DURATION
// ===============================
function getVideoDurationAsync(videoPath) {
  return new Promise((resolve) => {
    Ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) {
        console.error("Failed:", videoPath);
        return resolve(0);
      }
      const length = (data.format.duration / 60).toFixed(0);
      resolve(length);
    });
  });
}
// ===============================
// GET ALL FILES
// ===============================
function getAllFiles(rootPath) {
  const allFiles = [];
  const folder = fs.readdirSync(rootPath, {
    withFileTypes: true,
  });
  folder.sort((a, b) => {
    const numA = parseInt(a.name);
    const numB = parseInt(b.name);

    return numA - numB;
  });
  console.log("folder: ", folder);
  for (const each of folder) {
    if (each.isDirectory()) {
      const files = returnFiles(path.join(rootPath, each.name));
      allFiles.push(files);
    } else {
      allFiles.push([path.join(rootPath, each.name)]);
    }
  }
  console.log(allFiles.flat());
  return allFiles.flat();
}
// ===============================
// GET FILES FROM FOLDER
// ===============================
function returnFiles(folderPath) {
  return fs
    .readdirSync(folderPath)
    // .filter(
    //   (file) =>
    //     !file.toLowerCase().endsWith(".vtt") &&
    //     !file.toLocaleLowerCase().endsWith(".srt"),
    // )
    .filter((file)=>{
      const extension = path.extname(file).toLowerCase();
      if (extension === ".vtt" || extension === ".srt") {
        subtitleExtension = extension;
        return false;
      }
      return true;
    })
    .sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    )
    .map((file) => path.join(folderPath, file));
}
// ===============================
// START SERVER
// ===============================
async function startServer() {
  try {
    // start Express
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (err) {
    console.error("Server could not start:", err);
  }
}
startServer();

async function getCourseId(rootPath) {
  let connection;
  try {
    connection = await mysql.createConnection(mysqlConfig);
    const [rows] = await connection.query(
      `SELECT course_id
     FROM course
     WHERE root_path = ?`,
      [rootPath],
    );
    if (rows.length > 0) {
      return rows[0].course_id;
    }
    const [result] = await connection.query(
      `INSERT INTO course (root_path)
     VALUES (?)`,
      [rootPath],
    );
    return result.insertId;
  } catch (err) {
    console.error("Database creation error:", err);
    throw err;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}


