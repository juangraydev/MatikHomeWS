// require('dotenv').config()
// let dbConn = require('./db');
// const http = require("http");
// // const socketio = require("socket.io");
// const PORT = process.env.PORT || 8000
// const server = http.createServer();
// // const io = socketio(server);
// const io = require('socket.io')(server, {
//   cors: {
//     origin: ['http://127.0.0.1:3000'],
//   }
// });


// function get_device(homeId){
//   let resp_data = []
//   return new Promise(function(resolve, reject){
//     let sql = `SELECT * FROM devices WHERE home_id = '${homeId.replaceAll("-","")}'`
//     dbConn.query(sql, async function(err,rows)     {
//       if(err) {
//         reject(err)
//       } else {
//         var res_device = []
//         for (let index = 0; index < rows.length; index++) {
//           const element = rows[index];
//           var device_channel = []
//           await get_channel(element.id)
//             .then((channel)=>{
//               channel?.map((channel) => {
//                 device_channel.push(channel)
//               })
//             })
//             .catch((err)=>{
//                 throw err
//             })
          
//           res_device = res_device.concat(device_channel)
//         }
//         resolve(res_device);
//       }
//     });
//   })
// }

// function get_channel(deviceId){
//   return new Promise(function(resolve, reject){
//     let sql = `SELECT * FROM channels WHERE device_id = '${deviceId}'`
//     dbConn.query(sql,function(err,rows)     {
//       if(err) {
//         reject(err)
//       } else {
//         resolve(rows)
//       }
//     });
//   })
// }

// function update_channel(channelData){
//   return new Promise(function(resolve, reject){
//     let sql = `UPDATE channels SET status = '{"on": ${channelData.status}}' WHERE id = "${channelData.channelId}";`
//     console.log("update_channel", sql);
//     dbConn.query(sql,function(err,rows)     {
//       if(err) {
//         reject(err)
//       } else {
//         resolve(rows)
//       }
//     });
//   })
// }

// io.on("connection", (socket) => {
//   let devices = []
//   console.log('a user connected',socket.id);
//   socket.on("home_devices", async(homeId) => { 
//     console.log("recieve");
//     await get_device(homeId.replaceAll("-",""))
//       .then((res)=>{
//         devices = res
//       })
//       .catch((err)=>{
//           throw err
//       })
//     socket.emit("home_devices", devices)
//   });

//   socket.on("channel", async(homeId, data) => { 
//     console.log("recieve", homeId, data);
//     await update_channel(JSON.parse(data))
//       .then(async (res) => {
//         console.log("res", res);
//         await get_device(homeId.replaceAll("-",""))
//           .then((res)=>{
//             devices = res
//           })
//           .catch((err)=>{
//               throw err
//           })
//         socket.emit("home_devices", devices)
//       })
//     // await get_device(homeId.replaceAll("-",""))
//     //   .then((res)=>{
//     //     devices = res
//     //   })
//     //   .catch((err)=>{
//     //       throw err
//     //   })
//     // socket.emit("home_devices", devices)
//   });
// });

// server.listen(8001);

// console.log(`Server listening on port ${8001}`);








require('dotenv').config()
const express = require('express');
const app = express();
const http = require('http');
const httpServer = http.createServer(app);
const { Server } = require("socket.io");
const mysql = require('mysql');
// var mysql = require('mysql');
var dbConn = require('./db')
const PORT = process.env.PORT || 8001
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

// function get_home_device(homeId){
//   let devices = []
//   devices = get_device(homeId);
//   console.log("Get home device", devices);
//   return devices;
// }

function get_device(homeId){
  let resp_data = []
  return new Promise(function(resolve, reject){
    let sql = `SELECT * FROM devices WHERE home_id = '${homeId.replaceAll("-","")}'`
    dbConn.query(sql, async function(err,rows)     {
      if(err) {
        reject(err)
      } else {
        var res_device = []
        for (let index = 0; index < rows.length; index++) {
          const element = rows[index];
          var device_channel = []
          await get_channel(element.id)
            .then((channel)=>{
              channel?.map((channel) => {
                device_channel.push(channel)
              })
            })
            .catch((err)=>{
                throw err
            })
          
          res_device = res_device.concat(device_channel)
        }
        resolve(res_device);
      }
    });
  })
}

function get_channel(deviceId){
  return new Promise(function(resolve, reject){
    let sql = `SELECT * FROM channels WHERE device_id = '${deviceId}'`
    dbConn.query(sql,function(err,rows)     {
      if(err) {
        reject(err)
      } else {
        resolve(rows)
      }
    });
  })
}

function update_channel(channelData){
  return new Promise(function(resolve, reject){
    let sql = `UPDATE channels SET status = '{"on": ${channelData.status}}' WHERE id = "${channelData.channelId}";`
    console.log("update_channel", sql);
    dbConn.query(sql,function(err,rows)     {
      if(err) {
        reject(err)
      } else {
        resolve(rows)
      }
    });
  })
}

io.on("connection", (socket) => {
  let devices = []
  console.log('a user connected',socket.id);
  socket.on("home_devices", async(homeId) => { 
    console.log("[homeId]", homeId);
    await get_device(homeId.replaceAll("-",""))
      .then((res)=>{
        devices = res
      })
      .catch((err)=>{
          throw err
      })
    socket.emit("home_devices", devices)
  });

  socket.on("channel", async(homeId, data) => { 
    console.log("recieve", homeId, data);
    await update_channel(JSON.parse(data))
      .then(async (res) => {
        console.log("res", res);
        await get_device(homeId.replaceAll("-",""))
          .then((res)=>{
            devices = res
          })
          .catch((err)=>{
              throw err
          })
        io.emit("home_devices", devices)
      })
    // await get_device(homeId.replaceAll("-",""))
    //   .then((res)=>{
    //     devices = res
    //   })
    //   .catch((err)=>{
    //       throw err
    //   })
    // socket.emit("home_devices", devices)
  });
});


httpServer.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});