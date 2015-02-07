/***
 ** A very simple webserver.
 **
 ** Anchor : motadou@126.com
 ** Blog   : motadou.github.io
 **
 ***/

var http = require('http');
var url  = require('url');
var fs   = require('fs');
var path = require('path');

//默认配置项
var config = {
    host	: '127.0.0.1',
	port	: 80,
	docroot	: './htdocs',
	filter 	: undefined
};

//主函数
function main() {
	var configFilePath = process.argv.length > 2?complete(process.argv[2]):"./config.json";

	fs.exists(configFilePath, function (exists) {
		if (exists) {
			var uconfig = require(configFilePath);
			config.host    = uconfig.host || config.host;
			config.port    = uconfig.port || config.port;
			config.docroot = complete(uconfig.docroot || config.docroot);
			config.filter  = uconfig.filter?require(complete(uconfig.filter)):undefined;
		}	

		//开始HTTP服务器
		http.createServer(processRequestRoute).listen(config.port, config.host);	

		console.log("mo-webserver has started.\n");
		console.log("listen at : [", config.host + ":" + config.port, "]");
		console.log("docroot   : [", config.docroot, "]");
	});
}

main();

//将相对路径转换成系统所用的绝对路径
function complete(sFilePath) {
	if (path.isAbsolute(sFilePath)) {
		return sFilePath;
	} else {
		return path.normalize(process.cwd() + "/" + sFilePath);
	}
}

//路由URL
function processRequestRoute(request, response) {
	request.remoteAddress = request.socket.remoteAddress;

    var pathname = url.parse(request.url).pathname;
    if (pathname === '/') {
        pathname = "/index.html";
    }
	if (config.filter && config.filter.path_url) {
		pathname = config.filter.path_url(pathname);
	}

	var localPath = config.docroot + pathname;

    var ext = path.extname(localPath);
 
    //禁止远程访问
    if (config.denyAccess && config.denyAccess.length > 0) {
        var islocal = false;
        var remoteAddress = request.connection.remoteAddress;
        for (var j = 0; j < config.localIPs.length; j++) {
            if (remoteAddress === config.localIPs[j]) {
                islocal = true;
                break;
            }
        }
        if (!islocal) {
            for (var i = 0; i < config.denyAccess.length; i++) {
                if (localPath === config.denyAccess[i]) {
                    response.writeHead(403, { 'Content-Type': 'text/plain' });
                    response.end('403:Deny access to this page');
                    return;
                }
            }
        }
    }

    //禁止访问后端js
	var staticRes = true;
    if (staticRes && localPath.indexOf(config.srcpath) >= 0) {
        response.writeHead(403, { 'Content-Type': 'text/plain' });
        response.end('403:Deny access to this page');
        return;
    }

    fs.exists(localPath, function (exists) {
        if (exists) {
            if (staticRes) {
                staticResHandler(request, response, localPath, ext); //静态资源
            } else {
                try {
                    var handler = require(localPath);
                    if (handler.processRequest && typeof handler.processRequest === 'function') {
                        handler.processRequest(request, response); //动态资源
                    } else {
                        response.writeHead(404, { 'Content-Type': 'text/plain' });
                        response.end('404:Handle Not found');
                    }
                } catch (exception) {
                    console.log('error::url:' + request.url + 'msg:' + exception);
                    response.writeHead(500, { "Content-Type": "text/plain" });
                    response.end("Server Error:" + exception);
                }
            }
        } else { 
			//资源不存在
            response.writeHead(404, { 'Content-Type': 'text/plain' });
            response.end('404:File Not found');
        }
    });
}

//处理静态资源
function staticResHandler(request, response, filepath, ext) {
    fs.readFile(filepath, "binary", function (error, file) {
        if (error) {
            response.writeHead(500, { "Content-Type": "text/plain" });
            response.end("Server Error:" + error);
        } else {
			printAccessLog(request, 200);
            response.writeHead(200, { "Content-Type": getContentTypeByExt(ext) });
            response.end(file, "binary");
        }
    });
}

function printAccessLog(request, status) {
	console.log(request.remoteAddress, "--", "[", new Date().toGMTString(), "]", "\"" + request.method + " " + request.url + " HTTP/1.1\"", status);
}

//得到ContentType
function getContentTypeByExt(ext) {
    ext = ext.toLowerCase();
    if (ext === '.htm' || ext === '.html')
        return 'text/html';
    else if (ext === '.js')
        return 'application/x-javascript';
    else if (ext === '.css')
        return 'text/css';
    else if (ext === '.jpe' || ext === '.jpeg' || ext === '.jpg')
        return 'image/jpeg';
    else if (ext === '.png')
        return 'image/png';
    else if (ext === '.ico')
        return 'image/x-icon';
    else if (ext === '.zip')
        return 'application/zip';
    else if (ext === '.doc')
        return 'application/msword';
	else if (ext === '.json')
		return 'application/json';
    else
        return 'text/plain';
}