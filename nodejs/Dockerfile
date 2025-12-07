FROM node:lts

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Static file copying for nginx to proxy traffic to
#COPY public/ ./public

# Expose port (internal to container network)
EXPOSE 3012

# Start the application
CMD ["node", "server.js"]

