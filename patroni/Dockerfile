FROM postgres:18

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip curl \
  && rm -rf /var/lib/apt/lists/*

# Allow pip to install into the system Python inside the container
ENV PIP_BREAK_SYSTEM_PACKAGES=1

# Patroni + etcd v3 support (etcd3) + psycopg3 driver
RUN pip3 install --no-cache-dir "patroni[psycopg3,etcd3]"

USER postgres
ENTRYPOINT ["patroni"]
CMD ["/config/patroni.yml"]

