require('dotenv').config()
const express = require('express');
const app = express();
const http = require('http');
const httpServer = http.createServer(app);
const socketio = require('socket.io');
const { Server } = require("socket.io");
var dbConn = require('./db')
const PORT = process.env.PORT || 8000
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

// var io = require('socket.io-client');
// var socketClient = io.connect(`http://localhost:${PORT}`, {reconnect: true});


// // Add a connect listener
// socketClient.on('connect', function(socket) {
//   console.log('Connected!');
// });

// socket.emit('CH01', 'me', 'test msg');

// Check for changes every second

function groupByDevice(arr){
  return arr.reduce((result, currentItem) => {
    (result[currentItem.device_id] = result[currentItem.device_id] || []).push(currentItem);
    return result;
  }, {});
}

function getNonMatchingIndices(arr1, arr2) {
  let nonMatchingIndices = [];

  for(let i = 0; i < arr1.length; i++) {
      // Convert objects to string for comparison
      if(JSON.stringify(arr1[i]) !== JSON.stringify(arr2[i])) {
          nonMatchingIndices.push(arr1[i]);
      }
  }

  prev_results = arr2

  return nonMatchingIndices;
}

function get_device_home(deviceId) {
  console.log("Retrieving Device Home:", deviceId);
  return new Promise(function(resolve, reject){
    let sql = `SELECT * FROM devices WHERE id = '${deviceId.replaceAll("-","")}'`
    console.log("[sql]", sql)
    dbConn.query(sql, async function(err,rows)     {
      if(err) {
        console.log("[device home][err]",err);
        reject(err)
      } else {
        console.log("[rows]", rows);
        // var res_device = []
        // // console.log("[rows]", rows);
        // for (let index = 0; index < rows.length; index++) {
        //   const element = rows[index];
        //   var device_channel = []
        //   await get_channel(element.id)
        //     .then((channel)=>{
        //       channel?.map((channel) => {
        //         device_channel.push(channel)
        //       })
        //     })
        //     .catch((err)=>{
        //         throw err
        //     })
          
        //   res_device = res_device.concat(device_channel)
        // }
        resolve(rows[0]);
      }
    });
  })
}


function get_device(homeId){
  let resp_data = []
  // console.log("[homeId]", homeId);
  return new Promise(function(resolve, reject){
    let sql = `SELECT * FROM devices WHERE home_id = '${homeId}'`
    // console.log("[[sql]]", sql, homeId)
    dbConn.query(sql, async function(err,rows)     {
      if(err) {
        reject(err)
      } else {
        var res_device = []
        // console.log("[rows]", rows);
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
    dbConn.query(sql,function(err,rows) {
      if(err) {
        console.log("[Error][Channel][Update]", err)
        reject(err)
      } else {
        console.log("[Success][Channel][Update]", channelData, rows)
        resolve(rows)
      }
    });
  })
}

io.on("connection", (socket) => {
  let devices = []
  var prev_results = [];


  function listenDevice() {
    try {
      dbConn.query('SELECT * FROM channels', function async (err, result) {
        
        io.emit('message', 'Hello, everyone!');
        if (err) throw err;
        if (JSON.stringify(prev_results) !== JSON.stringify(result)) {
            // io.emit("home_devices", devices)
          // prev_results = result;
          let comp_result = getNonMatchingIndices(prev_results, result)
          let grp_device = groupByDevice(comp_result)
          console.log("[updated index]", grp_device);
          Object.keys(grp_device).map( async (deviceId) => {
            let temp_device = await get_device_home(deviceId);
            console.log("[temp devices]", temp_device, temp_device.home_id);
            await get_device(temp_device?.home_id)
              .then((res)=>{
                devices = res
              })
              .catch((err)=>{
                  throw err
              })
            io.emit("home_devices", devices)
            
  
          })
          prev_results = result
        }
  
      });
    }
    catch(err) {
      console.log("[device][error]", err);
    }
  }
  
  setInterval(listenDevice, 5000);

  

  socket.on("test", async function(data) {
    console.log("[test]", data);
  });

  socket.on("disconnect", ()=>{
  })

  socket.on("home_devices", async(homeId) => { 
    // console.log("[homeId]", homeId);
    if(homeId){
      await get_device(homeId)
        .then((res)=>{
          console.log("[devices latest]", res);
          devices = res
        })
        .catch((err)=>{
            throw err
        })

      console.log("[err][devices]", devices);
      socket.emit("home_devices", devices)
    }
  });

  socket.on("channel", async(homeId, data) => { 
    // console.log("recieve", homeId, data);
    await update_channel(JSON.parse(data))
      .then(async (res) => {
        // console.log("res", res);
        await get_device(homeId.replaceAll("-",""))
          .then((res)=>{
            devices = res
          })
          .catch((err)=>{
              throw err
          })
        io.emit("home_devices", devices)
      })
  });
});


httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`listening on *:${PORT}`);
});