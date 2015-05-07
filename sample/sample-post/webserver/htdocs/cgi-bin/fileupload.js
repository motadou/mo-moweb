/***
 ** 处理浏览器或者客户端通过HTTP-POST方式上传文件的程序
 **
 ** Anchor : motadou@126.com
 ** Blog   : motadou.cnblogs.com
 ** Date   ：2015-03-08
 ***/

var formidable  = require('formidable');
var fs          = require('fs');
var url         = require('url');
var path        = require('path');

var handle = {};
handle.processRequest = function (req, res) {

    var form = new formidable.IncomingForm();

    form.uploadDir = './upload';

    form.parse(req, function(err, fields, files) {
        if (err) {
            var msg = {
                "code": -1,
                "msg" : "IncomingForm Parse Error"
            };
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(msg));
            return ;
        }

        fs.renameSync(files.fileName.path, "./upload/" + (new Date()).getTime() + path.extname(files.fileName.name));

        var msg = { "code": 2, "msg" : "success" };
        res.writeHead(200, { "Content-Type": "text/html" });

        res.write(JSON.stringify(msg));
        res.end();
    });
}

module.exports = handle;
