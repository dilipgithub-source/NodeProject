const AWS = require("aws-sdk");
AWS.config.update({region: process.env.Region});
const util = require("util");
const environ = process.env.Environment;

let endpoint = null
if (environ == 'LOCAL') {
  endpoint = `http://${process.env.LOCALSTACK_HOST}:4576`
  console.log(endpoint)
}

const sqs = new AWS.SQS({apiVersion: '2012-11-05', endpoint});


/**
 *
 * @param {Object} params
 */
async function sendMessage(params) {
  console.log("In sendMessage");
  const promisedSQS = util.promisify(sqs.sendMessage.bind(sqs));
  const result = await promisedSQS(params);
  console.log("result");
  return result;
}


module.exports.sendMessage = sendMessage;
