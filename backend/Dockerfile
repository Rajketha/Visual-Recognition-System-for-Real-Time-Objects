FROM python:3.10-slim

# Prevent writing pyc files and buffer output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app



# Install python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Force-replace standard opencv with headless version to fix libGL dependencies
RUN pip uninstall -y opencv-python opencv-python-headless opencv-contrib-python opencv-contrib-python-headless \
    && pip install --no-cache-dir opencv-python-headless==4.8.1.78

# Copy backend files
COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
