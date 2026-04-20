FROM python:3.10-slim

WORKDIR /app

# 安装必要的系统依赖
# 修复点1: 将错误的 'non-free-software' 改为正确的 'non-free-firmware'
# 修复点2: 使用 https 而不是 http，更稳定且防止劫持
# 修复点3: 添加了 Acquire::ForceIPv4 配置，防止 IPv6 超时
RUN echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm main contrib non-free non-free-firmware" > /etc/apt/sources.list && \
    echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm-updates main contrib non-free non-free-firmware" >> /etc/apt/sources.list && \
    echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian-security/ bookworm-security main contrib non-free non-free-firmware" >> /etc/apt/sources.list && \
    # 强制 apt 使用 IPv4，解决国内 IPv6 线路不通导致的卡顿
    echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装 (使用清华大学 pip 镜像源)
# 修复点4: 建议加上 --no-cache-dir 避免缓存堆积，或者你代码里已经有了
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制源代码
COPY . .

# 暴露端口 (FastAPI 默认 8000, Streamlit 默认 8501)
EXPOSE 8000
EXPOSE 8501

# 启动命令，默认运行 FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]