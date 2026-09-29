import express from "express";
import bodyParser from "body-parser";
import fs from 'fs';
import path from "path";
import OracleDB from "oracledb";
import Ffmpeg from "fluent-ffmpeg";
import { type } from "os";


const app = express();
const port = 3000;
const TUTORIAL_NAME = 'Javascript'
const TUTORIAL_PATH = String.raw`C:\javascript\Udemy - The Complete JavaScript Course 2025 From Zero to Expert! 1080 2025-10`
const COURSE_ID = 1;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json())

 
// continoutsly check whether there is addition in files & update db
app.get("/", async (req, res) => {
  try {

    const allFiles = getAllFiles(TUTORIAL_PATH);

    for (const path of allFiles) {

      if (path.endsWith('.mp4')) { 

        const length = await getVideoDurationAsync(path);

        await saveLogic(
          `insert into lesson
           (lesson_id, path, is_video, length, course_id)
           select lesson_seq.nextval, :path, :is_video, :length, 1
           from dual
           where not exists (
             select 1
             from lesson
             where path = :path
           )`,
          {
            path,
            is_video: 1,
            length
          }
        );

      } else {

        await saveLogic(
          `insert into lesson
           (lesson_id, path, course_id)
           select lesson_seq.nextval, :path, 1
           from dual
           where not exists (
             select 1
             from lesson
             where path = :path
           )`,
          { path }
        );
      }
    }

    let lessons = await query('select lesson_id, path, is_seen, is_video from lesson order by lesson_id');
    


    res.render('index', {lessons});

  } catch (err) { 
    console.error(err);
    res.status(500).send(err.message);
  }

});



















app.get('/file/:id', async (req, res) => {
    const lessonId = req.params.id
    console.log("======================" + lessonId + typeof lessonId);
    const videoPath = await query(`select path from lesson where lesson_id = ${lessonId}`)
    const path = String.raw`${videoPath[0].PATH}`;
    res.sendFile(path); 
});

app.get('/summary', async (req, res) => {
    const rawDate = new Date();
    const date = new Date(rawDate.getTime() + (4.5 * 60 * 60 * 1000));
    const afgDate = date.getDate().toString().padStart(2, '0') +
        '-' +
        date.toLocaleString('en-US', { month: 'short' }).toUpperCase() +
        '-' +
        date.getFullYear().toString().slice(-2);
      

    const lectures = await query('select count(is_video) as "lecture" from lesson where is_video = 1'); // all videos
    const seen = await query('select count(is_seen) as "seen"  from lesson where is_seen = 1 and is_video = 1'); // videos that watched
    const covered = await query(`select count(*) as "covered" from lesson where TRUNC(seen_date) = TO_DATE('${afgDate}', 'DD-MON-RR') and is_video = 1`); // videos watched today
    
    const result = {
      'lectures': lectures[0].lecture,
      'seen': seen[0].seen,
      'covered': covered[0].covered
    }
    // const lessons = 0;
    res.json(result);
});



app.post('/lesson/save', async (req, res) => {
  const {id, date} = req.body; 
  const seenDate = date;
  


  
  try{
    saveLogic(`update lesson set is_seen = 1, seen_date = :seenDate where lesson_id = :id`, {id, seenDate});
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
 
})

app.delete('/lesson/delete', async (req, res) => {
  const {id} = req.body;
  await saveLogic('update lesson set seen_date = null where lesson_id = :id', {id});
  try{
    saveLogic(`update lesson set is_seen = 0 where lesson_id = :id`, {id});
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
})



app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
















function getAllFiles(dirPath, files=[]) {
  const items = fs.readdirSync(dirPath, {withFileTypes: true});
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      getAllFiles(fullPath, files);
    } else {
      if (!fullPath.endsWith('.vtt')) {
        files.push(fullPath)
      }
    }
  }

  return files;
}

async function saveLogic(command, values) {
    let connection;
    try { 
        connection = await oracleInstance();
        await connection.execute(command, values, {autoCommit: true});
    } finally {
        if (connection) { 
          await connection.close();  
        } 
    }  
} 

async function query(command) {
    let connection;
    try {
        connection = await oracleInstance();
        const result =  await connection.execute(command, [], {outFormat: OracleDB.OUT_FORMAT_OBJECT});
        return result.rows;
    } catch(err) {
        console.error(err);
        throw err;
    } finally {
        if (connection) {
            try {
                 connection.close();
            } catch(err) {
                console.error(err);
            }
        }
    };
}

function oracleInstance() {
    try {
        return OracleDB.getConnection({
            user: 'tutorialPlayer',
            password: 'parwan',
            connectString: 'localhost:1521/seeloo_pdb'
        });
    } catch (err) {
        console.error('connection error: ', err);
        throw err;
    }
}

function getVideoDurationAsync(path) {
  return new Promise((resolve) => {
    getVideoDuration(path, resolve);
  });
}

function getVideoDuration(videoPath, cb) {
  Ffmpeg.ffprobe(videoPath, (err, data) => {
    if (err) {
      console.error('failed', videoPath);
      console.error(err.message);
      return cb(0) ;
    }
    let length =  (data.format.duration / 60).toFixed(0);
    cb(length);
  })
}

