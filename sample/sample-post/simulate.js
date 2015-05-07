var fs   = require("fs");
var http = require("http");

function PostFileToServer(sFileName, data, callback) {
    var boundary = "NODEJSPOSTFILE-" + (Math.random() * 9007199254740992).toString(36);

    var sHeader = "--" + boundary + "\r\n";
    sHeader += "Content-Disposition: form-data; name=\"fileName\"; filename=\"" + sFileName + "\"\r\n";
    sHeader += "Content-Type: application/octet-stream\r\n\r\n";

    var sEndData = "\r\n--" + boundary + "--\r\n\r\n";

    var options = {
        hostname: "127.0.0.1",
        port    : 8080,
        path    : "/cgi-bin/fileupload.js?action=uploadFile&newname=my.jpg",
        method  : 'POST'
    };

    var httpreq = http.request(options, function (httpres) {
        httpres.on('data', function (dataResponse) {
            console.log(dataResponse.toString());
            
            return ;
            var response = JSON.parse(dataResponse);
            console.log(response.md5);
            console.log(response.name);
        });
    });
    httpreq.setHeader('Content-Type',   'multipart/form-data; boundary=' + boundary + '');
    httpreq.setHeader('Content-Length', Buffer.byteLength(sHeader) + data.length + Buffer.byteLength(sEndData));

    httpreq.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        callback(e);
        return;
    });

    httpreq.write(sHeader);
    httpreq.write(data);
    httpreq.write(sEndData);
    httpreq.end();
}

fs.readFile('1.jpg', function (err, data) {
    if (err) throw err;
    console.log(data.length);
  
    PostFileToServer("1.jpg", data, function(){
        console.log("call back");    
    });
});
