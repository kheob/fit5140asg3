var express = require('express');
var app = express();

// reference: https://github.com/kelly/node-i2c
var i2c = require("i2c");

// reference: https://github.com/extrabacon/python-shell
var pythonShell = require("python-shell");

// reference: https://github.com/mcollina/mosca
var mosca = require("mosca");

// reference: https://www.npmjs.com/package/apn
var apn = require("apn");

// reference: https://www.npmjs.com/package/request
var request = require("request");

var address = 0x13;
var version = 0x20;
var proxSensor = new i2c(address, {device: '/dev/i2c-1'});

// constant value, for checking the status of the mailbox
let PROX_EMPTY_MAX = 2229;
let PROX_HALF_MIN = 2265;
let PROX_FULL_MIN = 3000;
var oldProxVal = 2220;
var newProxVal = 2221;

// scenarios for the status of mailbox, change from first statuse to second.
let EMPTY_LESSHALF = 0;
let EMPTY_MOREHALF = 1;
let EMPTY_FULL = 2;
let LESSHALF_EMPTY = 3;
let LESSHALF_MOREHALF = 4;
let LESSHALF_FULL = 5;
let MOREHALF_LESSHALF = 6;
let MOREHALF_FULL = 7;
let MOREHALF_EMPTY = 8;
let FULL_MOREHALF = 9;
let FULL_LESSHALF = 10;
let FULL_EMPTY = 11;

// Apple Push Notification settings
var service = new apn.Provider({
    cert: 'certs/YGMCert.pem',
    key: 'certs/YGMKey.pem'
});

// Function that sends the message
var send = function(status) {
    // get the deviceID from the Server's JSON object
    request({
	url: "http://144.138.51.105:3000/devices",
	json: true
    }, function (error, response, body) {
	if (!error && response.statusCode === 200) {
	    // get all deviceID from the JSON object and save it into arraylist
	    // List of all device IDs
            var deviceIDs = [];
	    // get all deviceID from every JSON array
	    for (var i = 0; i < body['devices'].length; i++) {
		deviceIDs.push(body['devices'][i]['deviceID']);
	    }
	    // construct the message for the notification
	    var msg = ""
	    switch(status) {
		case 0: msg = "Your mailbox status is changed from Empty to Less than half filled."; console.log(0); break;
		case 1: msg = "Your mailbox status is changed from Empty to More than half filled."; console.log(1); break;
		case 2: msg = "Your mailbox status is changed from Empty to Full."; console.log(2); break;
		case 3: msg = "Your mailbox status is changed from Less than half filled to empty."; console.log(3); break;
		case 4: msg = "Your mailbox status is changed from Less than half filled to More than half filled."; console.log(4); break;
		case 5: msg = "Your mailbox status is changed from Less than half filled to Full."; console.log(5); break;
		case 6: msg = "Your mailbox status is changed from More than half filled to Less than half filled."; console.log(6); break;
		case 7: msg = "Your mailbox status is changed from More than half filled to Full."; console.log(7); break;
		case 8: msg = "Your mailbox status is changed from More than half filled to Empty."; console.log(8); break;
		case 9: msg = "Your mailbox status is changed from Full to More than half filled."; console.log(9); break;
		case 10: msg = "Your mailbox status is changed from Full to Less than half filled."; console.log(10); break;
		case 11: msg = "Your mailbox status is changed from Full to Empty."; console.log(11); break;
	    }

	    var notification = new apn.Notification();
            notification.alert = msg;

            // Send the notifcation to all the user's devices
            service.send(notification, deviceIDs).then( result => {
        	console.log("sent:", result.sent.length);
        	console.log("failed:", result.failed.length);
        	console.log(result.failed);
            });
	} else {
	    // display fail message if server can't be connected.
	    console.log("Fail to retrieve deviceID from Server.");
	}
    });
};

// MQTT settings
var mqtt = new mosca.Server({
    port: 1883
});

// Run setup if we can retreive correct sensor version for VCNL4010 sensor
// reference: https://github.com/adafruit/Adafruit_VCNL4010
proxSensor.writeByte(0x80|0x81, function(err){});
proxSensor.readByte(function(err, res) {
    if((res & 0xF0) == version) {
        console.log("Connected");
	// run the setup for the sensor
	setup();
    } else {
	console.log(err);
    }
});

// setup the sensor and read the data
function setup() {
    // run the python script for initialise the Proximity Sensor
    // Python script reference: https://github.com/ControlEverythingCommunity/VCNL4010
    pythonShell.run('VCNL4010.py', function(err) {
	if (err) throw errr;
	console.log('Sensor is initialised.');
    });

    // Enable register
    //proxSensor.writeByte(0x89|0x08, function(err){console.log(err);});
    //proxSensor.writeByte(0x80|0xFF, function(err){console.log(err);});

    //proxSensor.writeByte(0x82|0x00, function(err){console.log(err);});

    //proxSensor.writeByte(0x80|0x85, function(err){console.log(err);});

    // set interval for getting the data for every second, and push notification if mailbox status is changed
    setInterval(function() {
	// for comparison on the old and new proximity value
        oldProxVal = newProxVal;
	proxSensor.writeByte(0x80|0x85, function(err){console.log(err);});
	proxSensor.read(4, function(err, res){
	    newProxVal = res[2] * 256 + res[3];
	    console.log(newProxVal);
	    // if statements for checking the status change of mailbox
	    if (oldProxVal <= PROX_EMPTY_MAX) {
		if ((newProxVal > PROX_EMPTY_MAX) && (newProxVal < PROX_HALF_MIN)) {send(EMPTY_LESSHALF);}
		else if ((newProxVal >= PROX_HALF_MIN) && (newProxVal < PROX_FULL_MIN)) {send(EMPTY_MOREHALF);}
		else if (newProxVal >= PROX_FULL_MIN) {send(EMPTY_FULL);}
	    } else if ((oldProxVal > PROX_EMPTY_MAX) && (oldProxVal < PROX_HALF_MIN)) {
		if (newProxVal <= PROX_EMPTY_MAX) {send(LESSHALF_EMPTY);}
		else if ((newProxVal >= PROX_HALF_MIN) && (newProxVal < PROX_FULL_MIN)) {send(LESSHALF_MOREHALF);}
		else if (newProxVal >= PROX_FULL_MIN) {send(LESSHALF_FULL);}
	    } else if ((oldProxVal >= PROX_HALF_MIN) && (oldProxVal < PROX_FULL_MIN)) {
		if ((newProxVal > PROX_EMPTY_MAX) && (newProxVal < PROX_HALF_MIN)) {send(MOREHALF_LESSHALF);}
		else if (newProxVal >= PROX_FULL_MIN) {send(MOREHALF_FULL);}
		else if (newProxVal <= PROX_EMPTY_MAX) {send(MOREHALF_EMPTY);}
	    } else if (oldProxVal >= PROX_FULL_MIN) {
		if ((newProxVal >= PROX_HALF_MIN) && (newProxVal < PROX_FULL_MIN)) {send(FULL_MOREHALF);}
		else if ((newProxVal < PROX_HALF_MIN) && (newProxVal > PROX_EMPTY_MAX)) {send(FULL_LESSHALF);}
		else if (newProxVal <= PROX_EMPTY_MAX) {send(FULL_EMPTY);}
	    } 
	});
	
	//var message = {
	//    topic: '/mailbox',
	//    payload: "empty",
	//    qos: 0,
	//    retain: false
	//};
	//mqtt.publish(message, function(){});
	//res[2] * 256 + res[3]
    }, 1000);    
}