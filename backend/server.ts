import {app} from "@app";
import {connectDb, disconnectDb} from "@config/db.js";
import {env} from "@config/env.js";
import {closeServer, listenServer} from "@utils/http.server.js";

import {createServer, type Server} from "node:http";
import {setTimeout as delay} from "node:timers/promises";
import {logger} from "@utils/logger.js";
import {beginShutdown, isShuttingDown} from "@shared/lifeCycle.js";
import type {AddressInfo} from "node:net";


const connection_checking_interval = 5000;
const keep_alive_timeout = 65000;
const headers_timeout = 30000;
const req_timeout = 30000;
const drainDelay = env.isProduction ? 5000 : 0;
const shutdownTimeOut = 35000;
const logFlushTimeOut = 500;
const listen_errors: Readonly<Record<string, string>> = {
    EADDRINUSE: "is already in use",
    EACCES: "requires elevated privileges",
};


let server: Server | null = null;
let httpClosePromise: Promise<void> | null = null;
let listenPromise: Promise<AddressInfo> | null = null;
let exitPromise: Promise<never> | null = null;
let pendingExitCode = 0;
let drainController: AbortController | null = null;
type cleanUpStep = readonly [label: string, close: () => void | Promise<void>]

const runCleanupStep = async ([label, close]: cleanUpStep): Promise<void> => {
    try {
        await close()
    } catch (err) {
        pendingExitCode = 1
        logSafely('error', { err }, `Failed to close ${label}`)
    }
}

const abortGracefulShutDown = () => {
    drainController?.abort()
    server?.closeAllConnections()
}

const logSafely = (
    level: "fatal" | "error" | "warn" | "info",
    binding: Record<string, unknown>,
    message: string,
): void => {
    try {
        logger[level](binding, message);
    } catch {
        try {
            logger[level](`${message} error details unserializable`);
        } catch {
        }
    }
};

const closeHttpServer = async (): Promise<void> => {
    if (httpClosePromise) return httpClosePromise;

    const activeServer = server;
    if (!activeServer) return;
    httpClosePromise = (async (): Promise<void> => {
        let listenError: unknown
        try {
            if (listenPromise) await listenPromise;
        } catch (err) {
            listenError = err
        }
        if (await closeServer(activeServer)) logSafely('info', {}, 'http server closed')

        if (listenError) throw listenError
    })()
    return httpClosePromise
};

const listen = (httpServer: Server, port: number) => {
    return new Promise<void>((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(port, () => {
            httpServer.removeListener("error", reject);
            resolve();
        });
    });
};

const initiateShutdown = (reason: string, exitCode: number): void => {
    void shutdown(reason, exitCode).catch((err: unknown) => {
        pendingExitCode = 1;
       abortGracefulShutDown()
        logSafely("fatal", {err, reason}, "shutdown failed");
        void exitAfterFlush(1);
    });
};

const shutdown = async (reason: string, exitCode: number): Promise<void> => {
    if (exitCode !== 0 && pendingExitCode === 0) pendingExitCode = exitCode
    if (isShuttingDown()) {
        if (exitCode !== 0) {
            abortGracefulShutDown()
            logSafely('error', {reason, exitCode}, 'fatal error during shutdown')
        }
        return
    }
    beginShutdown()

    logSafely('info', { reason, exitCode }, 'Shutting down')

    if (pendingExitCode === 0 && drainDelay > 0) {
        logSafely('info', {drainDelay: drainDelay}, 'Draining before closing listener')
        drainController = new AbortController()
        try {
            await delay(drainDelay, undefined, {signal: drainController.signal})
        } catch (err) {
            if (!drainController.signal.aborted) throw err
        } finally {
            drainController = null
        }
    }
    if (pendingExitCode !== 0) server?.closeAllConnections()

    const forceTimer = setTimeout(() => {
        server?.closeAllConnections()
        logSafely('error', {timeout: shutdownTimeOut}, 'graceful shutdown timedout and forcing exit')
        void exitAfterFlush(1)
    }, shutdownTimeOut)

    await runCleanupStep(['HTTP server', closeHttpServer])
    await  runCleanupStep(['database connection', disconnectDb])
    clearTimeout(forceTimer)
    await exitAfterFlush(pendingExitCode)
}

const exitAfterFlush = (code: number): Promise<never> => {
    if (code !== 0) pendingExitCode = code;
    exitPromise ??= (async (): Promise<never> => {
        await Promise.race([

            new Promise<void>((resolve) => {
                logger.flush(() => resolve());
            }),

            delay(logFlushTimeOut),

        ]).catch(() => undefined);
        process.exit(pendingExitCode);
    })();
    return exitPromise;
};

const attachProcessHandlers = (): void => {
    const onFatal =
        (reason: string, level: "fatal" | "error") =>
            (err: unknown): void => {
                logSafely(level, {err}, `${reason} — initiating shutdown`);
                initiateShutdown(reason, 1);
            };

    process.on("uncaughtException", onFatal("uncaughtException", "fatal"));
    process.on("unhandledRejection", onFatal("unhandledRejection", "error"));

    const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT", "SIGQUIT", "SIGHUP"];
    for (const signal of signals) {
        process.on(signal, () => {
            if (isShuttingDown()) {
                pendingExitCode = 1
                abortGracefulShutDown()
                logSafely('warn', {signal}, "Repeated termination signal — forcing exit")
                void exitAfterFlush(1)
                return
            }

            initiateShutdown(signal, 0);

        });
    }
};

const startServer = async (): Promise<void> => {
    await connectDb();
    if (isShuttingDown()) return;

    const httpServer = createServer(
        {
            connectionsCheckingInterval: connection_checking_interval,
        },
        app,
    );

    server = httpServer;
    httpServer.keepAliveTimeout = keep_alive_timeout;
    httpServer.headersTimeout = headers_timeout;
    httpServer.requestTimeout = req_timeout;
    if (isShuttingDown()) return;
    const onServerError = (err: Error): void => {
        logSafely("fatal", {err}, "server encountered a fatal error");
        initiateShutdown("serverError", 1);

    }
    const pendingListen = (listenPromise = listenServer(httpServer, env.PORT, onServerError));
    let address: AddressInfo
    try {
        address = await pendingListen;
    } finally {
        if (listenPromise === pendingListen) listenPromise = null;
    }
    if (isShuttingDown()) {
        await closeHttpServer();
        return;
    }
    httpServer.on("error", (err: NodeJS.ErrnoException) => {
        logSafely("fatal", {err}, "server encountered a fatal error");
        initiateShutdown("serverError", 1);
    });
    logger.info(
        {
            port: address.port,
            env: env.NODE_ENV,
            pid: process.pid,
            node: process.version,
        },
        "Server started",
    );

    if (env.isDevelopment) {
        const baseUrl = `http://localhost:${env.PORT}`;
        logger.info(
            {api: `${baseUrl}`, health: `${baseUrl}/health`},
            "Local endpoints",
        );
    }
};

attachProcessHandlers();

try {
    await startServer();
} catch (err) {
    const code = (err as NodeJS.ErrnoException | null)?.code ?? "";
    const listenError = listen_errors[code];
    logSafely(
        "fatal",
        {err, ...(listenError && {port: env.PORT})},
        listenError ? `Port ${env.PORT} ${listenError}` : "Failed to start server",
    );
    await shutdown("startupFailure", 1);
}
