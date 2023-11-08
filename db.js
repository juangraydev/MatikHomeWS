const mysql = require('mysql2');

// create the connection to database
const connection = mysql.createConnection({
    host: "containers-us-west-111.railway.app",
    user: "root",
    password: "3zjhXq8tOTpXG2XwGdH0",
    database: "railway",
    port: process.env.MYSQLPORT
});

module.exports = connection