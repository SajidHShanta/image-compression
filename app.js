const express = require("express")
const ejs = require("ejs")
const fs = require('fs')
const path = require("path")
const multer = require('multer')
const admzip = require('adm-zip')
const decompress = require('decompress')

const app = express();

//set view engine
app.set('view engine', 'ejs');

//set static folder
app.use(express.static('public'));

//setup storage with multer
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "public/output");
  },
  filename: function(req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
var maxSize = 10 * 1024 * 1024; //10 mb
var numberOfFile = 100; //user can upload max 100 files at a time
var compressfilesupload = multer({
  storage: storage,
  limits: {
    fileSize: maxSize
  }
});

//get home page (compress page)
app.get('/', (req, res) => {
  res.render('index');
});

//get decompress page
app.get('/decompress', (req, res) => {
  res.render('decompress');
});

//cpmpress files
app.post("/compress", compressfilesupload.array("uploadedFile", numberOfFile), (req, res) => {
  var zip = new admzip();
  var outputPath = "public/output/compressed/compressed-" + Date.now() + ".zip";

  if (req.files) {
    //store uploaded images
    req.files.forEach((file) => {
      // console.log(file.path)
      zip.addLocalFile(file.path)
    });
    //create Zip (compress file)
    fs.writeFileSync(outputPath, zip.toBuffer());
    //download compressed file
    res.download(outputPath, (err) => {
      if (err) {
        req.files.forEach((file) => {
          fs.unlinkSync(file.path)
        });
        fs.unlinkSync(outputPath)
      }
      //delete uploaded images
      req.files.forEach((file) => {
        fs.unlinkSync(file.path)
      });
    })
  }
});

//decpmpress files
app.post("/decompress", compressfilesupload.array("uploadedFile", numberOfFile), (req, res) => {
  var zip = new admzip();
  const extractedFiles = [];
  var filePath;
  if (req.files) {
    req.files.forEach((zipFile) => {
      //store file
      zip.addLocalFile(zipFile.path)
      //decompress
      decompress(zipFile.path, 'public/output/decompressed').then(files => {
        files.forEach((file) => {
          filePath = file.path;
          extractedFiles.push(filePath);
        })
        //render output
        res.render("decompressed", {
          'extractedFiles': extractedFiles
        });
      });
    })
    //delete uploaded zip file
    req.files.forEach((file) => {
      fs.unlinkSync(file.path)
    });
  }
});

//Server started on  http://localhost:3000/
app.listen(3000, function() {
  console.log("Server started on port 3000");
});
