FROM python:3.10-slim

WORKDIR /app

# 安装必要的系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源代码
COPY . .

# 暴露端口 (FastAPI 默认 8000, Streamlit 默认 8501)
EXPOSE 8000
EXPOSE 8501

# 启动命令，默认运行 FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
