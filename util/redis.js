const redis = require('redis');
const config = require('../config/config')

console.log(config.storage.redisHost)

const publisher = redis.createClient({
    port: config.storage.redisPort,
    host: config.storage.redisHost,
    auth_pass: config.storage.redisPassword 
});

function publishToChannels(msg, channels){
    channels.forEach((channel) => {
        msg.publishedChannelName = channel;
        publisher.publish(channel, JSON.stringify(JSON.stringify(msg)), (err) => {
            if(err) {
                console.log("Failed to connect with redis!");
                throw err;
            }
            console.log("Published message: ", JSON.stringify(msg));
            console.log("Channel name: ", channel);
        });
    })
}

module.exports = {publishToChannels};