var mysql = require('mysql');
var connection = mysql.createConnection({
    host: "containers-us-west-51.railway.app",
    user: "root",
    password: "PFriq1CEYtDFbwnj4wqm",
    database: "railway",
    port: 7336
});
connection.connect(function(error){
	if(!!error) {
		console.log(error);
	} else {
		console.log('Database Connected Successfully..!!');
	}
});

module.exports = connection;