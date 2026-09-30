const cdk = require('aws-cdk-lib');
const ec2 = require('aws-cdk-lib/aws-ec2');
const ecs = require('aws-cdk-lib/aws-ecs');
const rds = require('aws-cdk-lib/aws-rds');
const iot = require('aws-cdk-lib/aws-iot');
const location = require('aws-cdk-lib/aws-location');
const elasticache = require('aws-cdk-lib/aws-elasticache');
const lambda = require('aws-cdk-lib/aws-lambda');
const s3 = require('aws-cdk-lib/aws-s3');
const elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
const { Construct } = require('constructs');

class SmartSolStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'SmartSolVpc', { maxAzs: 2, natGateways: 1 });

    // RDS PostgreSQL
    const db = new rds.DatabaseInstance(this, 'SmartSolDB', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      databaseName: 'smartsol',
      backupRetention: cdk.Duration.days(7),
      deletionProtection: true,
    });

    // ElastiCache Redis subnet group
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnet', {
      description: 'SmartSol Redis subnet',
      subnetIds: vpc.privateSubnets.map(s => s.subnetId),
    });

    const redis = new elasticache.CfnCacheCluster(this, 'SmartSolRedis', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      cacheSubnetGroupName: redisSubnetGroup.ref,
    });

    // ECS Fargate Cluster
    const cluster = new ecs.Cluster(this, 'SmartSolCluster', { vpc });

    const taskDef = new ecs.FargateTaskDefinition(this, 'ApiTask', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    taskDef.addContainer('ApiContainer', {
      image: ecs.ContainerImage.fromAsset('../backend'),
      portMappings: [{ containerPort: 3000 }],
      environment: {
        NODE_ENV: 'production',
        DB_HOST: db.instanceEndpoint.hostname,
        REDIS_URL: `redis://${redis.attrRedisEndpointAddress}:6379`,
        AWS_REGION: this.region,
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'smartsol-api' }),
    });

    const apiService = new ecs.FargateService(this, 'ApiService', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 2,
    });

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'SmartSolALB', {
      vpc,
      internetFacing: true,
    });

    const listener = alb.addListener('Listener', { port: 80 });
    listener.addTargets('ApiTarget', {
      port: 3000,
      targets: [apiService],
      healthCheck: { path: '/api/health' },
    });

    // AI Prediction Lambda (Python)
    const aiLambda = new lambda.Function(this, 'AiPredict', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'app.lambda_handler',
      code: lambda.Code.fromAsset('../ai'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // AWS IoT Core Thing Type
    new iot.CfnThingType(this, 'SolarUnitType', {
      thingTypeName: 'SmartSolUnit',
    });

    // IoT Topic Rule - forward telemetry to AI Lambda
    new iot.CfnTopicRule(this, 'TelemetryRule', {
      topicRulePayload: {
        sql: "SELECT *, topic(2) as unit_id FROM 'smartsol/+/telemetry'",
        actions: [{ lambda: { functionArn: aiLambda.functionArn } }],
        ruleDisabled: false,
      },
    });

    // AWS Location Service Tracker for GPS
    new location.CfnTracker(this, 'UnitTracker', {
      trackerName: 'SmartSolTracker',
      positionFiltering: 'TimeBased',
    });

    // S3 Bucket for OTA firmware updates
    new s3.Bucket(this, 'FirmwareBucket', {
      bucketName: `smartsol-firmware-${this.account}`,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', { value: `http://${alb.loadBalancerDnsName}` });
    new cdk.CfnOutput(this, 'DbEndpoint', { value: db.instanceEndpoint.hostname });
    new cdk.CfnOutput(this, 'AiLambdaArn', { value: aiLambda.functionArn });
  }
}

module.exports = { SmartSolStack };
