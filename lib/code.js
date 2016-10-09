var manifest = [];
var loaded = [];
function extractFilename(src) {
    return src.slice(src.lastIndexOf("/") + 1, src.indexOf("?") != -1 ? src.indexOf("?") : undefined);
}
function extractTag() {
    var ltags = document.getElementsByTagName("ltag");
    for (var i = 0, len = ltags.length; i < len; i++) {
        var ltag = ltags[i];
        var src = ltag.getAttribute("src");
        var filename = extractFilename(src);
        var type = filename.slice(filename.lastIndexOf(".") + 1);
        var resourceKey = src.replace(/(\.|_)+(\d|\w){8}\./g, ".");
        resourceKey = resourceKey.replace(/\/\d+\//, "/");
        var version = ltag.getAttribute("version") || filename.match(/(\.|_)+(\d|\w){8}\./g) || "0.0";
        version = version instanceof Array ? version[0] : version;
        var item = {
            url: src,
            type: type,
            resourceKey: resourceKey,
            blob: "",
            version: version
        }
        manifest.push(item);
    }
}
// 返回替换相对路径后的文件内容
function relativeUrl(cssUrl, file) {
    var re_url = /url\((.+?)\)/g;
    var dir_path = cssUrl.slice(0, cssUrl.lastIndexOf("/"));
    var newFile;
    newFile = file.replace(re_url, function(str) {
        var relative = str.slice(str.indexOf('(')+1, str.indexOf(')'));
        if (relative.indexOf("'") != -1 || relative.indexOf('"') != -1) {
            relative = relative.slice(1, relative.length-1);
        }
        var pieces = relative.split('/');
        var res = dir_path;
        for (var i = 0, len = pieces.length; i < len; i++) {
            if (pieces[i] === ".") {
                res = res;
            } else if (pieces[i] === "..") {
                res = res.slice(0, res.lastIndexOf("/"));
            } else {
                break;
            }
        };
        return "url(" + res + "/" + pieces.slice(i).join("/") + ")";
    });
    return newFile;
}
function isAllCSSLoaded() {
    var cssList = loaded.cssList;
    for (var css in cssList) {
        if (!cssList[css]) return false;
    }
    return true;
}
// 控制js在css之后插入执行
function appendResource(resource){
    if (resource.type === "css") {
        doResource(resource);
        loaded.cssList[resource.resourceKey] = true;
        if (isAllCSSLoaded()) {
            for (var jsFilename in loaded.jsList) {
                if(loaded.jsList[jsFilename]) {
                    doResource(loaded.jsList[jsFilename]);
                }
            }
        }
    } else if (resource.type === "js"){
        if (isAllCSSLoaded()) {
            doResource(resource);
        } else {
            loaded.jsList[resource.resourceKey] = resource;
        }
    }
}
// 插入文件并执行
function doResource(resource) {
    var head =  document.getElementsByTagName("head")[0];
    var body = document.getElementsByTagName("body")[0];
    switch(resource.type) {
        case "css":
            var element = document.createElement("style");
            element.type = "text/css";
            element.appendChild(document.createTextNode(resource.blob));
            head.appendChild(element);
            break;
        case "js":
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.appendChild(document.createTextNode(";(function(){" + resource.blob + "})()"));
            body.appendChild(script);
            break;
    }
}
// 异步请求资源，接受成功回调函数和失败回调函数
function ajax(url, succCab, failCab) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onreadystatechange = function() {
        var DONE = 4;
        var OK = 200;
        if (xhr.readyState === DONE) {
            if (xhr.status === OK && xhr.responseText) {
                succCab(xhr.responseText);
            } else {
                failCab();
            }
        }
    }
    xhr.send(null);
}
// 从本地缓存中读取资源
function getResource(resourceKey){
    return JSON.parse(localStorage.getItem(resourceKey) || "{}");
}
// 检查是否有localstorage
function check() {
    return !!localStorage;
}
// 存储资源
function storeResource(resource) {
    console.log(resource);
    localStorage.setItem(resource.resourceKey, JSON.stringify(resource));
}
// 请求资源并存储资源
function ajaxResource(resource) {
    // ajax请求文件，传入成功回调函数和异常处理函数
    // 当请求不正常或不返回内容时，使用之前缓存的文件
    ajax(resource.url, function(file) {
        if (!file) {
            return;
        }
        if (resource.type === "css") {
            file = relativeUrl(resource.url, file);
        }
        appendResource({
            type: resource.type,
            blob: file,
            resourceKey: resource.resourceKey
        });

        // 防止阻碍渲染的进程
        setTimeout(function() {
            clearResource(resource.resourceKey);
            storeResource({
                type: resource.type,
                blob: file,
                resourceKey: resource.resourceKey,
                version: resource.version
            })
        }, 500);
    }, function() {
        // 无法获取新资源时使用旧资源
        resource = getResource(resource.resourceKey);
        var file = resource.blob;

        // 旧资源不需要再次设置相对路径
        appendResource({
            type: resource.type,
            blob: file,
            resourceKey: resource.resourceKey
        });
    })
}
function clearResource(resourceKey) {
    localStorage.setItem(resourceKey, "{}");
}
// 开始
function begin(info) {
    info.resourceKey = info.resourceKey;
    if (check()) {
        var resource = getResource(info.resourceKey);
        
        if (resource && resource.version === info.version) {
            appendResource(resource);
        } else {
            ajaxResource(info);
        }
    } else {
        ajaxResource(info);
    }
}
function initLoaded() {
    loaded.cssList = {};
    loaded.jsList = {};
    manifest.forEach(function(item) {
        if (item.type === "css") {
            loaded.cssList[item.resourceKey] = false;
        } else if (item.type === "js") {
            loaded.jsList[item.resourceKey] = false;
        }
    })
}
extractTag();
initLoaded();
manifest.forEach(begin);