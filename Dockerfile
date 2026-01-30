FROM node:20-bookworm AS builder
RUN apt-get update && apt-get install -y \
python3 python3-pip python-is-python3 make rsync ca-certificates openjdk-17-jre-headless python3.11-venv \
&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create and use a virtualenv so pip can install packages
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv "$VIRTUAL_ENV"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Node and Python dependencies first for better caching

COPY package.json package-lock.json* npm-shrinkwrap.json* ./
RUN npm ci --include=dev || npm install
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt

# Copy source and build
COPY . .
RUN make

# Runtime: serve the built static site
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Helpful commands
# First build: docker build -t entropy4energy:latest .
# Rebuild after changes: docker build --no-cache -t entropy4energy:latest .
# Run: docker run --rm -p 8080:80 entropy4energy:latest