const CAMERA_TOKEN = "ESP32CAM_2026_QWERTYU1";

export class CameraDO {
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request) {
        const url = new URL(request.url);

        // =========================
        // UPLOAD DARI ESP32-CAM
        // =========================

        if (
            request.method === "POST" &&
            url.pathname === "/upload"
        ) {
            const token = request.headers.get(
                "X-Camera-Token"
            );

            if (token !== CAMERA_TOKEN) {
                return json(
                    {
                        error: "Unauthorized"
                    },
                    401
                );
            }

            const image =
                await request.arrayBuffer();

            if (image.byteLength === 0) {
                return json(
                    {
                        error: "Image kosong"
                    },
                    400
                );
            }

            await this.state.storage.put(
                "latestFrame",
                image
            );

            await this.state.storage.put(
                "lastUpdate",
                Date.now()
            );

            return json({
                success: true,
                size: image.byteLength
            });
        }

        // =========================
        // AMBIL GAMBAR
        // =========================

        if (
            request.method === "GET" &&
            url.pathname === "/frame"
        ) {
            const image =
                await this.state.storage.get(
                    "latestFrame"
                );

            if (!image) {
                return json(
                    {
                        error: "Belum ada frame"
                    },
                    404
                );
            }

            return new Response(image, {
                headers: {
                    "Content-Type": "image/jpeg",
                    "Cache-Control":
                        "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            });
        }

        // =========================
        // STATUS
        // =========================

        if (
            request.method === "GET" &&
            url.pathname === "/status"
        ) {
            const lastUpdate =
                await this.state.storage.get(
                    "lastUpdate"
                );

            if (!lastUpdate) {
                return json({
                    online: false,
                    age: null
                });
            }

            const age =
                Date.now() - lastUpdate;

            return json({
                online: age < 10000,
                age: age
            });
        }

        return json(
            {
                error: "Not found"
            },
            404
        );
    }
}


// ==========================================
// WORKER UTAMA
// ==========================================

export default {

    async fetch(request, env) {

        const url =
            new URL(request.url);


        // ==================================
        // HALAMAN WEB ESP32-CAM
        // ==================================

        if (
            request.method === "GET" &&
            url.pathname === "/"
        ) {
            return new Response(
                getWebPage(),
                {
                    headers: {
                        "Content-Type":
                            "text/html; charset=UTF-8",

                        "Cache-Control":
                            "no-cache"
                    }
                }
            );
        }


        // ==================================
        // HEALTH
        // ==================================

        if (
            request.method === "GET" &&
            url.pathname === "/health"
        ) {
            return new Response("OK");
        }


        // ==================================
        // DURABLE OBJECT
        // ==================================

        const id =
            env.CAMERA.idFromName(
                "esp32cam"
            );

        const camera =
            env.CAMERA.get(id);


        // ==================================
        // UPLOAD ESP32-CAM
        // ==================================

        if (
            request.method === "POST" &&
            url.pathname === "/api/upload"
        ) {

            return camera.fetch(
                new Request(
                    new URL(
                        "/upload",
                        request.url
                    ),
                    {
                        method: "POST",
                        headers:
                            request.headers,
                        body:
                            request.body
                    }
                )
            );
        }


        // ==================================
        // FRAME
        // ==================================

        if (
            request.method === "GET" &&
            url.pathname === "/api/frame"
        ) {

            return camera.fetch(
                new Request(
                    new URL(
                        "/frame",
                        request.url
                    ),
                    {
                        method: "GET"
                    }
                )
            );
        }


        // ==================================
        // STATUS
        // ==================================

        if (
            request.method === "GET" &&
            url.pathname === "/api/status"
        ) {

            return camera.fetch(
                new Request(
                    new URL(
                        "/status",
                        request.url
                    ),
                    {
                        method: "GET"
                    }
                )
            );
        }


        // ==================================
        // NOT FOUND
        // ==================================

        return json(
            {
                error: "Not found"
            },
            404
        );
    }
};


// ==========================================
// HALAMAN WEB
// ==========================================

function getWebPage() {

    return `<!DOCTYPE html>

<html lang="id">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>ESP32-CAM</title>

<style>

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    font-family: Arial, sans-serif;
    background: #111;
    color: white;
}

.container {
    width: 100%;
    max-width: 900px;
    margin: auto;
    padding: 20px;
}

.header {
    text-align: center;
    margin-bottom: 20px;
}

.header h1 {
    margin: 0;
    font-size: 30px;
}

.subtitle {
    color: #aaa;
    margin-top: 8px;
}

.status-box {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
}

.status {
    padding: 10px 20px;
    border-radius: 20px;
    font-weight: bold;
    background: #333;
}

.online {
    background: #164d24;
    color: #4cff75;
}

.offline {
    background: #4d1616;
    color: #ff6464;
}

.camera-box {
    background: #222;
    border-radius: 15px;
    padding: 10px;
    text-align: center;
}

.camera-image {
    width: 100%;
    max-height: 650px;
    object-fit: contain;
    border-radius: 10px;
    background: black;
}

.info {
    margin-top: 15px;
    color: #aaa;
    font-size: 14px;
}

.refresh {
    margin-top: 20px;
    padding: 12px 25px;
    border: none;
    border-radius: 8px;
    background: #333;
    color: white;
    font-size: 16px;
    cursor: pointer;
}

.refresh:active {
    transform: scale(0.96);
}

.footer {
    text-align: center;
    margin-top: 25px;
    color: #666;
    font-size: 13px;
}

</style>

</head>


<body>

<div class="container">


<div class="header">

<h1>📷 ESP32-CAM</h1>

<div class="subtitle">
Cloudflare Camera Monitor
</div>

</div>


<div class="status-box">

<div
    id="status"
    class="status offline"
>
🔴 OFFLINE
</div>

</div>


<div class="camera-box">

<img
    id="camera"
    class="camera-image"
    src="/api/frame"
    alt="ESP32-CAM"
>

<div
    id="info"
    class="info"
>
Menunggu kamera...
</div>

<button
    class="refresh"
    onclick="updateCamera()"
>
🔄 Refresh
</button>

</div>


<div class="footer">

ESP32-CAM • Cloudflare Worker

</div>


</div>


<script>

const camera =
    document.getElementById("camera");

const status =
    document.getElementById("status");

const info =
    document.getElementById("info");


// ==================================
// UPDATE STATUS
// ==================================

async function updateStatus() {

    try {

        const response =
            await fetch(
                "/api/status?t=" +
                Date.now()
            );

        const data =
            await response.json();


        if (data.online) {

            status.textContent =
                "🟢 ONLINE";

            status.className =
                "status online";

            info.textContent =
                "Kamera aktif • " +
                "Update " +
                data.age +
                " ms yang lalu";

        } else {

            status.textContent =
                "🔴 OFFLINE";

            status.className =
                "status offline";

            info.textContent =
                "Menunggu ESP32-CAM...";
        }

    } catch (error) {

        status.textContent =
            "🔴 ERROR";

        status.className =
            "status offline";

        info.textContent =
            "Tidak dapat terhubung ke server";
    }
}


// ==================================
// UPDATE GAMBAR
// ==================================

function updateCamera() {

    camera.src =
        "/api/frame?t=" +
        Date.now();

    updateStatus();
}


// ==================================
// AUTO REFRESH
// ==================================

setInterval(
    updateCamera,
    2000
);


// ==================================
// START
// ==================================

updateCamera();

</script>


</body>

</html>`;
}


// ==========================================
// JSON RESPONSE
// ==========================================

function json(
    data,
    status = 200
) {

    return new Response(
        JSON.stringify(data),
        {
            status: status,

            headers: {
                "Content-Type":
                    "application/json"
            }
        }
    );
}const CAMERA_TOKEN = "ESP32CAM_2026_QWERTYU1";

export class CameraDO {
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request) {
        const url = new URL(request.url);

        // =========================
        // UPLOAD DARI ESP32-CAM
        // =========================

        if (
            request.method === "POST" &&
            url.pathname === "/upload"
        ) {
            const token = request.headers.get(
                "X-Camera-Token"
            );

            if (token !== CAMERA_TOKEN) {
                return json(
                    {
                        error: "Unauthorized"
                    },
                    401
                );
            }

            const image =
                await request.arrayBuffer();

            if (image.byteLength === 0) {
                return json(
                    {
                        error: "Image kosong"
                    },
                    400
                );
            }

            await this.state.storage.put(
                "latestFrame",
                image
            );

            await this.state.storage.put(
                "lastUpdate",
                Date.now()
            );

            return json({
                success: true,
                size: image.byteLength
            });
        }

        // =========================
        // AMBIL GAMBAR
        // =========================

        if (
            request.method === "GET" &&
            url.pathname === "/frame"
        ) {
            const image =
                await this.state.storage.get(
                    "latestFrame"
                );

            if (!image) {
                return json(
                    {
                        error: "Belum ada frame"
                    },
                    404
                );
            }

            return new Response(image, {
                headers: {
                    "Content-Type": "image/jpeg",
                    "Cache-Control":
                        "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            });
        }

        // =========================
        // STATUS
        // =========================

        if (
            request.method === "GET" &&
            url.pathname === "/status"
        ) {
            const lastUpdate =
                await this.state.storage.get(
                    "lastUpdate"
                );

            if (!lastUpdate) {
                return json({
                    online: false,
                    age: null
                });
            }

            const age =
                Date.now() - lastUpdate;

            return json({
                online: age < 10000,
                age: age
            });
        }

        return json(
            {
                error: "Not found"
            },
            404
        );
    }
}


// ==========================================
// WORKER UTAMA
// ==========================================

export default {

    async fetch(request, env) {

        const url =
            new URL(request.url);


        // ==================================
        // HALAMAN WEB ESP32-CAM
        // ==================================

        if (
            request.method === "GET" &&
            url.pathname === "/"
        ) {
            return new Response(
                getWebPage(),
                {
                    headers: {
                        "Content-Type":
                            "text/html; charset=UTF-8",

                        "Cache-Control":
                            "no-cache"
                    }
                }
            );
        }


        // ==================================
        // HEALTH
        // ==================================

        if (
            request.method === "GET" &&
            url.pathname === "/health"
        ) {
            return new Response("OK");
        }


        // ==================================
        // DURABLE OBJECT
        // ==================================

        const id =
            env.CAMERA.idFromName(
                "esp32cam"
            );

        const camera =
            env.CAMERA.get(id);


        // ==================================
        // UPLOAD ESP32-CAM
        // ==================================

        if (
            request.method === "POST" &&
            url.pathname === "/api/upload"
        ) {

            return camera.fetch(
                new Request(
                    new URL(
                        "/upload",
                        request.url
                    ),
                    {
                        method: "POST",
                        headers:
                            request.headers,
                        body:
                            request.body
                    }
                )
            );
        }


        // ==================================
        // FRAME
        // ==================================

        if (
            request.method === "GET" &&
            url.pathname === "/api/frame"
        ) {

            return camera.fetch(
                new Request(
                    new URL(
                        "/frame",
                        request.url
                    ),
                    {
                        method: "GET"
                    }
                )
            );
        }


        // ==================================
        // STATUS
        // ==================================

        if (
            request.method === "GET" &&
            url.pathname === "/api/status"
        ) {

            return camera.fetch(
                new Request(
                    new URL(
                        "/status",
                        request.url
                    ),
                    {
                        method: "GET"
                    }
                )
            );
        }


        // ==================================
        // NOT FOUND
        // ==================================

        return json(
            {
                error: "Not found"
            },
            404
        );
    }
};


// ==========================================
// HALAMAN WEB
// ==========================================

function getWebPage() {

    return `<!DOCTYPE html>

<html lang="id">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>ESP32-CAM</title>

<style>

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    font-family: Arial, sans-serif;
    background: #111;
    color: white;
}

.container {
    width: 100%;
    max-width: 900px;
    margin: auto;
    padding: 20px;
}

.header {
    text-align: center;
    margin-bottom: 20px;
}

.header h1 {
    margin: 0;
    font-size: 30px;
}

.subtitle {
    color: #aaa;
    margin-top: 8px;
}

.status-box {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
}

.status {
    padding: 10px 20px;
    border-radius: 20px;
    font-weight: bold;
    background: #333;
}

.online {
    background: #164d24;
    color: #4cff75;
}

.offline {
    background: #4d1616;
    color: #ff6464;
}

.camera-box {
    background: #222;
    border-radius: 15px;
    padding: 10px;
    text-align: center;
}

.camera-image {
    width: 100%;
    max-height: 650px;
    object-fit: contain;
    border-radius: 10px;
    background: black;
}

.info {
    margin-top: 15px;
    color: #aaa;
    font-size: 14px;
}

.refresh {
    margin-top: 20px;
    padding: 12px 25px;
    border: none;
    border-radius: 8px;
    background: #333;
    color: white;
    font-size: 16px;
    cursor: pointer;
}

.refresh:active {
    transform: scale(0.96);
}

.footer {
    text-align: center;
    margin-top: 25px;
    color: #666;
    font-size: 13px;
}

</style>

</head>


<body>

<div class="container">


<div class="header">

<h1>📷 ESP32-CAM</h1>

<div class="subtitle">
Cloudflare Camera Monitor
</div>

</div>


<div class="status-box">

<div
    id="status"
    class="status offline"
>
🔴 OFFLINE
</div>

</div>


<div class="camera-box">

<img
    id="camera"
    class="camera-image"
    src="/api/frame"
    alt="ESP32-CAM"
>

<div
    id="info"
    class="info"
>
Menunggu kamera...
</div>

<button
    class="refresh"
    onclick="updateCamera()"
>
🔄 Refresh
</button>

</div>


<div class="footer">

ESP32-CAM • Cloudflare Worker

</div>


</div>


<script>

const camera =
    document.getElementById("camera");

const status =
    document.getElementById("status");

const info =
    document.getElementById("info");


// ==================================
// UPDATE STATUS
// ==================================

async function updateStatus() {

    try {

        const response =
            await fetch(
                "/api/status?t=" +
                Date.now()
            );

        const data =
            await response.json();


        if (data.online) {

            status.textContent =
                "🟢 ONLINE";

            status.className =
                "status online";

            info.textContent =
                "Kamera aktif • " +
                "Update " +
                data.age +
                " ms yang lalu";

        } else {

            status.textContent =
                "🔴 OFFLINE";

            status.className =
                "status offline";

            info.textContent =
                "Menunggu ESP32-CAM...";
        }

    } catch (error) {

        status.textContent =
            "🔴 ERROR";

        status.className =
            "status offline";

        info.textContent =
            "Tidak dapat terhubung ke server";
    }
}


// ==================================
// UPDATE GAMBAR
// ==================================

function updateCamera() {

    camera.src =
        "/api/frame?t=" +
        Date.now();

    updateStatus();
}


// ==================================
// AUTO REFRESH
// ==================================

setInterval(
    updateCamera,
    2000
);


// ==================================
// START
// ==================================

updateCamera();

</script>


</body>

</html>`;
}


// ==========================================
// JSON RESPONSE
// ==========================================

function json(
    data,
    status = 200
) {

    return new Response(
        JSON.stringify(data),
        {
            status: status,

            headers: {
                "Content-Type":
                    "application/json"
            }
        }
    );
}
