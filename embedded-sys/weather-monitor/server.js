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
  db.run(`CREATE TABLE IF NOT EXISTS raw-data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    timestamp TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS average-data (
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
    "INSERT INTO raw-data (type, value, timestamp) VALUES (?, ?, ?)",
    [type, value, timestamp],
    function (err) {
      if (err) {
        console.error("Error storing data:", err);
        return res.status(500).json({ error: "Failed to store data" });
      }

      res.status(201).json({
        message: "Data stored successfully",
        id: this.lastID,
      });
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
    `SELECT AVG(value) as avg_value 
     FROM raw-data 
     WHERE type = 'temperature' AND timestamp > ? AND timestamp <= ?`,
    [fiveMinutesAgo, currentTimeISO],
    (err, tempResult) => {
      if (err) {
        return console.error("Error calculating average temperature:", err);
      }

      db.get(
        `SELECT AVG(value) as average-value 
         FROM raw-data 
         WHERE type = 'humidity' AND timestamp > ? AND timestamp <= ?`,
        [fiveMinutesAgo, currentTimeISO],
        (err, humidityResult) => {
          if (err) {
            return console.error("Error calculating average humidity:", err);
          }

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
              "INSERT INTO average-data (avg_temperature, avg_humidity, timestamp) VALUES (?, ?, ?)",
              [avgTemp, avgHumidity, currentTimeISO],
              function (err) {
                if (err) {
                  console.error("Error storing average data:", err);
                } else {
                  console.log(
                    "Stored 5-minute averages successfully at",
                    new Date().toLocaleTimeString()
                  );
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
    `SELECT avg_temperature, avg_humidity, timestamp 
     FROM average-data 
     ORDER BY timestamp DESC 
     LIMIT 12`,
    (err, rows) => {
      if (err) {
        console.error("Error fetching historical data:", err);
        return res
          .status(500)
          .json({ error: "Failed to fetch historical data" });
      }

      res.json(rows.reverse());
    }
  );
});

setInterval(calculateAndStoreAverages, 60 * 1000); // Check every minute

app.get("/db-viewer", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SQLite Database Viewer</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .container { max-width: 1200px; margin: 0 auto; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>SQLite Database Viewer</h1>
        <h2>Tables</h2>
        <ul>
          <li><a href="/db-viewer/raw-data">raw_data</a></li>
          <li><a href="/db-viewer/avg-data">avg_data</a></li>
        </ul>
        <p>Click on a table name to view its data.</p>
      </div>
    </body>
    </html>
  `);
});

// View raw_data table
app.get("/db-viewer/raw-data", (req, res) => {
  db.all(
    "SELECT * FROM raw-data ORDER BY timestamp DESC LIMIT 100",
    (err, rows) => {
      if (err) {
        return res.status(500).send("Error fetching data: " + err.message);
      }

      let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Raw Data Table</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .container { max-width: 1200px; margin: 0 auto; }
        .nav { margin-bottom: 20px; }
      </style>
      <meta http-equiv="refresh" content="30"> <!-- Auto-refresh page every 30 seconds -->
    </head>
    <body>
      <div class="container">
        <div class="nav">
          <a href="/db-viewer">← Back to Tables</a>
        </div>
        <h1>raw_data Table</h1>
        <p>Showing latest 100 records (auto-refreshes every 30 seconds)</p>
    `;

      if (rows.length === 0) {
        html += "<p>No data found in this table.</p>";
      } else {
        html += "<table><tr>";

        Object.keys(rows[0]).forEach((key) => {
          html += `<th>${key}</th>`;
        });
        html += "</tr>";

        rows.forEach((row) => {
          html += "<tr>";
          Object.values(row).forEach((value) => {
            html += `<td>${value}</td>`;
          });
          html += "</tr>";
        });

        html += "</table>";
      }

      html += `
        <div class="nav">
          <a href="/db-viewer">← Back to Tables</a>
        </div>
      </div>
    </body>
    </html>
    `;

      res.send(html);
    }
  );
});

app.get("/db-viewer/average-data", (req, res) => {
  db.all(
    "SELECT * FROM average-data ORDER BY timestamp DESC LIMIT 100",
    (err, rows) => {
      if (err) {
        return res.status(500).send("Error fetching data: " + err.message);
      }

      let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Average Data Table</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .container { max-width: 1200px; margin: 0 auto; }
        .nav { margin-bottom: 20px; }
      </style>
      <meta http-equiv="refresh" content="30"> <!-- Auto-refresh page every 30 seconds -->
    </head>
    <body>
      <div class="container">
        <div class="nav">
          <a href="/db-viewer">← Back to Tables</a>
        </div>
        <h1>avg_data Table</h1>
        <p>Showing latest 100 records (auto-refreshes every 30 seconds)</p>
    `;

      if (rows.length === 0) {
        html += "<p>No data found in this table.</p>";
      } else {
        html += "<table><tr>";

        Object.keys(rows[0]).forEach((key) => {
          html += `<th>${key}</th>`;
        });
        html += "</tr>";

        rows.forEach((row) => {
          html += "<tr>";
          Object.values(row).forEach((value) => {
            html += `<td>${value}</td>`;
          });
          html += "</tr>";
        });

        html += "</table>";
      }

      html += `
        <div class="nav">
          <a href="/db-viewer">← Back to Tables</a>
        </div>
      </div>
    </body>
    </html>
    `;

      res.send(html);
    }
  );
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
