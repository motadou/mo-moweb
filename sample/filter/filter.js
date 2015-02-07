var filter = {};

filter.path_url = function (pathname) {
	if (pathname.indexOf("/2013") != -1) {
		return "/2013/10/27/first-beijing/index.html";
	}

	
	
	return pathname;
}

module.exports = filter;
