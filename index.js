require('dotenv').config()
const express = require('express');
const app = express();
const http = require('http');
const httpServer = http.createServer(app);
const socketio = require('socket.io');
const { Server } = require("socket.io");
var dbConn = require('./db');
const PORT = process.env.PORT || 8000
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

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
  return new Promise(function(resolve, reject){
    let sql = `SELECT * FROM devices WHERE id = '${deviceId.replaceAll("-","")}'`
    dbConn.query(sql, async function(err,rows)     {
      if(err) {
        reject(err)
      } else {
        resolve(rows[0]);
      }
    });
  })
}


function get_device(homeId){
  return new Promise(function(resolve, reject){
    let sql = `SELECT * FROM devices WHERE home_id = '${homeId}'`
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
                let now = new Date();
                if(Math.abs(now.getTime() - element['updated_at'].getTime()) / (1000 * 60) > 60){
                  channel['device_status'] = 0
                }else {
                  channel['device_status'] = 1
                }
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
        reject(err)
      } else {
        resolve(rows)
      }
    });
  })
}


var prev_results = [];

io.on("connection", (socket) => {
  let devices = []

  function listenDevice() {
    console.log(`[${new Date().getMinutes() + ':' + new Date().getSeconds()}][Info] listedDevice`);
    try {
      dbConn.query('SELECT * FROM channels', function async (err, result) {
        if (err) throw err;
        if (JSON.stringify(prev_results) != JSON.stringify(result)) {
          let comp_result = getNonMatchingIndices(prev_results, result)
          let grp_device = groupByDevice(comp_result)
          Object.keys(grp_device).map( async (deviceId) => {
            let temp_device = await get_device_home(deviceId);
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
    }
  }
  
  setInterval(()=>listenDevice(), 5000);

  socket.on("disconnect", ()=>{
  })

  socket.on("home_devices", async(homeId) => { 
    if(homeId){
      console.log(`[${new Date().getMinutes() + ':' + new Date().getSeconds()}][Info] home_devices : ${homeId}`);
      await get_device(homeId)
        .then((res)=>{
          devices = res
        })
        .catch((err)=>{
            throw err
        })
      socket.emit("home_devices", devices)
    }
  });

  socket.on("channel", async(homeId, data) => {
    console.log(`[${new Date().getMinutes() + ':' + new Date().getSeconds()}][Info] update_channel`);
    await update_channel(JSON.parse(data))
      .then(async (res) => {
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