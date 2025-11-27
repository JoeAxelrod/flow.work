# Monitoring Stack

This project includes a comprehensive monitoring setup using Prometheus and Grafana.

## Services

### Prometheus
- **Port**: `9090`
- **URL**: http://localhost:9090
- **Purpose**: Metrics collection and storage
- **Retention**: 30 days

### Grafana
- **Port**: `3002`
- **URL**: http://localhost:3002
- **Default Credentials**: 
  - Username: `admin`
  - Password: `admin`
- **Purpose**: Metrics visualization and dashboards

### cAdvisor
- **Port**: `8080`
- **URL**: http://localhost:8080
- **Purpose**: Container metrics (CPU, memory, network, disk)

### PostgreSQL Exporter
- **Port**: `9187`
- **URL**: http://localhost:9187/metrics
- **Purpose**: PostgreSQL database metrics

### RabbitMQ Metrics
- **Port**: `15672` (Management UI)
- **Metrics Endpoint**: http://localhost:15672/api/metrics
- **Purpose**: RabbitMQ queue and message metrics

## Getting Started

1. **Start the monitoring stack**:
   ```bash
   docker compose up -d prometheus grafana cadvisor postgres-exporter
   ```

2. **Access Grafana**:
   - Navigate to http://localhost:3002
   - Login with `admin`/`admin`
   - Dashboards are automatically provisioned

3. **View Prometheus**:
   - Navigate to http://localhost:9090
   - Query metrics using PromQL

## Pre-configured Dashboards

The following dashboards are automatically provisioned:

1. **PostgreSQL Database Metrics**
   - Database connections
   - Database size
   - Transactions per second
   - Query performance (tuples fetched/inserted/updated/deleted)
   - Database locks

2. **RabbitMQ Metrics**
   - Message rates (published/delivered)
   - Queue message counts
   - Active connections and channels
   - Memory usage

3. **Container Metrics**
   - CPU usage by container
   - Memory usage by container
   - Network I/O
   - Disk I/O

## Adding Application Metrics

To add metrics from your NestJS API service:

1. Install Prometheus client library:
   ```bash
   npm install @willsoto/nestjs-prometheus prom-client
   ```

2. Add metrics endpoint to your API (e.g., `/metrics`)

3. Update `monitoring/prometheus/prometheus.yml`:
   ```yaml
   - job_name: 'api'
     static_configs:
       - targets: ['api:3001']
         labels:
           service: 'api'
     metrics_path: '/metrics'
     scrape_interval: 10s
   ```

4. Restart Prometheus:
   ```bash
   docker compose restart prometheus
   ```

## Useful Prometheus Queries

- **Total requests per second**: `rate(http_requests_total[5m])`
- **Average response time**: `rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])`
- **Error rate**: `rate(http_requests_total{status=~"5.."}[5m])`
- **Database connections**: `pg_stat_database_numbackends{datname="workflow"}`
- **Queue depth**: `rabbitmq_queue_messages`

## Troubleshooting

### Prometheus not scraping targets
- Check Prometheus targets: http://localhost:9090/targets
- Verify network connectivity between containers
- Check Prometheus logs: `docker compose logs prometheus`

### Grafana dashboards not showing data
- Verify Prometheus datasource is configured correctly
- Check that metrics are being collected (view in Prometheus)
- Ensure dashboard queries match available metrics

### cAdvisor not showing container metrics
- Verify cAdvisor has proper permissions (privileged mode)
- Check cAdvisor logs: `docker compose logs cadvisor`
- Ensure containers are running: `docker compose ps`

## Data Persistence

- Prometheus data is stored in `prometheus_data` volume (30-day retention)
- Grafana dashboards and settings are stored in `grafana_data` volume
- To reset monitoring data: `docker compose down -v` (removes all volumes)

