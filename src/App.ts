import parseConfig from "js-conf-parser";
import puppeteer from 'puppeteer';
import {logRegular, logSuccess} from "./helper/LogHelper";
import * as packageConfig from '../package.json'
import express, {Express} from "express";
import cors from 'cors';

init()

async function init() {
    logSuccess(`Starting html2webp-server ${packageConfig.version}...`)
    const config = parseConfig(`${__dirname}/..`, ".env.conf")

    logRegular(`Launch puppeteer/chromium instance`)

    const browser = await puppeteer.launch({headless: true})

    logRegular(`Launch express instance`)

    const webServer = express()

    webServer.use(cors({
        origin: '*', // Allow all origins
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow all HTTP methods
        allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'], // Allow all common headers
        credentials: true, // Optional: Allow cookies to be included in requests
    }))

    webServer.listen(config.server.port, config.server.ip, () => {
        logSuccess('web server is ready')
    })

    webServer.post('/convert', (req, res) => {
        console.log(req.body)
    })
}