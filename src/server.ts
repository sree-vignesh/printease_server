import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

const app = express();
const port = 3000;

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rollno = req.body.rollno; // Get rollno from form field
    console.log("Roll number:", rollno);

    if (!rollno) {
      return cb(new Error("Roll number is required"), ""); // Ensure rollno is provided
    }

    // Define the directory path using rollno
    const dirPath = path.join(__dirname, "..", "uploads", rollno);

    // Check if the directory exists, if not, create it
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true }); // Create the directory recursively
    }

    cb(null, dirPath); // Use the rollno as a subdirectory
  },
  filename: (req, file, cb) => {
    // Set the filename to be the current timestamp and file extension
    const rollno = req.body.rollno;
    const extension = path.extname(file.originalname);
    console.log(file.filename);
    const now = new Date();
    // Extract day, month, year, hours, minutes, and seconds
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0"); // getMonth() is 0-indexed
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    // Construct the filename in the desired format
    // const filename = `${rollno}-${day}-${month}-${year}-${hours}:${minutes}:${seconds}${extension}`;
    const filename = `${day}-${month}-${year}-${hours}:${minutes}:${seconds}${extension}`;

    console.log(filename);
    //const filename = rollno + "-"+Date.now().toString() + extension;
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Ensure the "uploads" directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Handle file upload (POST /upload)
app.post(
  "/upload",
  upload.single("pdf"),
  (req: Request, res: Response): Response => {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    const identifier = req.file.filename; // Use the filename as a unique identifier
    return res.json({ identifier });
  }
);

// Handle print request (POST /print/:identifier)
app.post("/print/:identifier", (req: Request, res: Response): Response => {
  const identifier = req.params.identifier;
  const filePath = path.join("uploads", identifier);

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  // Trigger printing (example for Linux/Unix-based systems)
  printPDF(filePath)
    .then(() => {
      res.send(`Print job for ${identifier} started successfully`);
    })
    .catch((error) => {
      res.status(500).send(`Error printing the file: ${error.message}`);
    });

  // Ensure that a response is returned from the function
  return res;
});

// Function to print the PDF (using Linux command `lp`)
function printPDF(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`lp ${filePath}`, (error, stdout, stderr) => {
      if (error) {
        return reject(
          new Error(`Error printing the PDF: ${stderr || error.message}`)
        );
      }
      console.log(`Printed PDF: ${stdout}`);
      resolve();
    });
  });
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
