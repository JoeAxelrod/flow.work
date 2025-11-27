import { Inject, Injectable, OnModuleDestroy, Logger, forwardRef } from '@nestjs/common';
import { Pool } from 'pg';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { EngineService } from './engine.service';

@Injectable()
export class KafkaService implements OnModuleDestroy {
  private readonly log = new Logger(KafkaService.name);
  private kafka!: Kafka;
  private producer!: Producer;
  private consumer!: Consumer;
  private admin!: ReturnType<Kafka['admin']>;
  private readonly TOPIC = 'activity-execution';

  constructor(
    @Inject('PG') private readonly db: Pool,
    @Inject(forwardRef(() => EngineService)) private readonly engineService: EngineService
  ) {}

  async init() {
    const kafkaBrokers = process.env.KAFKA_BROKERS || 'localhost:9092';
    this.log.log(`Connecting to Kafka at ${kafkaBrokers}`);

    this.kafka = new Kafka({
      clientId: 'workflow-api',
      brokers: kafkaBrokers.split(','),
      retry: {
        retries: 8,
        initialRetryTime: 100,
      },
    });

    // Create admin client to manage topics
    this.admin = this.kafka.admin();
    await this.admin.connect();
    this.log.log('Kafka admin client connected');

    // Ensure topic exists
    try {
      const topics = await this.admin.listTopics();
      if (!topics.includes(this.TOPIC)) {
        this.log.log(`Creating topic: ${this.TOPIC}`);
        await this.admin.createTopics({
          topics: [{
            topic: this.TOPIC,
            numPartitions: 1,
            replicationFactor: 1,
          }],
        });
        this.log.log(`Topic ${this.TOPIC} created`);
      } else {
        this.log.log(`Topic ${this.TOPIC} already exists`);
      }
    } catch (error) {
      this.log.warn(`Failed to create/check topic: ${String(error)}. Topic may be auto-created on first message.`);
    }

    // Create producer
    this.producer = this.kafka.producer();
    await this.producer.connect();
    this.log.log('Kafka producer connected');

    // Create consumer
    this.consumer = this.kafka.consumer({ 
      groupId: 'activity-execution-group',
      retry: {
        retries: 8,
        initialRetryTime: 100,
      },
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
    
    // Handle consumer events
    this.consumer.on(this.consumer.events.GROUP_JOIN, ({ payload }) => {
      this.log.log(`Consumer joined group: ${payload.groupId}, memberId: ${payload.memberId}`);
    });
    
    this.consumer.on(this.consumer.events.CRASH, ({ payload }) => {
      this.log.error(`Consumer crashed: ${payload.error.message}`, payload.error.stack);
    });
    
    this.consumer.on(this.consumer.events.DISCONNECT, () => {
      this.log.warn('Consumer disconnected');
    });
    
    await this.consumer.connect();
    this.log.log('Kafka consumer connected');

    // Subscribe to topic with retry logic
    try {
      await this.consumer.subscribe({ topic: this.TOPIC, fromBeginning: false });
      this.log.log(`Subscribed to topic: ${this.TOPIC}`);
    } catch (error: any) {
      // If topic doesn't exist, wait a bit and retry
      if (error.type === 'UNKNOWN_TOPIC_OR_PARTITION') {
        this.log.warn(`Topic ${this.TOPIC} not found, waiting for auto-creation...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.consumer.subscribe({ topic: this.TOPIC, fromBeginning: false });
        this.log.log(`Subscribed to topic: ${this.TOPIC} after retry`);
      } else {
        throw error;
      }
    }

    // Start consuming messages
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        try {
          const value = message.value?.toString();
          if (!value) {
            this.log.warn('Received empty message');
            return;
          }

          const payload = JSON.parse(value);
          this.log.log(`Processing activity execution: ${JSON.stringify(payload)}`);

          await this.engineService.executeActivity(
            payload.instanceId,
            payload.nodeId,
            payload.input || {}
          );

          this.log.log(`Activity executed successfully: instanceId=${payload.instanceId}, nodeId=${payload.nodeId}`);
        } catch (error) {
          this.log.error(`Failed to process activity execution: ${String(error)}`, error instanceof Error ? error.stack : undefined);
          // In a production system, you might want to send to a dead letter queue
        }
      },
    });

    this.log.log('Kafka initialization complete');
  }

  async onModuleDestroy() {
    try {
      await this.consumer?.disconnect();
      await this.producer?.disconnect();
      await this.admin?.disconnect();
    } catch (error) {
      this.log.error(`Error disconnecting Kafka: ${String(error)}`);
    }
  }

  async publishActivity(instanceId: string, nodeId: string, input: any = {}) {
    const message = {
      instanceId,
      nodeId,
      input,
      timestamp: Date.now(),
    };

    try {
      await this.producer.send({
        topic: this.TOPIC,
        messages: [
          {
            key: instanceId,
            value: JSON.stringify(message),
          },
        ],
      });
      this.log.log(`Published activity to Kafka: instanceId=${instanceId}, nodeId=${nodeId}`);
    } catch (error) {
      this.log.error(`Failed to publish activity to Kafka: ${String(error)}`);
      throw error;
    }
  }
}

