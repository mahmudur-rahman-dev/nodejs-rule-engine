const io = require("socket.io-client");
const Constants = require('../constants/backend_url');
var colors = require('colors/safe');

const socket_init = function(channel) {
    let socket = io.connect(
        Constants.socketURL, {
            query: 'username=' + channel
        }
    );
    socket.on("connect", () => {
        console.log(colors.magenta("Connected to the channel : ", channel));
    });
    return socket;
}

const socketSyncInit = async function(channel) {
    let socket = io.connect(
        Constants.socketURL, {
            query: 'username=' + channel
        }
    );
    await new Promise((resolve, reject) => {
        socket.on("connect", () => {
            console.log(colors.magenta("Connected to the channel : ", channel));
            resolve();
        });
    });
    return socket;
}

const destroySocket = function(socket) {
    try
    {
        socket.destroy();
        console.log("Socket instance has been destroyed.");
    }
    catch(e)
    {
        console.log("Can't destroy socket!!");
        console.log(e);
    }
}

module.exports.socket_init = socket_init;
module.exports.socketSyncInit = socketSyncInit;
module.exports.destroySocket = destroySocket;