const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("./data.db", (err) => {
  if (err) {
    console.error("Error opening database", err);
  } else {
    console.log("Connected to SQLite database");
    createTables();
  }
});

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS raw_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    timestamp TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS average_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    avg_temperature REAL,
    avg_humidity REAL,
    timestamp TEXT NOT NULL
  )`);

  console.log("Database tables created or already exist");
  calculateAndStoreAverages();
}

let latestTemp = null;
let latestHumidity = null;
let lastAverageTime = null;

app.post("/api/weather/data", (req, res) => {
  const { type, value, timestamp } = req.body;

  if (!type || value === undefined || !timestamp) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (type === "temperature") {
    latestTemp = value;
  } else if (type === "humidity") {
    latestHumidity = value;
  }

  db.run(
    "INSERT INTO raw_data (type, value, timestamp) VALUES (?, ?, ?)",
    [type, value, timestamp],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to store data" });
      }
      res
        .status(201)
        .json({ message: "Data stored successfully", id: this.lastID });
    }
  );
});

function calculateAndStoreAverages() {
  const currentTime = new Date();

  if (lastAverageTime && currentTime - lastAverageTime < 4 * 60 * 1000) {
    return;
  }

  const fiveMinutesAgo = new Date(currentTime - 5 * 60 * 1000).toISOString();
  const currentTimeISO = currentTime.toISOString();

  db.get(
    `SELECT AVG(value) as avg_value FROM raw_data WHERE type = 'temperature' AND timestamp > ? AND timestamp <= ?`,
    [fiveMinutesAgo, currentTimeISO],
    (err, tempResult) => {
      if (err) return;

      db.get(
        `SELECT AVG(value) as avg_value FROM raw_data WHERE type = 'humidity' AND timestamp > ? AND timestamp <= ?`,
        [fiveMinutesAgo, currentTimeISO],
        (err, humidityResult) => {
          if (err) return;

          const avgTemp =
            tempResult && tempResult.avg_value
              ? tempResult.avg_value
              : latestTemp;
          const avgHumidity =
            humidityResult && humidityResult.avg_value
              ? humidityResult.avg_value
              : latestHumidity;

          if (avgTemp !== null || avgHumidity !== null) {
            db.run(
              "INSERT INTO average_data (avg_temperature, avg_humidity, timestamp) VALUES (?, ?, ?)",
              [avgTemp, avgHumidity, currentTimeISO],
              function (err) {
                if (!err) {
                  lastAverageTime = currentTime;
                }
              }
            );
          }
        }
      );
    }
  );
}

app.get("/api/weather/history", (req, res) => {
  db.all(
    `SELECT avg_temperature, avg_humidity, timestamp FROM average_data ORDER BY timestamp DESC LIMIT 12`,
    (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Failed to fetch historical data" });
      }
      res.json(rows.reverse());
    }
  );
});

setInterval(calculateAndStoreAverages, 60 * 1000);

app.get("/db-viewer/raw_data", (req, res) => {
  db.all(
    "SELECT * FROM raw_data ORDER BY timestamp DESC LIMIT 100",
    (err, rows) => {
      if (err) return res.status(500).send("Error fetching data");
      res.json(rows);
    }
  );
});

app.get("/db-viewer/average_data", (req, res) => {
  db.all(
    "SELECT * FROM average_data ORDER BY timestamp DESC LIMIT 100",
    (err, rows) => {
      if (err) return res.status(500).send("Error fetching data");
      res.json(rows);
    }
  );
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
