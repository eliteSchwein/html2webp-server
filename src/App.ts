import "dotenv/config"; // optional: loads .env in local dev (harmless in prod)
import puppeteer from "puppeteer";
import express from "express";
import cors from "cors";
import { logRegular, logSuccess } from "./helper/LogHelper";
import * as packageConfig from "../package.json";

init().catch((err) => {
    console.error(err);
    process.exit(1);
});

function envBool(name: string, fallback: boolean) {
    const v = process.env[name];
    if (v === undefined) return fallback;
    return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function envNum(name: string, fallback: number) {
    const v = process.env[name];
    if (!v) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

async function init() {
    logSuccess(`Starting html2webp-server ${packageConfig.version}...`);

    // ---- ENV CONFIG ----
    const HOST = process.env.HOST ?? "0.0.0.0";
    const PORT = envNum("PORT", 3000);

    const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

    // Puppeteer / Chrome flags (important for Docker)
    const HEADLESS = process.env.HEADLESS ?? "new"; // "new" recommended; or "true"
    const NO_SANDBOX = envBool("NO_SANDBOX", true);

    logRegular("Launch puppeteer/chromium instance");

    const browser = await puppeteer.launch({
        headless: HEADLESS as any,
        args: NO_SANDBOX ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
    });

    logRegular("Launch express instance");

    const webServer = express();

    // Parse JSON bodies (otherwise req.body will be undefined)
    webServer.use(express.json({ limit: "2mb" }));
    webServer.use(express.urlencoded({ extended: true }));

    webServer.use(
        cors({
            origin: CORS_ORIGIN,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "Origin", "X-Requested-With", "Accept"],
            credentials: false, // use true only if you really need cookies
        })
    );

    webServer.get("/healthz", (_req, res) => res.status(200).send("ok"));

    webServer.post("/convert", async (req, res) => {
        // Example expected body:
        // { html: "<html>...</html>", width: 1200, height: 800, dpr: 2 }
        console.log(req.body);

        // leaving conversion logic out since you didn’t ask,
        // but this is where you’d call page.setContent(...) + page.screenshot({type:"webp"})
        res.status(200).json({ ok: true });
    });

    const server = webServer.listen(PORT, HOST, () => {
        logSuccess(`web server is ready on http://${HOST}:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
        logRegular("Shutting down...");
        server.close(() => logRegular("HTTP server closed"));
        await browser.close();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
