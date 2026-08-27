const CAMERA_TOKEN = "ESP32CAM_2026_QWERTYU1";

let latestFrame = null;
let lastUpdate = 0;

export default {
    async fetch(request) {

        const url = new URL(request.url);

        // =========================
        // HALAMAN WEB
        // =========================

        if (
            request.method === "GET" &&
            url.pathname === "/"
        ) {
            return new Response(
                getWebPage(),
                {
                    headers: {
                        "Content-Type":
                            "text/html; charset=UTF-8"
                    }
                }
            );
        }


        // =========================
        // HEALTH
        // =========================

        if (
            request.method === "GET" &&
            url.pathname === "/health"
        ) {
            return new Response("OK");
        }


        // =========================
        // UPLOAD ESP32-CAM
        // =========================

        if (
            request.method === "POST" &&
            url.pathname === "/api/upload"
        ) {

            const token =
                request.headers.get(
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

            latestFrame = image;
            lastUpdate = Date.now();

            return json({
                success: true,
                size: image.byteLength
            });
        }


        // =========================
        // FRAME
        // =========================

        if (
            request.method === "GET" &&
            url.pathname === "/api/frame"
        ) {

            if (latestFrame === null) {
                return json(
                    {
                        error:
                            "Belum ada frame"
                    },
                    404
                );
            }

            return new Response(
                latestFrame,
                {
                    headers: {
                        "Content-Type":
                            "image/jpeg",

                        "Cache-Control":
                            "no-cache, no-store, must-revalidate",

                        "Pragma": "no-cache",

                        "Expires": "0"
                    }
                }
            );
        }


        // =========================
        // STATUS
        // =========================

        if (
            request.method === "GET" &&
            url.pathname === "/api/status"
        ) {

            if (lastUpdate === 0) {
                return json({
                    online: false,
                    age: null
                });
            }

            const age =
                Date.now() - lastUpdate;

            return json({
                online: age < 30000,
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
};


// ================================
// WEB PAGE
// ================================

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

body {
    margin: 0;
    background: #111;
    color: white;
    font-family: Arial, sans-serif;
    text-align: center;
}

.container {
    max-width: 900px;
    margin: auto;
    padding: 20px;
}

h1 {
    margin-bottom: 5px;
}

.status {
    display: inline-block;
    padding: 10px 20px;
    border-radius: 20px;
    margin: 15px;
    font-weight: bold;
}

.online {
    background: #164d24;
    color: #4cff75;
}

.offline {
    background: #4d1616;
    color: #ff6464;
}

.camera {
    width: 100%;
    max-width: 800px;
    border-radius: 12px;
    background: black;
}

button {
    margin-top: 20px;
    padding: 12px 25px;
    border: 0;
    border-radius: 8px;
    font-size: 16px;
}

.info {
    color: #aaa;
    margin-top: 10px;
}

</style>

</head>

<body>

<div class="container">

<h1>📷 ESP32-CAM</h1>

<div
    id="status"
    class="status offline"
>
🔴 OFFLINE
</div>

<br>

<img
    id="camera"
    class="camera"
    src="/api/frame"
    alt="ESP32-CAM"
>

<div
    id="info"
    class="info"
>
Menunggu kamera...
</div>

<button onclick="refreshCamera()">
🔄 Refresh
</button>

</div>


<script>

const camera =
    document.getElementById("camera");

const status =
    document.getElementById("status");

const info =
    document.getElementById("info");


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

            status.innerText =
                "🟢 ONLINE";

            status.className =
                "status online";

            info.innerText =
                "Kamera aktif • " +
                data.age +
                " ms";

        } else {

            status.innerText =
                "🔴 OFFLINE";

            status.className =
                "status offline";

            info.innerText =
                "Menunggu ESP32-CAM...";
        }

    } catch (error) {

        status.innerText =
            "🔴 ERROR";

        status.className =
            "status offline";

        info.innerText =
            "Server tidak dapat dihubungi";
    }
}


function refreshCamera() {

    camera.src =
        "/api/frame?t=" +
        Date.now();

    updateStatus();
}


setInterval(
    refreshCamera,
    2000
);

updateStatus();

</script>

</body>

</html>`;
}


// ================================
// JSON
// ================================

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
