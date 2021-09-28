const express = require("express")
const ejs = require("ejs")
const fs = require('fs')
const path = require("path")
const multer = require('multer')
const admzip = require('adm-zip')
const decompress = require('decompress')
const imagesize = require('image-size')
const sharp = require('sharp')

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
var maxSize = 100 * 1024 * 1024; //100 mb [though we will ask user for <10 mb images, we can process upto this "maxSize" ]
var numberOfFile = 100; //user can upload max 100 files at a time
var filesUpload = multer({
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

//get resize page
app.get('/resize', (req, res) => {
  res.render('resize');
});

//cpmpress files
app.post("/compress", filesUpload.array("uploadedFile", numberOfFile), (req, res) => {
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
app.post("/decompress", filesUpload.array("uploadedFile", numberOfFile), (req, res) => {
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

//resize files
app.post("/resize", filesUpload.array("uploadedFile", numberOfFile), (req, res) => {
  var zip = new admzip();
  const percentage = Number(req.body.percentage); //from user input
  const resizedImages = [];
  if (req.files) {
    req.files.forEach((file) => {
      // console.log(file.path)
      //store uploaded images
      zip.addLocalFile(file.path)
      //create resized images
      let inputFile = file.path;
      let outputFile = "public/output/resize/" + file.path.slice(14);
      resizedImages.push(outputFile);
      let newHeight = Math.floor((imagesize(file.path).height * percentage) / 100);
      console.log(imagesize(file.path).height + " to " + newHeight);
      sharp(inputFile).resize({
          height: newHeight
        }).toFile(outputFile)
        .then(function(newFileInfo) {
          console.log("Success")
        })
        .catch(function(err) {
          console.log(err);
        });
    });
    //render output
    res.render("resized", {
      'resizedImages': resizedImages
    });
    //delete uploaded images
    req.files.forEach((file) => {
      fs.unlinkSync(file.path)
    });
  }
});

//Server started on  http://localhost:3000/
app.listen(3000, function() {
  console.log("Server started on port 3000");
});
