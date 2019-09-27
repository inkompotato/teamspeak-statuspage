const express = require('express')
const dotenv = require('dotenv').config()
const { TeamSpeak } = require('ts3-nodejs-library')

const site = {
    title: process.env.PAGE_TITLE,
    link: process.env.PAGE_LINK,
    link_text : process.env.PAGE_LINK_TEXT,
    teamspeak_link: `ts3server://${process.env.TS_HOST}?port=${process.env.TS_SERVER_PORT}`
}

const data = {
    timestamp : -1,
    status : 'offline',
    users : []
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


app.get('/', function (req, res) {
    //only refresh data every 5 seconds
    if(data.timestamp < new Date().getTime() - 5000){
        getClients()
    }   
    res.render('index', {data, site})
})


app.listen(3000, () => {
    console.log(`app started on http://localhost:${process.env.APP_PORT}`)
})

ts.on('ready', () => {
    console.log(`connected to TS3 Server ${process.env.TS_HOST} on query port ${process.env.TS_QUERY_PORT} as ${process.env.TS_USERNAME}` )
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
            admin : client.servergroups[0] == 6
        })
    })
    data.timestamp = new Date().getTime()
    data.users = array
    data.status = 'online'
    console.log('client list refreshed')
}


