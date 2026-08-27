const CAMERA_TOKEN = "ESP32CAM_2026_QWERTYU1";

export class CameraDO {
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request) {
        const url = new URL(request.url);

        // =========================
        // UPLOAD FRAME
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

            // Simpan gambar ke Durable Object Storage
            await this.state.storage.put(
                "latestFrame",
                image
            );

            // Simpan waktu update
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
        // AMBIL FRAME
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
                        error:
                            "Belum ada frame"
                    },
                    404
                );
            }

            return new Response(
                image,
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


// ========================================
// WORKER UTAMA
// ========================================

export default {

    async fetch(request, env) {

        const url =
            new URL(request.url);


        // =========================
        // HOME
        // =========================

        if (
            request.method === "GET" &&
            url.pathname === "/"
        ) {
            return json({
                status: "online",
                service: "ESP32-CAM Worker",
                durable_object: "CameraDO"
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
        // AMBIL CAMERA DO
        // =========================

        const id =
            env.CAMERA.idFromName(
                "esp32cam"
            );

        const camera =
            env.CAMERA.get(id);


        // =========================
        // UPLOAD DARI ESP32-CAM
        // =========================

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


        // =========================
        // FRAME UNTUK WEB
        // =========================

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


        // =========================
        // STATUS CAMERA
        // =========================

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


        // =========================
        // NOT FOUND
        // =========================

        return json(
            {
                error: "Not found"
            },
            404
        );
    }
};


// ========================================
// JSON RESPONSE
// ========================================

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
