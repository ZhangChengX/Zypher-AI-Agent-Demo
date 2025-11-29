# Zypher-AI-Agent-Demo

# Init Docker Container
`docker run -it --entrypoint sh node:24-alpine`

# Installation
1. `apk add deno`
2. `deno add jsr:@corespeed/zypher`
3. `deno add npm:rxjs-for-await`
4. `deno add npm:zod`
5. `deno add npm:zod-to-json-schema`


# Startup
`deno run -A --env-file main.ts`
