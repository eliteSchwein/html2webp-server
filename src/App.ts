import "dotenv/config"; // optional: loads .env in local dev (harmless in prod)
import puppeteer from "puppeteer";
import express from "express";
import cors from "cors";
import { logRegular, logSuccess } from "./helper/LogHelper";
import * as packageConfig from "../package.json";

type ConvertBody = {
    html: string;
    width?: number;
    height?: number;
    dpr?: number;
};

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
        acceptInsecureCerts: true,
        args: [
            ...(NO_SANDBOX ? ["--no-sandbox", "--disable-setuid-sandbox"] : []),
            "--ignore-certificate-errors",
            "--allow-insecure-localhost",
        ],
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
        const body = (req.body ?? {}) as Partial<ConvertBody>;

        try {
            if (typeof body.html !== "string" || body.html.trim() === "") {
                res.status(400).json({ error: "Body must include non-empty 'html' string." });
                return;
            }

            const width = Number.isFinite(body.width as any) ? Number(body.width) : 1200;
            const height = Number.isFinite(body.height as any) ? Number(body.height) : 800;
            const dpr = Number.isFinite(body.dpr as any) ? Number(body.dpr) : 2;

            const page = await browser.newPage();
            try {
                await page.setViewport({ width, height, deviceScaleFactor: dpr });

                // Render the provided HTML
                await page.setContent(body.html, { waitUntil: "networkidle0" });

                // Screenshot as WEBP and return raw bytes
                const buf = await page.screenshot({
                    type: "webp",
                    fullPage: true,
                    quality: 90,
                });

                res.status(200);
                res.setHeader("Content-Type", "image/webp");
                res.send(buf);
            } finally {
                await page.close();
            }
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ error: err?.message ?? "convert failed" });
        }
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
