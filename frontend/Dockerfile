# Build stage
FROM node:20-slim AS build

WORKDIR /app

# 复制依赖文件并安装
COPY package*.json ./
RUN npm install

# 复制源代码并构建
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# 复制构建产物到 nginx
COPY --from=build /app/dist /usr/share/nginx/html

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
