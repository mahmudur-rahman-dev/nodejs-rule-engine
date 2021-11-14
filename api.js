const axios = require('axios');
const e = require('express');

/// PLease dont Uncomment this


async function asyncAxiosCall(url, body, socket) {
  console.log("Posting with body:",body,"URL:",url)

    const outputPromise = new Promise(function (accept, reject) {
      socket.on(body.channels[body.channels.length - 1], res => {
        let result = JSON.parse(JSON.parse(res));
        accept(result.data);
      });
    }).then(
      function (value) {
        return value;
      }
    ).catch(error => {
      console.log(error);
    });
    axios.post(url, body);
    const output = await outputPromise;
    return output;
}

function axiosCall(url, body) {
  console.log("Posting with body:",body,"URL:",url)
  return axios.post(url, body)
}

function axiosGetCall(url) {
  console.log("Posting with ","URL:",url)
  return axios.get(url)
}

module.exports = {
  asyncAxiosCall,
  axiosCall,
  axiosGetCall
};