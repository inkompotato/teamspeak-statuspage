const express = require('express')
const dotenv = require('dotenv').config()
const { TeamSpeak } = require('ts3-nodejs-library')

const site = {
    title: process.env.PAGE_TITLE,
    link: process.env.PAGE_LINK,
    link_text : process.env.PAGE_LINK_TEXT,
    teamspeak_link: `ts3server://${process.env.TS_HOST}?port=${process.env.TS_SERVER_PORT}`,
}

const internal = {
    timestamp: 0,
    channels : {}
}

const data = {
    timestamp : -1,
    status : 'offline',
    users : [],
    serverinfo: {}
}

const ts = new TeamSpeak({
    host: process.env.TS_HOST,
    queryport: process.env.TS_QUERY_PORT,
    serverport: process.env.TS_SERVER_PORT,
    username: process.env.TS_USERNAME,
    password: process.env.TS_PASSWORD,
    nickname: process.env.TS_NICKNAME
})

var app = express()

app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')

app.use(express.static(__dirname + '/../public'))


app.get('/', async function (req, res) {
    //only refresh channel data every 5 minutes
    if(data.timestamp < new Date().getTime() - 300000){
        await getChannels()
    }
    //only refresh client data every 5 seconds
    if(internal.timestamp < new Date().getTime() - 5000){
        await getClients()
    }  
    res.render('index', {data, site})
})


app.listen(3000, () => {
    console.log(`app started on http://localhost:${process.env.APP_PORT}`)
})

ts.on('ready', async() => {
    console.log(`connected to TS3 Server ${process.env.TS_HOST} on query port ${process.env.TS_QUERY_PORT} as ${process.env.TS_USERNAME}` )
    const serverinfo = await ts.serverInfo()
    data.serverinfo = {
        name : serverinfo.virtualserver_name,
        maxclients : serverinfo.virtualserver_maxclients,
        protected : serverinfo.virtualserver_flag_password == 1
    }
    getChannels()
    getClients()
})

ts.on("error", e => {
    data.timestamp = new Date().getTime()
    data.users = []
    data.status = 'offline'
    console.log(e.message)
})

async function getClients(){
    const array = []
    const clients = await ts.clientList({client_type : 0})
    clients.forEach(client => {
        array.push({
            name : client.nickname,
            admin : client.servergroups[0] == process.env.TS_ADMINGROUP,
            channel : internal.channels[client.cid] ? internal.channels[client.cid].name : 'could not get channel'
        })
    })
    data.timestamp = new Date().getTime()
    data.users = array
    data.status = 'online'
    console.log('client list refreshed')
}

async function getChannels(){
    const channels = await ts.channelList()
    channels.forEach(channel => {
        internal.channels[channel.cid] = {
            name : channel.name,
            password: channel.flagPassword == 1
        }
    })
    console.log('channel list refreshed')
}


