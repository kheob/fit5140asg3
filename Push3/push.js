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





/**
 * Handles push notification functionality.
 * Uses: https://github.com/node-apn/node-apn
 *
 * Created by BaiChanKheo on 2/11/2016.
 */
'use strict';

var apn = require('apn');

var service = new apn.Provider({
    cert: 'certs/YGMCert.pem',
    key: 'certs/YGMKey.pem'
});

// Get all devices and send a PN to each
var Device = require('../models/device');

// Function that sends the message
var send = function() {
    Device.find({}, function(err, devices) {
        if (err) {
            return res.status(500).json({message: err.message});
        }

        // List of all device IDs
        var deviceIDs = [];

        devices.forEach(function(device) {
            deviceIDs.push(device.deviceID);
        });

        var notification = new apn.Notification();
        notification.alert = "Looks like you've got a new delivery!";

        // Send the notifcation to all the user's devices
        service.send(notification, deviceIDs).then( result => {
            console.log("sent:", result.sent.length);
            console.log("failed:", result.failed.length);
            console.log(result.failed);
        });
    });
};

module.exports.send = send;