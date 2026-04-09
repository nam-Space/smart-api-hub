# Stage 1: Builder - Dành cho việc cài đặt và biên dịch mã nguồn
FROM node:22-alpine AS builder
 
# 1. Thiết lập thư mục làm việc trong container
WORKDIR /app
 
# 2. Copy các file cấu hình package
COPY package*.json ./
COPY tsconfig.json ./
 
# 3. Cài đặt toàn bộ thư viện
RUN npm i
 
 
COPY . .
 
# 5. Compile TypeScript sang JavaScript (thư mục dist)
RUN npm run build
 
 
# Stage 2: Production - Môi trường chạy thực tế siêu nhẹ
FROM node:22-alpine AS production
 
WORKDIR /app
 
# 1. Định nghĩa môi trường
ENV NODE_ENV=development
ENV DB_HOST=localhost
ENV DB_PORT=5432
ENV DB_NAME=postgres_db
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres
ENV JWT_SECRET=this_is_my_scret
ENV TOKEN_EXPIRATION=1d
 
# 2. Copy package.json sang để cài thư viện
COPY package*.json ./
 
# 3. Chỉ cài đặt các thư viện phục vụ cho Production (bỏ qua devDependencies)
# Chú ý: Từ npm v8, param --only=production có thể dùng --omit=dev
RUN npm i --omit=dev
 
# 4. Chỉ Copy thư mục đã build (dist) từ Stage 1 sang Stage 2
COPY --from=builder /app/dist ./dist
COPY db.json .
 
# Bảo mật: Dùng user "node" có sẵn thay vì "root" (quyền cao nhất) để chạy app
USER node
 
# 5. Expose port (Thông báo port ứng dụng sẽ lắng nghe)
EXPOSE 3000
 
# 5. Khởi chạy ứng dụng bằng Node.js tiêu chuẩn
CMD ["npm", "run", "start"]