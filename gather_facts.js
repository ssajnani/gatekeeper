var url     = require('url'),
    http    = require('http'),
    https   = require('https'),
    fs      = require('fs'),
    qs      = require('querystring'),
    express = require('express'),
    app     = express();
var workTitles = ['Projects', 'Education', 'Research', 'Youtube', 'Resume'];
var hobbyTitles = ['Twitter', 'Photography', 'Dance', 'Music', 'Blog'];

function loadConfig() {
    var config = JSON.parse(fs.readFileSync(__dirname+ '/config.json', 'utf-8'));
    for (var i in config) {
      config[i] = process.env[i.toUpperCase()] || config[i];
    }
    return config;
  }
var config = loadConfig();  

var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var getJSON = require('get-json');
var http = require('https');
var GITHUB_URL = "https://api.github.com/users/ssajnani/repos";
var GITHUB_EDUCATION_JSON = "https://raw.githubusercontent.com/ssajnani/ssajnani.github.io/master/education.json";
var GITHUB_RESUME_JSON = "https://raw.githubusercontent.com/ssajnani/ssajnani.github.io/master/resume.json";
var GITHUB_RESEARCH = "https://api.github.com/repos/ssajnani/ResearchPapers/contents/";
var GITHUB_RESEARCH_INFO = "https://raw.githubusercontent.com/ssajnani/ResearchPapers/master/readme.json";
var YOUTUBE_API = "https://www.googleapis.com/youtube/v3/search?";
var YOUTUBE_KEY = "key=" + config.youtube_api_key;
var YOUTUBE_CHANNEL_ID = "channelId=UCquU_YuZYEk-sMMyHPTBd0A";
var YOUTUBE_OPTIONS = "part=snippet,id&order=date&maxResults=20";
var INSTAGRAM = "https://www.instagram.com/graphql/query/?query_hash=472f257a40c653c64c666ce877d59d2b&variables={%22id%22:%22234498896%22,%22first%22:12,%22after%22:%22QVFDYTEtZ1FrUEJjSUwyY25qOFB3ZWUwUEVjdUZMSVNWMHFibG9OSWt0WER2VnNSYkxXMkFtVzZ4eXp0UllSTWFmNGFkNFgtZmh1eGRzS3N5aXptVlo2aw==%22}";
var RESUME_DETAILS = "";
var SPOTIFY_ID_KEY = "2c31d0d4d1aa40849dd5ee49becbd6d1:c9f891d2e2604a129f016ede0e04bb35";
var resume = "";


var gathered_info = {
    "projects": [],
    "education": [],
    "research_description": [],
    "research": [],
    "resume": [],
    "itVideos": [],
    "tweets": [],
    "instagram_pics": [],
    "spotify_playlists": []
}


// $.ajaxSetup({
//     async: false
// });

function gatherProjects(callback) {
    
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", GITHUB_URL, false ); 
    xmlHttp.send( null );
    var json = JSON.parse(xmlHttp.responseText);
    var xml_length = json.length;
    for (var i = 0; i < xml_length; i++){
        var desc = json[i].description;
        if (desc != null && desc.search("\(\(Project\)\)") != -1) {
            gathered_info.projects.push(json[i]);
        }
    }
    return callback();
}

function gatherEducationMilestones(callback){
    getJSON(GITHUB_EDUCATION_JSON, function(error, data ) {
        gathered_info.education = data;
        return callback();
     });
}

// var workTitles = ['Projects', 'Education', 'Research', 'Youtube', 'Resume'];
// var hobbyTitles = ['Twitter', 'Photography', 'Dance', 'Music', 'Blog'];

function gatherResearchPapers(callback){
    http.get({host: 'api.github.com', path: '/repos/ssajnani/ResearchPapers/contents/', headers: {'User-Agent': 'node.js'}}, function(res){
        var data = '';

        res.on('data', function(chunk){
            data += chunk;
        });

        res.on('end', function(){
            data = JSON.parse(data);
            gathered_info.research = data.filter(function(item){
                if (item.name != "readme.json"){
                    return item;
                }
            });
            getJSON(GITHUB_RESEARCH_INFO, function(error, data){
                gathered_info.research_description = data;
                return callback();
            })
          });
        
    });
}

function gatherITVideoInfo(callback){
    getJSON(YOUTUBE_API+"&"+YOUTUBE_KEY+"&"+YOUTUBE_CHANNEL_ID+"&"+YOUTUBE_OPTIONS, function(error, data){
        console.log(error);
        var result_arr = data.items;
        result_arr.pop();
        gathered_info.itVideos = result_arr;
        return callback();
    });
}
function getResume(callback){
    getJSON(GITHUB_RESUME_JSON, function(error,data) {
        gathered_info.resume = data;
        return callback();
     });
}





// function handleTweets(twts){
//     tweets = twts;
//     createOrbitsTwitter(sceneOrbits, scenePlanets, sceneDescriptions, firstSPos[0], -100, tweets, 0xffffff);
// }

function getInstagramInfo(callback){
  http.get(INSTAGRAM, function(res){
    var body = '';

    res.on('data', function(chunk){
        body += chunk;
    });

    res.on('end', function(){
      console.log(body)
        var fbResponse = JSON.parse(body);
        console.log("Got a response: ", fbResponse.picture);
    });
}).on('error', function(e){
      console.log("Got an error: ", e);
});
    getJSON(INSTAGRAM, function(error, data) {
        console.log("Instagram info");
        console.log(data)
        console.log(error)
        var edges = data.data.user.edge_owner_to_timeline_media.edges;
        var picLength = edges.length;
        for (var i = 0; i < picLength; i++){
            gathered_info.instagram_pics.push({"url": edges[i].node.display_url, "code":edges[i].node.shortcode, "desc": edges[i].node.edge_media_to_caption.edges[0].node.text});
        }
        return callback();
     });
}

var MyRequestsCompleted = (function() {
    var numRequestToComplete, requestsCompleted, callBacks, singleCallBack;

    return function(options) {
        if (!options) options = {};

        numRequestToComplete = options.numRequest || 0;
        requestsCompleted = options.requestsCompleted || 0;
        callBacks = [];
        var fireCallbacks = function() {
            for (var i = 0; i < callBacks.length; i++) callBacks[i]();
        };
        if (options.singleCallback) callBacks.push(options.singleCallback);

        this.addCallbackToQueue = function(isComplete, callback) {
            if (isComplete) requestsCompleted++;
            if (callback) callBacks.push(callback);
            if (requestsCompleted == numRequestToComplete) fireCallbacks();
        };
        this.requestComplete = function(isComplete) {
            if (isComplete) requestsCompleted++;
            if (requestsCompleted == numRequestToComplete) fireCallbacks();
        };
        this.setCallback = function(callback) {
            callBacks.push(callBack);
        };
    };
})();

function gatherMusic(spotify_info, callback){
        http.get({
            host: 'api.spotify.com', path: '/v1/users/samar.sajnani/playlists',
            headers: {
                'Authorization': "Bearer " + spotify_info.access_token
            },
            contentType: 'application/json; charset=utf-8'},
            function (res) {
                var data = '';

                res.on('data', function(chunk){
                    data += chunk;
                });

                res.on('end', function(){
                    data = JSON.parse(data);
                    gathered_info.spotify_playlists = data.items;
                    var spot_length = gathered_info.spotify_playlists.length;
                    var requestCallback = new MyRequestsCompleted({
                        numRequest: 4,
                        singleCallback: function(){
                            return callback();
                        }
                    });
                    
                    for (var i = 0; i < spot_length; i++){
                        (function(i){
                            http.get({
                                host: "api.spotify.com",
                                path: "/v1/playlists/" + gathered_info.spotify_playlists[i].id + '/tracks',
                                headers: {
                                    'Authorization': "Bearer " + spotify_info.access_token
                                },
                                contentType: 'application/json; charset=utf-8'},
                                function (res) {
                                    var data = '';

                                    res.on('data', function(chunk){
                                        data += chunk;
                                    });

                                    res.on('end', function(){
                                        data = JSON.parse(data);
                                        gathered_info.spotify_playlists[i]['track_info'] = data;
                                        requestCallback.requestComplete(true);
                                    })
                                });
                        })(i);
                    }
                });
            });
}

function ig_media_preview(base64data) {
	var jpegtpl = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsaGikdKUEmJkFCLy8vQkc/Pj4/R0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0cBHSkpNCY0PygoP0c/NT9HR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR//AABEIABQAKgMBIgACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/AA==",
		t = atob(base64data),
		p = t.slice(3).split(""),
		o = t.substring(0, 3).split("").map(function(e) {
			return e.charCodeAt(0)
		}),
		c = atob(jpegtpl).split("");
	c[162] = String.fromCharCode(o[1]);
	c[160] = String.fromCharCode(o[2]);
	return base64data ? "data:image/jpeg;base64," + btoa(c.concat(p).join("")) : null
};
      
// $(function(){
//     toDataUrl("https://instagram.fybz2-2.fna.fbcdn.net/vp/a10c2e7ea7c9df7e65ab601084fe1020/5D8DBF70/t51.2885-15/e35/14533460_223401458092722_4541944713137094656_n.jpg?_nc_ht=instagram.fybz2-2.fna.fbcdn.net", function(myBase64) {
//         var image = new Image();
//         image.src = myBase64
//         document.body.appendChild(image);
//     });
    
// });

function toDataUrl(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
        var reader = new FileReader();
        reader.onloadend = function() {
            callback(reader.result);
        }
        reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
}

// toDataUrl("https://instagram.fybz2-2.fna.fbcdn.net/vp/a10c2e7ea7c9df7e65ab601084fe1020/5D8DBF70/t51.2885-15/e35/14533460_223401458092722_4541944713137094656_n.jpg?_nc_ht=instagram.fybz2-2.fna.fbcdn.net", function(myBase64) {
//     console.log(myBase64); // myBase64 is the base64 string
// });

exports.getInfo = function(spotify_info, callback){
    gathered_info = {
        "projects": [],
        "education": [],
        "research_description": [],
        "research": [],
        "resume": [],
        "itVideos": [],
        "tweets": [],
        "instagram_pics": [],
        "spotify_playlists": []
    }
    var count = 0;
    gatherProjects(function(){
        count++;
        console.log('projects');
        if (count == 7){
            return callback(gathered_info);
        }
    });
    gatherEducationMilestones(function(){
        count++;
        console.log('education');
        if (count == 7){
            return callback(gathered_info);
        }
    });
    gatherResearchPapers(function(){
        count++;
        console.log('research');
        if (count == 7){
            return callback(gathered_info);
        }
    });
    gatherITVideoInfo(function(){
        count++;
        console.log('youtube');
        if (count == 7){
            return callback(gathered_info);
        }
    });
    getResume(function(){
        count++;
        console.log('resume');
        if (count == 7){
            return callback(gathered_info);
        }
    });

    getInstagramInfo(function(){
        count++;
        console.log('instagram');
        if (count == 7){
            return callback(gathered_info);
        }
    });
    gatherMusic(spotify_info, function(){
        count++;
        console.log('spotify');
        if (count == 7){
            return callback(gathered_info);
        }
    });
}
