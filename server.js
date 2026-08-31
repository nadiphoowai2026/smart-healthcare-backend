const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();

app.use(cors());
app.use(express.json());

// ========================================
// MYSQL CONNECTION
// ========================================

const db = mysql.createConnection({
    host: process.env.MYSQLHOST || "localhost",
    user: process.env.MYSQLUSER || "root",
    password: process.env.MYSQLPASSWORD || "",
    database: process.env.MYSQLDATABASE || "smart_healthcare",
    port: process.env.MYSQLPORT || 3306
});

db.connect((err) => {

    if (err) {
        console.error("MySQL connection failed:", err);
        return;
    }

    console.log("MySQL connected successfully!");

});

// ========================================
// TEST SERVER
// ========================================

app.get("/", (req, res) => {

    res.send("Smart Healthcare Backend is running!");

});

// ========================================
// REGISTER / SIGN UP
// ========================================

app.post("/register", async (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {

        return res.json({
            success: false,
            message: "Username and password are required."
        });

    }

    try {

        const checkSql =
            "SELECT id FROM users WHERE username = ?";

        db.query(
            checkSql,
            [username],
            async (err, results) => {

                if (err) {

                    console.error("Check user error:", err);

                    return res.status(500).json({
                        success: false,
                        message: "Database error"
                    });

                }

                if (results.length > 0) {

                    return res.json({
                        success: false,
                        message: "Account already exists."
                    });

                }

                const hashedPassword =
                    await bcrypt.hash(password, 10);

                const sql =
                    "INSERT INTO users (username, password) VALUES (?, ?)";

                db.query(
                    sql,
                    [username, hashedPassword],
                    (err, result) => {

                        if (err) {

                            console.error("Register error:", err);

                            return res.status(500).json({
                                success: false,
                                message: "Database error"
                            });

                        }

                        res.json({
                            success: true,
                            message: "Registration successful!",
                            userId: result.insertId,
                            username: username
                        });

                    }
                );

            }
        );

    } catch (error) {

        console.error("Register error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });

    }

});

// ========================================
// LOGIN
// ========================================

app.post("/login", (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {

        return res.json({
            success: false,
            message: "Username and password are required."
        });

    }

    const sql =
        "SELECT * FROM users WHERE username = ?";

    db.query(
        sql,
        [username],
        async (err, results) => {

            if (err) {

                console.error("Login database error:", err);

                return res.status(500).json({
                    success: false,
                    message: "Database error"
                });

            }

            if (results.length === 0) {
                return res.json({
                    success: false,
                    message: "Invalid username or password"
                });

            }

            const user = results[0];

            try {

                const passwordMatch =
                    await bcrypt.compare(
                        password,
                        user.password
                    );

                if (!passwordMatch) {

                    return res.json({
                        success: false,
                        message: "Invalid username or password"
                    });

                }

                res.json({
                    success: true,
                    message: "Login successful!",
                    userId: user.id,
                    username: user.username
                });

            } catch (error) {

                console.error("Password error:", error);

                res.status(500).json({
                    success: false,
                    message: "Server error"
                });

            }

        }
    );

});

// ========================================
// GET HEALTH DATA
// ========================================

app.get("/health-data/:userId", (req, res) => {

    const userId = req.params.userId;

    const sql = 
        `SELECT *
        FROM health_data
        WHERE user_id = ?
        ORDER BY record_date DESC
        LIMIT 1
    `;

    db.query(
        sql,
        [userId],
        (err, results) => {

            if (err) {

                console.error("Health data error:", err);

                return res.status(500).json({
                    success: false,
                    message: "Database error"
                });

            }

            if (results.length === 0) {

                return res.json({
                    success: true,
                    data: {
                        steps: 0,
                        sleep_hours: 0,
                        heart_rate: 0,
                        water_ml: 0
                    }
                });

            }

            res.json({
                success: true,
                data: results[0]
            });

        }
    );

});

// ========================================
// CREATE / UPDATE HEALTH DATA
// ========================================

app.post("/health-data", (req, res) => {

    const {
        userId,
        record_date,
        steps,
        sleep_hours,
        heart_rate,
        water_ml,
        bedtime,
        wake_up
    } = req.body;

    if (!userId || !record_date) {

        return res.json({
            success: false,
            message: "User ID and date are required."
        });

    }

    const checkSql = 
        `SELECT *
        FROM health_data
        WHERE user_id = ?
        AND record_date = ?
    `;

    db.query(
        checkSql,
        [userId, record_date],
        (err, results) => {

            if (err) {

                console.error("Health data check error:", err);

                return res.status(500).json({
                    success: false,
                    message: "Database error"
                });

            }

            // UPDATE
            if (results.length > 0) {

                const oldData = results[0];

                const newSteps =
                    steps !== undefined
                        ? steps
                        : oldData.steps;

                const newSleep =
                    sleep_hours !== undefined
                        ? sleep_hours
                        : oldData.sleep_hours;

                const newHeartRate =
                    heart_rate !== undefined
                        ? heart_rate
                        : oldData.heart_rate;

                const newWater =
                    water_ml !== undefined
                        ? water_ml
                        : oldData.water_ml;
                const newBedtime =
                    bedtime !== undefined
                        ? bedtime
                        : oldData.bedtime;

                const newWakeUp =
                    wake_up !== undefined
                        ? wake_up
                        : oldData.wake_up;

                const updateSql = 
                   ` UPDATE health_data
                    SET
                        steps = ?,
                        sleep_hours = ?,
                        heart_rate = ?,
                        water_ml = ?,
                        bedtime = ?,
                        wake_up = ?
                    WHERE user_id = ?
                    AND record_date = ?
                `;

                db.query(
                    updateSql,
                    [
                        newSteps,
                        newSleep,
                        newHeartRate,
                        newWater,
                        newBedtime,
                        newWakeUp,
                        userId,
                        record_date
                    ],
                    (err) => {

                        if (err) {

                            console.error("Health update error:", err);

                            return res.status(500).json({
                                success: false,
                                message: "Database error"
                            });

                        }

                        res.json({
                            success: true,
                            message:
                                "Health data updated successfully!"
                        });

                    }
                );

                return;
            }

            // INSERT
            const insertSql = 
                `INSERT INTO health_data
                (
                    user_id,
                    record_date,
                    steps,
                    sleep_hours,
                    heart_rate,
                    water_ml,
                    bedtime,
                    wake_up
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
                insertSql,
                [
                    userId,
                    record_date,
                    steps ?? 0,
                    sleep_hours ?? 0,
                    heart_rate ?? 0,
                    water_ml ?? 0,
                    bedtime ?? null,
                    wake_up ?? null
                ],
                (err) => {

                    if (err) {

                        console.error("Health insert error:", err);

                        return res.status(500).json({
                            success: false,
                            message: "Database error"
                        });

                    }

                    res.json({
                        success: true,
                        message:
                            "Health data created successfully!"
                    });

                }
            );

        }
    );

});

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {

    console.log(`Server running on port ${PORT}`);

});
