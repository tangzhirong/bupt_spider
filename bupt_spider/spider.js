var http = require("http");
var fs = require('fs');
var cheerio = require("cheerio");
var iconv = require('iconv-lite');
var url = require('url');

//北邮官网url
var basicUrl = "http://www.bupt.edu.cn";

//初始化存储页面文本的字符串
var RST = '';

//下载url对应的页面
function download(url) {
  return new Promise(function(resolve,reject){
    http.get(url, function(res) {
      var arrBuf = [];
      var bufLength = 0;
      res.on('data', function (chunk) {
        arrBuf.push(chunk);
        bufLength += chunk.length;
      });

      res.on("end", function() {
        var chunkAll = Buffer.concat(arrBuf, bufLength);
        // var strJson = iconv.decode(chunkAll,'gb2312'); // 汉字不乱码
        resolve(chunkAll);
      });
    }).on("error", function(e) {
      reject(e);
    });
  })
}

//获取basicUrl下所有待爬取的子页面
function getPages(basicUrl){
	return new Promise(function(resolve,reject){
		download(basicUrl).then(function(data){
			if(data){
				var $ = cheerio.load(data,{decodeEntities: false});
				var childUrlList = [];
				$("#top_nav ul li").each(function(){
					var childUrl = $(this).children('a').attr("href");
					// console.log("url:"+childUrl);
					if(childUrl!=undefined){
						childUrlList.push(childUrl);
					}
				})
				return childUrlList;
			}
		}).then(function(childUrlList){
			var num = 0;
			for(var i in childUrlList){
				download(basicUrl+childUrlList[i]).then(function(data){
					var $ = cheerio.load(data,{decodeEntities: false});
					$("ul.wrap_sub li a").each(function(){
						var usedUrl = $(this).attr("href");
						if(url.parse(usedUrl).protocol==null){
							var handleUrl = basicUrl+usedUrl;
							download(handleUrl).then(function(data){
								var $ = cheerio.load(data,{decodeEntities: false});
								var tag = $(".rt.list_main h1").text()||"unknown";
								var content = $(".rt.list_main .content.detail");
								storeText($,content,tag);
							})
						}
					})
				})
			}
		}).then(function(){
			resolve("北邮官网已被爬得一干二净！");
		})
	})
}

//异步存储文本内容到文件
var storeText = async function($,content,tag){
	RST = '';
	getContent($,content);
	await fs.writeFile("./pages/"+tag+".txt",RST,function(err){
		if(err){
			console.log("页面文件存储失败！");
		}
	});
}

//美化文本内容（去空格，换行）
function getContent($,node){
    var a = node.contents();
    if (a.length == 0) {
        if (node.is('br')){
            RST+='\n';
        } else {
            RST+=node.text().trim();   //先这样，有些地方貌似不应该去空格。。。
        }
    } else {
        node.contents().each(function(i, elem){
            getContent($,$(this));
        });

        if (node.is('p') || node.is('tr')){
            RST+='\n';
        }
    }
}


getPages(basicUrl).then(function(result){
	console.log(result);
},function(error){
	console.log(error);
});





