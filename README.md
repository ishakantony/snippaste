# snippaste

A lightweight, self-hosted snippet / paste tool. Snippets are stored in SQLite and accessed by short slug (e.g. `http://localhost:7777/my-snippet`).

---

## Docker usage

### Throwaway instance (data lost on container stop)

```sh
docker run -p 7777:7777 ishakantony/snippaste
```

App is reachable at <http://localhost:7777>.

### Persistent instance (data survives restarts)

```sh
docker run -v snippaste-data:/data -p 7777:7777 ishakantony/snippaste
```

SQLite is stored at `/data/snippaste.db` inside the container, mounted from the named volume `snippaste-data`.

### Custom port

```sh
docker run -e PORT=8080 -p 8080:8080 ishakantony/snippaste
```

### Custom DB path

```sh
docker run -v /host/path:/mydata -e DB_PATH=/mydata/snippaste.db -p 7777:7777 ishakantony/snippaste
```

---

## Reverse proxy (snippaste.ishak.stream)

### Caddy

```caddyfile
snippaste.ishak.stream {
    reverse_proxy localhost:7777
}
```

### nginx

```nginx
server {
    listen 80;
    server_name snippaste.ishak.stream;

    location / {
        proxy_pass http://localhost:7777;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Build and publish (maintainer)

```sh
# Build image
docker build -t ishakantony/snippaste .

# Push to Docker Hub
docker push ishakantony/snippaste
```
