FROM python:3.11-slim

RUN useradd -m -u 1000 user
USER user

ENV HOME=/home/user
ENV PATH="$HOME/.local/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV UPLOAD_DIR=/data/uploads

WORKDIR $HOME/app

COPY --chown=user backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY --chown=user backend/ .

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]