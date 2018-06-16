var http = require("https");
var csvWriter = require('csv-write-stream');
var fs = require('fs');
//var HttpsProxyAgent = require('https-proxy-agent');
//var agent = new HttpsProxyAgent('http://proxy:8080');

const sleepTime = 3000;
const authToken = '';
const usersPath = "/api/v1/users.json";
const followingPath = "/api/v1/users/following/";

var options = {
  "method": "GET",
  "hostname": "www.yammer.com",
  "port": null,
  "path": "/api/v1/users.json",
  "headers": {
    "authorization": "Bearer "+authToken,
    "cache-control": "no-cache"
  },
    //"agent":agent,
  "followRedirect": true
};

var writer = csvWriter();
writer.pipe(fs.createWriteStream('user.csv'));

var followingWriter = csvWriter();
followingWriter.pipe(fs.createWriteStream('following.csv'));


getUsers((users) => {

    for(var i=0, user; user = users[i]; i++) {
	writer.write(user);
    }    
},
	 (allUsers) =>  {
	     dispatchGetFollowings(allUsers, (allFollowings)=>{
		 
		 allFollowings.forEach((following)=>{
		     followingWriter.write(following);
		 });
		 
	     });
	 });

async function dispatchGetFollowings(allUsers, cb){
    for (var i=0, user; user = allUsers[i]; i++){
	await getFollowings(user, (followings)=>{},
			    (allFollowings)=>{
				cb(allFollowings);
			    });
	await sleep(sleepTime);
    }
}

async function getFollowings(user, pageCb, cb){

    var iPage = 0;
    var followings = []; 
    var path = followingPath + user.id + '.json';
    
    do{
	options.path = iPage > 0?path + "?page=" + iPage:path;
	++iPage;
	
	var retFollowings = [];
	console.log(options.path);

	var result = await makeFollowingRequest(options, user);		
	retFollowings = retFollowings.concat(result.followings);
	
	pageCb(retFollowings);
	
	followings =  followings.concat(retFollowings);

	if(retFollowings.length)
	    await sleep(sleepTime);
	
    }while(result.moreAvailable);

    cb(followings);

}

async function getUsers(pageCb, cb){

    var iPage = 0;
    var users = []; 
    options.path = usersPath;

    do{
	options.path = iPage > 0?usersPath + "?page=" + iPage:options.path;
	++iPage;
       
	var retUsers = [];
	console.log(options.path);
	
	retUsers = retUsers.concat(await makeUsersRequest(options));
	pageCb(retUsers);
	
	users =  users.concat(retUsers);

	await sleep(sleepTime);
	
    }while(retUsers.length > 0);

    cb(users);
    
}

function makeFollowingRequest(options, user){

    return new Promise(resolve => {
	var followings = [];
	http.request(options, function (res) {
    	    var chunks = [];
    	    res.on("data", function (chunk) {
    		chunks.push(chunk);
    	    });

    	    res.on("end", function () {
    		var body = Buffer.concat(chunks);
		var d  = JSON.parse(body.toString());
		var more = d.more_available;

		if(d.users){
 		    d.users.forEach(function(item){
			followings.push({'id' : user.id, 'followerId' : item.id  });
			//console.log({'id' : userId,'followerId' : item.id  });
		    });
		}

		
		resolve({moreAvailable: more, followings: followings});
		
    	    });
	}).end();
    });
}

function makeUsersRequest(options) {

    return new Promise(resolve => {
	var users = [];
	http.request(options, function (res) {
	    //console.log(options);
    	    var chunks = [];
    	    res.on("data", function (chunk) {
    		chunks.push(chunk);
    	    });

    	    res.on("end", function () {
    		var body = Buffer.concat(chunks);
		var d  = JSON.parse(body.toString());
		d = d.messages?d.messages:d;
		var dLen = d.length;
		

		for(idx=0; idx<dLen; idx++)
		{
		    users.push( {
			id: d[idx].id,
			network_id: d[idx].id,
			full_name: d[idx].full_name,
			activated_at: d[idx].activated_at,
			first_name: d[idx].first_name,
			last_name: d[idx].last_name,
			verified_admin: d[idx].verified_admin,
			department: d[idx].department,
			name: d[idx].name,
			email: d[idx].email
		    });
		}
		resolve(users);		
    	    });
	}).end();	
    })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
