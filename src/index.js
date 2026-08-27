const CAMERA_TOKEN = "ESP32CAM_2026_QWERTYU1";

let latestFrame = null;
let lastUpdate = 0;

export default {
    async fetch(request) {

        const url = new URL(request.url);

        // =========================
        // HOME
        // =========================

        if (
            request.method === "GET" &&
            url.pathname === "/"
        ) {
            return json({
                status: "online",
                service: "ESP32-CAM Worker"
            });
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
        // UPLOAD DARI ESP32-CAM
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
                            "no-cache"
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
                    online: false
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
};


function json(data, status = 200) {

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
