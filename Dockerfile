# 使用官方nginx镜像作为基础镜像
FROM nginx:alpine

# 维护者信息
LABEL maintainer="hanzi-study"

# 删除nginx默认页面
RUN rm -rf /usr/share/nginx/html/*

# 复制项目文件到nginx默认目录
COPY . /usr/share/nginx/html/

# 复制nginx配置文件（可选）
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露80端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"] 