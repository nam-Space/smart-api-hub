# 1. Sử dụng Node.js bản 22 (nhẹ và ổn định)
FROM node:22-alpine

# 2. Tạo thư mục làm việc trong container
WORKDIR /app

# 3. Chỉ copy các file package trước để tận dụng Docker Cache
# Giúp các lần build sau cực nhanh nếu bạn không thêm thư viện mới
COPY package*.json ./

# 4. Cài đặt toàn bộ thư viện (bao gồm cả devDependencies để biên dịch TS)
RUN npm install

# 5. Copy toàn bộ mã nguồn vào container
COPY . .

# 6. Biên dịch TypeScript sang JavaScript (lệnh này tạo ra thư mục dist)
RUN npm run build

# 7. Xóa bớt các thư viện devDependencies (như typescript, nodemon) 
# giúp kích thước image nhẹ đi rất nhiều
RUN npm prune --production

# 8. Mở cổng 3000 (cổng mà server của bạn đang chạy)
EXPOSE 3000

# 9. Chạy ứng dụng bằng file JavaScript đã biên dịch
CMD ["npm", "run", "start"]