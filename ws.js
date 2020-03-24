

const {ipcMain, dialog} = require("electron")
const WebSocket = require("ws");
var http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const WS_PORT = 10086
const CHUNCK_SIZE = 1000 * 1024

function getIPAdress() {
	const interfaces = os.networkInterfaces();
	for (let devName in interfaces) {
		const iface = interfaces[devName]
		for (let i = 0; i < iface.length; i++) {
			const alias = iface[i]
			if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
					return alias.address
			}
		}
	}
}

ipcMain.on("choosefile", (e, arg) => {
	dialog.showOpenDialog({
		title: "选择文件",
		filters: [
			{ name: "All", extensions: ["*"] },
		]
	}, (res, data) => {
		if(res){
			fs.stat(res[0], function(error, stats){
				if(!error){
					const result = path.parse(res[0])
					e.reply('choosefile', {
						server: "ws://" + getIPAdress() + ":" + WS_PORT,
						name: result.name,
						path: res[0],
						type: result.ext.replace('.', ''),
						size: stats.size
					})
				}
			});
		}
	});
})

ipcMain.on("download", (e, arg) => {

	const data = []
	let chuncks = 0;
	
	if(arg.server && arg.path){

		const ws = new WebSocket(arg.server); 

		ws.on('open', () => {
			console.log('will request to download file.')
			ws.send(JSON.stringify({
				type: "download",
				path: arg.path
			}))
		});
		
		ws.on('message', msg => {
			if(msg instanceof Buffer){
				data.push(msg)
				if(data.length < chuncks){
					ws.send(JSON.stringify({
						type: "next"
					}))
				}else{
					const buffer = Buffer.concat(data)
					fs.writeFile('./' + arg.name + '.' + arg.type, buffer, err => {
						if (err) {
								throw err;
						}
						console.log('file download success.')
					})
					ws.close()
				}
			}else{
				let data = JSON.parse(msg)
				if(data.chuncks){
					chuncks = data.chuncks
					ws.send(JSON.stringify({
						type: "next"
					}))
				}
			}
		});

		ws.on('close', () => {
			if(!data.length || data < chuncks){
				console.log('file download error.')
			}
		})
	}
})



module.exports.createServer = function(){

	const client = {}
	const httpServer = http.createServer(responseRequest);

	httpServer.listen(WS_PORT, () => {
		console.log("ws server has created success");
	});

	const socketServer = new WebSocket.Server({
		server: httpServer
	});

	socketServer.on("connection", function connection(ws, req){

		// 连上来肯定是要获取数据的
		let fileData, size;
		let start = 0;
		
		ws.on("message", function(msg){
			const _msg = JSON.parse(msg)
			if(_msg.type === "download" && _msg.path){
				fs.readFile(_msg.path, function(err, data){
					console.log('file found, total:' + data.length)
					fileData = data;
					size = data.length
					ws.send(JSON.stringify({"chuncks": Math.ceil(fileData.length/CHUNCK_SIZE)}))
				});
			}else if(_msg.type === "next"){
				let block;
				if(size <= 0){
					return
				}
				if(size < CHUNCK_SIZE) {
					block = fileData.slice(start, fileData.size)
					size = 0
				}else{
					block = fileData.slice(start, start + CHUNCK_SIZE);
					size -= CHUNCK_SIZE
					start = start + CHUNCK_SIZE
				}
				ws.send(block);
			}
		})

		ws.on("close", function(){

		})

	})

}

function addCORSHeader(res){
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS,DELETE"); // 支持的http 动作
	res.setHeader("Access-Control-Allow-Headers", "Time-Zone"); // 响应头 请按照自己需求添加。
}

function responseRequest(req, res){
	addCORSHeader(res);
	if(req.method == "OPTIONS"){
		res.end();
	}
	if(req.method == "GET"){
		handleGetReq(req, res);
	}
	if(req.method == "POST"){
		handlePostReq(req, res);
	}
}

function handleGetReq(req, res){

}