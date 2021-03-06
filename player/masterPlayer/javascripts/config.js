﻿/// <reference path="_references.js" />
"use strict";

//Global config
//=============
var CONFIG = {
	hostname: '',
	//nodeUrl: 'http://localhost'
	nodeUrl: 'http://remomusic.herokuapp.com',
	devmode: true,
	fileSystemMaxStorage: 200 * 1024 * 1024
};

var masterPlayer = {};

//Custom Options
//==============

//File System
window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;

//Audio Context
window.audioContext = window.webkitAudioContext || window.AudioContext;

//Helpers  (///TODO: put helpers in another file)
//=======

//To Array Helper
window.toArray = function(list){return Array.prototype.slice.call(list || [], 0);};

//Reset saved user info
window.resetUserInfo = function(){
	savedUserInfo.set('playlist.entries', null);
	savedUserInfo.set('playlist.play', null);
	savedUserInfo.set('playlist.volume', null);
};

//Local Storage
var savedUserInfo = {
	//Get saved info as OBJECT
	get: function(Item, callback) {
		if(typeof chrome != 'undefined' && chrome.storage) {
			chrome.storage.local.get(Item, function(result){ 
				//Callback
				if(typeof callback == 'function') callback.call(this, result[Item]);
			});
		} else {
			var result = localStorage.getItem(Item) ? $.parseJSON(localStorage.getItem(Item)) : null;
			
			//Callback
			if(typeof callback == 'function') callback.call(this, result);
		}
	},

	//Save info in OBJECT
	set: function(Item, Info, callback){
		var obj = {};
		obj[Item] = Info;

		if(typeof chrome != 'undefined' && chrome.storage) {
			chrome.storage.local.set(obj, function(result){
				
				//Callback
				if(typeof callback == 'function') callback.call(this, result);
			});
		} else {
			//Remove item
			if(Info === null) {
				var result = localStorage.removeItem(Item);
			} 

			//Update item
			else {
				var result = localStorage.setItem(Item, stringify(Info));
			}
			
			//Callback
			if(typeof callback == 'function') callback.call(this, result);
		}

		return obj;
	}
};


//Load resources
//==============

//Tests
yepnope.tests = {
	windowsApp: function(){ return typeof Windows != 'undefined'; },
	chromeApp: function(){ return typeof chrome != 'undefined' && typeof chrome.app.runtime != 'undefined'; },
	webApp: function(){ return (!this.windowsApp() && !this.chromeApp()); },
	fullScreen: function(){ return document.documentElement.webkitRequestFullScreen || document.documentElement.mozRequestFullScreen || document.documentElement.requestFullScreen; },
	fileReader: function(){ return window.File && window.FileReader && window.FileList && window.Blob; },
	online: function(){ return navigator.onLine; },
	localhost: function() { return window.location.hostname == 'localhost'; },
	
	//Tests for chrome apps
	chrome: {
		restorable: function(){return typeof chrome.fileSystem.isRestorable != 'undefined';}
	}
};

//jQuery UI core, if use
var jQueryUiCore = [
	'/masterPlayer/javascripts/vendor/jquery.ui.core.js',
	'/masterPlayer/javascripts/vendor/jquery.ui.widget.js',
	'/masterPlayer/javascripts/vendor/jquery.ui.mouse.js'
];

//Mandatory
yepnope({
	load: [
		'/masterPlayer/javascripts/vendor/stringify.js',
		'/masterPlayer/javascripts/vendor/jquery.js',
		'/masterPlayer/javascripts/vendor/jquery.jplayer.js',
		'/masterPlayer/javascripts/vendor/jplayer.playlist.js'
	]
});

//Core
yepnope({
	load: '/masterPlayer/javascripts/masterPlayer.js',
	callback: function(){
		//Init player
		masterPlayer.playerInit();

		//Is a app for Google?
		yepnope({
			test: yepnope.tests.chromeApp(),
			yep: {
				chromeApp: '/masterPlayer/javascripts/chromeApp.js'
			},
			callback: {
				chromeApp: function(){
					masterPlayer.chromeAppInit();
				}
			}
		});

		//Is a Windows app?
		yepnope({
			test: yepnope.tests.windowsApp(),
			yep: {
				windowsApp: '/masterPlayer/javascripts/windowsApp.js'
			},
			callback: {
				windowsApp: function(){
					masterPlayer.windowsAppInit();
				}
			}
		});

		//Is web app?
		yepnope({
			test: yepnope.tests.webApp(),
			yep: {
				windowsApp: '/masterPlayer/javascripts/webApp.js'
			},
			callback: {
				windowsApp: function(){
					masterPlayer.webAppInit();
				}
			}
		});

		//Have FileReader?
		yepnope({
			test: yepnope.tests.fileReader(),
			yep: {
				jdataview: '/masterPlayer/javascripts/vendor/jdataview.js'
			},
			callback: {
				jdataview: function(){
					masterPlayer.fileReaderInit();
				}
			}
		});

		//Have AudioContext?
		yepnope({
			test: window.AudioContext || window.webkitAudioContext,
			yep: jQueryUiCore,
			complete: function(){
				yepnope({load: [
					'/masterPlayer/javascripts/vendor/jquery.ui.slider.js',
					'/masterPlayer/javascripts/equalizer.js'
				]});
			}
		});

		//Have connection and not a localhost AND not a Windows APP?
		yepnope({
			test: yepnope.tests.online() && !yepnope.tests.localhost() && !yepnope.tests.windowsApp() && !yepnope.tests.chromeApp(),
			yep: {
				analytics: '/masterPlayer/javascripts/analytics.js'
			},
			nope: {
				analytics: '/masterPlayer/javascripts/analytics.offline.js'
			}
		});
	}
});

//Have connection?
yepnope({
	test: yepnope.tests.online() && !yepnope.tests.windowsApp(),
	yep: {
		socket: '/masterPlayer/javascripts/vendor/socket.io.js',
		qrcodecore: '/masterPlayer/javascripts/vendor/qrcode.js',
		jqueryqrcode: '/masterPlayer/javascripts/vendor/jquery.qrcode.js'
	},
	callback: {
		socket: function(){
			masterPlayer.socketInit();
		},
		jqueryqrcode: function(){
			masterPlayer.qrCodeInit();
		}
	}
});

//Windows App Initial Binds
if(yepnope.tests.windowsApp()) {
	var mediaControls;
	mediaControls = Windows.Media.MediaControl;

	//Start Application
	WinJS.Application.start();

	//On open application
	WinJS.Application.addEventListener("activated", function (e) {
		var PID = setInterval(function(){
			if(typeof masterPlayer.windowsApp != 'undefined') {
				masterPlayer.windowsApp.activated(e);
				clearInterval(PID);
			}
		}, 100);

		WinJS.Application.start();
	}, false);
}