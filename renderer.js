// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const  {ipcRenderer} = require('electron')
let data;
// const data = {
// 	server: "ws://localhost:10086",
// 	name: 'weixin_IM_SDK_V1.1.0',
// 	size: '',
// 	type: 'zip',
// 	path: '/Users/Tony/Downloads/weixin_IM_SDK_V1.1.0.zip',
// }

ipcRenderer.on('choosefile', (e, arg) => {
	console.log("已选择文件", arg)
	data = arg
})

document.getElementById('file').addEventListener('click', ()=>{
	ipcRenderer.send('choosefile')
})

document.getElementById('download').addEventListener('click', ()=>{
	if(data){
		ipcRenderer.send('download', data)
	}
})