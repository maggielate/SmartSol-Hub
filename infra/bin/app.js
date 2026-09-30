#!/usr/bin/env node
const cdk = require('aws-cdk-lib');
const { SmartSolStack } = require('./lib/smartsol-stack');

const app = new cdk.App();
new SmartSolStack(app, 'SmartSolStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'af-south-1',
  },
});
