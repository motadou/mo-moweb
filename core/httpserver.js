/***
 ** A very simple webserver.
 **
 ** Anchor : motadou@126.com
 ** Blog   : www.easenote.com
 **
 ***/
var http = require('http');
var url  = require('url');
var fs   = require('fs');
var path = require('path');
var net  = require('net');

//默认配置项
var config = {
    host	: '0.0.0.0',
	port	: 80,
	docroot	: './',
	filter 	: undefined
};

var os = require('os');  

//主函数
function main() {
    var configFilePath = process.argv.length > 2?complete(process.argv[2]):"./config.json";
    configFilePath     = path.isAbsolute(configFilePath)?configFilePath:(path.normalize(process.cwd() + "/" + configFilePath));

	fs.exists(configFilePath, function (exists) {
		if (exists) {
			var uconfig = require(configFilePath);
			config.host    = uconfig.host || config.host;
			config.port    = uconfig.port || config.port;
            config.docroot = complete(uconfig.docroot || config.docroot);
			config.filter  = uconfig.filter?require(complete(uconfig.filter)):undefined;
            config.F404    = uconfig.F404;
		}

		//开始HTTP服务器
		http.createServer(processRequestRoute).listen(config.port, config.host);

		console.log("moweb has started.");
        console.log("configure : [", configFilePath, "]");
		console.log("listen at : [", config.host + ":" + config.port, "]");
		console.log("docroot   : [", config.docroot, "]");
        console.log("localIPs  : [", getLocalIps().join(", "), "]");
	});
}

module.exports = main;

// 获取本机的IP地址
function getLocalIps() {
	var ifaces = os.networkInterfaces(); 
	var ips    = ['127.0.0.1'];

	for (var dev in ifaces) {  
		ifaces[dev].forEach(function (details) {  
			if (net.isIPv4(details.address)) { 
				ips.push(details.address);
			}
		});
		break;  
	}  

	return ips;
}

// 将相对路径转换成系统所用的绝对路径
function complete(sFilePath) {
	if (path.isAbsolute(sFilePath)) {
		return sFilePath;
	} else {
		return path.normalize(process.cwd() + "/" + sFilePath);
	}
}

function isLocalHtmlFile(path) {
    return path.indexOf("cgi-bin") == -1;
}

// 路由URL
function processRequestRoute(request, response) {
	request.remoteAddress = request.socket.remoteAddress;

    // STEP01 访问策略控制
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

    // STEP02 调用第一个中间件入口函数，规正化URL
    var pathname = url.parse(request.url).pathname;
	if (config.filter && config.filter.path_url) {
		pathname = config.filter.path_url(pathname);
	}

    //STEP03 得到本地文件的对应信息
	var sLocalFile = path.normalize(config.docroot + "/" + pathname);

	fs.stat(sLocalFile, function (err, stat) {
		if (err) {
			return HttpStatusHandle.process_404(request, response);
		}

		if(stat.isFile()) {
			//STEP02 处理静态资源的情况
			if (isLocalHtmlFile(pathname)) {
				return staticResHandle(request, response, sLocalFile); //静态资源
			}

			//STEP03 处理动态资源的情况
			try {
				var handle = require(sLocalFile);
				if (handle.processRequest && typeof handle.processRequest === 'function') {
					handle.processRequest(request, response); //动态资源
				}
			} catch (exception) {
				response.writeHead(500, { "Content-Type": "text/plain" });
				response.end("Server Error:" + exception);
			}

			return ;
		}

		if(stat.isDirectory()) {
			staticResDir(sLocalFile, response);
		}
	});
}

// 状态码处理，比如404，302，301等
var HttpStatusHandle  = {};
HttpStatusHandle.F404 = {
    exist   : 0,
    file    : "",
    content : "404:File Not found"
};

HttpStatusHandle.process_404 = function (request, response) {
    response.writeHead(404, { 'Content-Type': 'text/html' });

    if (HttpStatusHandle.F404.exist == 1) {
        response.end(HttpStatusHandle.F404.content);
    }

    if (HttpStatusHandle.F404.exist == 0 && config.F404 === undefined) {
        response.end(HttpStatusHandle.F404.content);
    }

    if (HttpStatusHandle.F404.exist == 0 && config.F404) {
        fs.readFile(config.F404, function (error, file) {
            HttpStatusHandle.F404.exist = 1;

            if (!error) {
                HttpStatusHandle.F404.content = file;
            }
            
            response.end(HttpStatusHandle.F404.content);
        });
    }
}

// 处理静态资源
function staticResHandle(request, response, filepath) {
    fs.readFile(filepath, "binary", function (error, file) {
        if (error) {
            response.writeHead(500, { "Content-Type": "text/plain" });
            response.end("Server Error:" + error);
        } else {
			printAccessLog(request, 200);
            response.writeHead(200, { "Content-Type": getContentTypeByExt(path.extname(filepath)) });
            response.end(file, "binary");
        }
    });
}

// 处理访问目录
function staticResDir(DirPath, response) {
	fs.readdir(DirPath, function (err, files) {
		if(err) {
			console.error(err);
			return;
		} else {
			var sHtml  = "root :";
			var iIndex = 0;
			files.forEach(function (file) {
				var filePath = path.normalize(DirPath + "/" + file);

				fs.stat(filePath, function (err, stat) {
					iIndex++;
					if (err) {
						return ;
					}

					if(stat.isFile()) {
						sHtml += "<br /><a href='/" + filePath + "'>" + filePath + "</a>";
					}
					if(stat.isDirectory()) {
						sHtml += "<br /><a href='/" + filePath + "'>" + filePath + "</a>";
					}

					if (iIndex == files.length) {
						response.writeHead(200, { "Content-Type": "text/html"});
						response.end(sHtml);
					}
				});
			});
		}
	});
}

function printAccessLog(request, status) {
	console.log(request.remoteAddress, "--", "[", new Date().toGMTString(), "]", "\"" + request.method + " " + request.url + " HTTP/1.1\"", status);
}

// 得到ContentType
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